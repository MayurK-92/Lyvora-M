import { sql } from "drizzle-orm";
import { embedQuery } from "../ai/embed";
import { createServiceDbClient } from "../db/client";

export interface ChunkHit {
  chunkId: string;
  memoryId: string;
  title: string;
  heading: string | null;
  content: string;
  score: number;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/** Chunk-level retrieval for verbatim detail (M4 chat tool). */
export async function searchChunks(
  userId: string,
  query: string,
  limit = 8,
): Promise<ChunkHit[]> {
  const q = query.trim();
  if (!q) return [];

  const embedding = await embedQuery(q);
  const db = createServiceDbClient();

  const rows = await db.execute<{
    chunk_id: string;
    memory_id: string;
    title: string;
    heading: string | null;
    content: string;
    score: number;
  }>(sql`
    with vec as (
      select
        c.id as chunk_id,
        c.memory_id,
        c.heading,
        c.content,
        (1 - (c.embedding <=> ${toVectorLiteral(embedding)}::vector(1536)))::float as score
      from memory_chunks c
      where c.user_id = ${userId}::uuid
        and c.embedding is not null
      order by c.embedding <=> ${toVectorLiteral(embedding)}::vector(1536)
      limit ${limit * 3}
    ),
    fts as (
      select
        c.id as chunk_id,
        c.memory_id,
        c.heading,
        c.content,
        ts_rank_cd(c.fts, websearch_to_tsquery('english', ${q}))::float as score
      from memory_chunks c
      where c.user_id = ${userId}::uuid
        and c.fts @@ websearch_to_tsquery('english', ${q})
      order by score desc
      limit ${limit * 3}
    ),
    fused as (
      select chunk_id, memory_id, heading, content, max(score) as score
      from (
        select * from vec
        union all
        select * from fts
      ) u
      group by chunk_id, memory_id, heading, content
    )
    select
      f.chunk_id,
      f.memory_id,
      m.title,
      f.heading,
      left(f.content, 1200) as content,
      f.score
    from fused f
    join memories m on m.id = f.memory_id
    where m.user_id = ${userId}::uuid
      and not m.is_archived
      and m.duplicate_of is null
    order by f.score desc
    limit ${limit}
  `);

  return (
    rows as unknown as Array<{
      chunk_id: string;
      memory_id: string;
      title: string;
      heading: string | null;
      content: string;
      score: number;
    }>
  ).map((row) => ({
    chunkId: row.chunk_id,
    memoryId: row.memory_id,
    title: row.title,
    heading: row.heading,
    content: row.content,
    score: Number(row.score),
  }));
}
