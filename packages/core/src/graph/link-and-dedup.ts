import { and, eq } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { models } from "../ai/models";
import { createServiceDbClient } from "../db/client";
import { memories } from "../db/schema";
import { ENTITY_KINDS } from "../schemas/extraction";
import { detectAndLinkDuplicates } from "./dedup";
import { buildRelationshipEdges } from "./edges";
import type { ExtractedEntityInput } from "./normalize";
import { resolveEntitiesForMemory } from "./resolve-entities";

const LightEntitiesSchema = z.object({
  entities: z
    .array(
      z.object({
        name: z.string(),
        kind: z.enum(ENTITY_KINDS),
        salience: z.number().min(0).max(1),
      }),
    )
    .max(12),
});

function entitiesFromAiMeta(aiMeta: unknown): ExtractedEntityInput[] | null {
  if (!aiMeta || typeof aiMeta !== "object") return null;
  const entities = (aiMeta as { entities?: unknown }).entities;
  if (!Array.isArray(entities) || !entities.length) return null;
  return entities
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (typeof record.name !== "string") return null;
      return {
        name: record.name,
        kind: typeof record.kind === "string" ? record.kind : "other",
        salience: typeof record.salience === "number" ? record.salience : 0.5,
      };
    })
    .filter((item): item is ExtractedEntityInput => Boolean(item));
}

async function deriveEntities(memory: {
  title: string;
  tldr: string | null;
  summary: string | null;
  tags: string[];
  keyPoints: string[];
  category: string;
}): Promise<ExtractedEntityInput[]> {
  const { object } = await generateObject({
    model: models.fast,
    schema: LightEntitiesSchema,
    system:
      "Extract named entities (products, people, places, companies, technologies, topics) from this saved memory summary. Prefer high-salience concrete names.",
    prompt: [
      `Title: ${memory.title}`,
      `Category: ${memory.category}`,
      `TLDR: ${memory.tldr ?? ""}`,
      `Tags: ${(memory.tags ?? []).join(", ")}`,
      `Key points: ${(memory.keyPoints ?? []).join("; ")}`,
      `Summary: ${(memory.summary ?? "").slice(0, 800)}`,
    ].join("\n"),
    maxRetries: 1,
  });
  return object.entities;
}

export async function linkAndDedup(
  memoryId: string,
  userId: string,
): Promise<{ entityIds: string[]; duplicateOf: string | null }> {
  const db = createServiceDbClient();
  const [memory] = await db
    .select({
      id: memories.id,
      title: memories.title,
      tldr: memories.tldr,
      summary: memories.summary,
      tags: memories.tags,
      keyPoints: memories.keyPoints,
      category: memories.category,
      aiMeta: memories.aiMeta,
    })
    .from(memories)
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)))
    .limit(1);

  if (!memory) {
    throw new Error(`Memory ${memoryId} not found for link-and-dedup`);
  }

  let extracted = entitiesFromAiMeta(memory.aiMeta);
  if (!extracted?.length) {
    extracted = await deriveEntities(memory);
    const meta = (memory.aiMeta ?? {}) as Record<string, unknown>;
    await db
      .update(memories)
      .set({
        aiMeta: { ...meta, entities: extracted },
        updatedAt: new Date(),
      })
      .where(eq(memories.id, memoryId));
  }

  const entityIds = await resolveEntitiesForMemory({
    userId,
    memoryId,
    entities: extracted,
  });

  const { duplicateOf } = await detectAndLinkDuplicates({ userId, memoryId });
  if (!duplicateOf) {
    await buildRelationshipEdges({ userId, memoryId });
  }

  return { entityIds, duplicateOf };
}
