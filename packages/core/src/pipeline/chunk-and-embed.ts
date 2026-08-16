import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { embedTexts } from "../ai/embed";
import { EMBED_MODEL_ID } from "../ai/models";
import { createServiceDbClient } from "../db/client";
import { memoryChunks, memories } from "../db/schema";
import { chunkText } from "./chunk";

export function buildObjectEmbedText(input: {
  title: string;
  tldr?: string | null;
  category?: string | null;
  tags?: string[] | null;
  keyPoints?: string[] | null;
}): string {
  const parts = [
    input.title,
    input.tldr,
    input.category,
    (input.tags ?? []).join(", "),
    (input.keyPoints ?? []).join("\n"),
  ];
  return parts.filter((part) => part && String(part).trim()).join("\n");
}

function contentHash(parts: string[]): string {
  return createHash("sha256").update(parts.join("\0")).digest("hex");
}

export async function chunkAndEmbed(memoryId: string, userId: string): Promise<void> {
  const db = createServiceDbClient();
  const rows = await db
    .select({
      id: memories.id,
      userId: memories.userId,
      title: memories.title,
      tldr: memories.tldr,
      summary: memories.summary,
      category: memories.category,
      tags: memories.tags,
      keyPoints: memories.keyPoints,
      rawText: memories.rawText,
      embeddingModel: memories.embeddingModel,
      aiMeta: memories.aiMeta,
    })
    .from(memories)
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)))
    .limit(1);

  const memory = rows[0];
  if (!memory) {
    throw new Error(`Memory ${memoryId} not found for embed`);
  }

  const objectText = buildObjectEmbedText(memory);
  const chunkSource = [memory.summary, memory.rawText].filter(Boolean).join("\n\n") || objectText;
  const chunks = chunkText(chunkSource, memory.title);
  const hash = contentHash([
    objectText,
    ...chunks.map((chunk) => `${chunk.heading ?? ""}\n${chunk.content}`),
  ]);

  const meta = (memory.aiMeta ?? {}) as Record<string, unknown>;
  if (
    memory.embeddingModel === EMBED_MODEL_ID &&
    meta.embedContentHash === hash
  ) {
    return;
  }

  const textsToEmbed = [objectText, ...chunks.map((chunk) => chunk.content)];
  const vectors = await embedTexts(textsToEmbed, "RETRIEVAL_DOCUMENT");
  const objectEmbedding = vectors[0];
  if (!objectEmbedding) {
    throw new Error("Object embedding missing");
  }

  await db
    .update(memories)
    .set({
      embedding: objectEmbedding,
      embeddingModel: EMBED_MODEL_ID,
      aiMeta: {
        ...meta,
        embedContentHash: hash,
        embedModel: EMBED_MODEL_ID,
      },
      updatedAt: new Date(),
    })
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)));

  await db
    .delete(memoryChunks)
    .where(
      and(eq(memoryChunks.memoryId, memoryId), eq(memoryChunks.userId, userId)),
    );

  if (chunks.length) {
    await db.insert(memoryChunks).values(
      chunks.map((chunk, index) => ({
        memoryId,
        userId,
        ordinal: chunk.ordinal,
        heading: chunk.heading,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        embedding: vectors[index + 1] ?? objectEmbedding,
      })),
    );
  }
}

/** Embed all memories for a user that are missing embeddings (or force all). */
export async function backfillEmbeddings(options?: {
  userId?: string;
  limit?: number;
  force?: boolean;
}): Promise<{ processed: number; errors: string[] }> {
  const db = createServiceDbClient();
  const limit = options?.limit ?? 50;
  const all = await db
    .select({
      id: memories.id,
      userId: memories.userId,
      embeddingModel: memories.embeddingModel,
    })
    .from(memories)
    .limit(500);

  const targets = all
    .filter((row) => (options?.userId ? row.userId === options.userId : true))
    .filter((row) =>
      options?.force ? true : row.embeddingModel !== EMBED_MODEL_ID,
    )
    .slice(0, limit);

  const errors: string[] = [];
  let processed = 0;
  for (const row of targets) {
    try {
      await chunkAndEmbed(row.id, row.userId);
      processed += 1;
    } catch (error) {
      errors.push(
        `${row.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return { processed, errors };
}
