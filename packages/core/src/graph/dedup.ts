import { generateObject } from "ai";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { models } from "../ai/models";
import { createServiceDbClient } from "../db/client";
import { memories, memoryEdges } from "../db/schema";

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

const AdjudicationSchema = z.object({
  verdict: z.enum(["same", "related", "unrelated"]),
  reason: z.string().max(240),
});

async function upsertEdge(input: {
  userId: string;
  srcId: string;
  dstId: string;
  kind: "similar" | "duplicate";
  score: number;
  reason: string;
}) {
  if (input.srcId === input.dstId) return;
  const [a, b] =
    input.srcId < input.dstId
      ? [input.srcId, input.dstId]
      : [input.dstId, input.srcId];
  const db = createServiceDbClient();
  await db
    .insert(memoryEdges)
    .values({
      userId: input.userId,
      srcId: a,
      dstId: b,
      kind: input.kind,
      score: input.score,
      reason: input.reason,
    })
    .onConflictDoNothing();
}

export async function detectAndLinkDuplicates(input: {
  userId: string;
  memoryId: string;
}): Promise<{ duplicateOf: string | null }> {
  const db = createServiceDbClient();
  const [current] = await db
    .select({
      id: memories.id,
      title: memories.title,
      tldr: memories.tldr,
      summary: memories.summary,
      tags: memories.tags,
      keyPoints: memories.keyPoints,
      embedding: memories.embedding,
      duplicateOf: memories.duplicateOf,
    })
    .from(memories)
    .where(eq(memories.id, input.memoryId))
    .limit(1);

  if (!current?.embedding || current.duplicateOf) {
    return { duplicateOf: current?.duplicateOf ?? null };
  }

  const candidates = await db.execute<{
    id: string;
    title: string;
    tldr: string | null;
    summary: string | null;
    tags: string[];
    key_points: string[];
    dist: number;
  }>(sql`
    select
      id, title, tldr, summary, tags, key_points,
      (embedding <=> ${toVectorLiteral(current.embedding)}::vector(1536))::float as dist
    from memories
    where user_id = ${input.userId}::uuid
      and id <> ${input.memoryId}::uuid
      and duplicate_of is null
      and not is_archived
      and embedding is not null
      and (embedding <=> ${toVectorLiteral(current.embedding)}::vector(1536)) < 0.10
    order by embedding <=> ${toVectorLiteral(current.embedding)}::vector(1536)
    limit 5
  `);

  const rows = candidates as unknown as Array<{
    id: string;
    title: string;
    tldr: string | null;
    summary: string | null;
    tags: string[];
    key_points: string[];
    dist: number;
  }>;

  let duplicateOf: string | null = null;

  for (const candidate of rows) {
    const similarity = 1 - Number(candidate.dist);
    const { object } = await generateObject({
      model: models.fast,
      schema: AdjudicationSchema,
      system:
        "You adjudicate whether two saved memories are the same thing, merely related, or unrelated. Same = near-duplicate content the user would want merged.",
      prompt: `Memory A:
Title: ${current.title}
TLDR: ${current.tldr ?? ""}
Summary: ${(current.summary ?? "").slice(0, 600)}

Memory B:
Title: ${candidate.title}
TLDR: ${candidate.tldr ?? ""}
Summary: ${(candidate.summary ?? "").slice(0, 600)}

Cosine similarity: ${similarity.toFixed(3)}`,
      maxRetries: 1,
    });

    if (object.verdict === "same") {
      duplicateOf = candidate.id;
      const mergedTags = [
        ...new Set([...(candidate.tags ?? []), ...(current.tags ?? [])]),
      ];
      const mergedPoints = [
        ...new Set([
          ...(candidate.key_points ?? []),
          ...(current.keyPoints ?? []),
        ]),
      ].slice(0, 12);

      await db
        .update(memories)
        .set({
          duplicateOf: candidate.id,
          tags: mergedTags,
          keyPoints: mergedPoints,
          updatedAt: new Date(),
        })
        .where(eq(memories.id, input.memoryId));

      await db
        .update(memories)
        .set({
          tags: mergedTags,
          updatedAt: new Date(),
        })
        .where(eq(memories.id, candidate.id));

      await upsertEdge({
        userId: input.userId,
        srcId: input.memoryId,
        dstId: candidate.id,
        kind: "duplicate",
        score: similarity,
        reason: object.reason,
      });
      break;
    }

    if (object.verdict === "related") {
      await upsertEdge({
        userId: input.userId,
        srcId: input.memoryId,
        dstId: candidate.id,
        kind: "similar",
        score: similarity,
        reason: object.reason,
      });
    }
  }

  return { duplicateOf };
}
