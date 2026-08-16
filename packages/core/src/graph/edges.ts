import { and, eq, sql } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { memoryEdges } from "../db/schema";

async function upsertEdge(input: {
  userId: string;
  srcId: string;
  dstId: string;
  kind: "similar" | "about_same";
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

/** about_same via shared high-salience entities; similar via cosine 0.75–0.90. */
export async function buildRelationshipEdges(input: {
  userId: string;
  memoryId: string;
}): Promise<void> {
  const db = createServiceDbClient();

  // Shared high-salience entities
  const shared = await db.execute<{
    other_id: string;
    entity_name: string;
    salience: number;
  }>(sql`
    select
      me2.memory_id as other_id,
      e.name as entity_name,
      greatest(me1.salience, me2.salience)::float as salience
    from memory_entities me1
    join memory_entities me2
      on me1.entity_id = me2.entity_id
      and me2.memory_id <> me1.memory_id
    join entities e on e.id = me1.entity_id
    join memories m on m.id = me2.memory_id
    where me1.memory_id = ${input.memoryId}::uuid
      and e.user_id = ${input.userId}::uuid
      and me1.salience >= 0.6
      and me2.salience >= 0.6
      and m.duplicate_of is null
      and not m.is_archived
    order by salience desc
    limit 20
  `);

  for (const row of shared as unknown as Array<{
    other_id: string;
    entity_name: string;
    salience: number;
  }>) {
    await upsertEdge({
      userId: input.userId,
      srcId: input.memoryId,
      dstId: row.other_id,
      kind: "about_same",
      score: Number(row.salience),
      reason: `Both mention ${row.entity_name}`,
    });
  }

  // Cosine band for similar (skip if already linked more strongly)
  const similar = await db.execute<{
    id: string;
    dist: number;
  }>(sql`
    select m.id,
           (m.embedding <=> cur.embedding)::float as dist
    from memories cur
    join memories m
      on m.user_id = cur.user_id
      and m.id <> cur.id
      and m.duplicate_of is null
      and not m.is_archived
      and m.embedding is not null
    where cur.id = ${input.memoryId}::uuid
      and cur.user_id = ${input.userId}::uuid
      and cur.embedding is not null
      and (m.embedding <=> cur.embedding) between 0.10 and 0.25
    order by m.embedding <=> cur.embedding
    limit 10
  `);

  for (const row of similar as unknown as Array<{ id: string; dist: number }>) {
    const existing = await db
      .select({ id: memoryEdges.id })
      .from(memoryEdges)
      .where(
        and(
          eq(memoryEdges.userId, input.userId),
          sql`(
            (${memoryEdges.srcId} = ${input.memoryId}::uuid and ${memoryEdges.dstId} = ${row.id}::uuid)
            or (${memoryEdges.srcId} = ${row.id}::uuid and ${memoryEdges.dstId} = ${input.memoryId}::uuid)
          )`,
          sql`${memoryEdges.kind} in ('about_same'::edge_kind, 'duplicate'::edge_kind, 'similar'::edge_kind)`,
        ),
      )
      .limit(1);
    if (existing[0]) continue;

    await upsertEdge({
      userId: input.userId,
      srcId: input.memoryId,
      dstId: row.id,
      kind: "similar",
      score: 1 - Number(row.dist),
      reason: "Semantically similar content",
    });
  }
}
