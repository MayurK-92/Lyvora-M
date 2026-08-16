import { and, desc, eq, or, sql } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { entities, memories, memoryEdges, memoryEntities } from "../db/schema";

export interface EntityListItem {
  id: string;
  name: string;
  kind: string;
  mentionCount: number;
}

export interface RelatedMemoryCard {
  id: string;
  title: string;
  tldr: string | null;
  category: string;
  tags: string[];
  sourceUrl: string | null;
  siteName: string | null;
  savedAt: Date;
  relation: string;
  reason: string | null;
  score: number;
}

export async function listEntities(
  userId: string,
  limit = 80,
): Promise<EntityListItem[]> {
  const db = createServiceDbClient();
  const rows = await db
    .select({
      id: entities.id,
      name: entities.name,
      kind: entities.kind,
      mentionCount: entities.mentionCount,
    })
    .from(entities)
    .where(eq(entities.userId, userId))
    .orderBy(desc(entities.mentionCount), desc(entities.createdAt))
    .limit(limit);
  return rows;
}

export interface GraphNode extends EntityListItem {
  /** Category of the memories this entity appears in most often — drives node colour. */
  category: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  /** Number of memories both entities appear in. */
  weight: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Entity co-occurrence graph: two entities are connected when they are
 * extracted from the same memory, weighted by how often that happens.
 */
export async function getKnowledgeGraph(
  userId: string,
  limit = 60,
): Promise<KnowledgeGraph> {
  const db = createServiceDbClient();

  const top = await db
    .select({
      id: entities.id,
      name: entities.name,
      kind: entities.kind,
      mentionCount: entities.mentionCount,
    })
    .from(entities)
    .where(eq(entities.userId, userId))
    .orderBy(desc(entities.mentionCount), desc(entities.createdAt))
    .limit(limit);

  if (!top.length) return { nodes: [], edges: [] };

  const idList = sql.join(
    top.map((row) => sql`${row.id}::uuid`),
    sql`, `,
  );

  const categoryRows = await db.execute<{
    entity_id: string;
    category: string;
    hits: number;
  }>(sql`
    select me.entity_id, m.category, count(*)::int as hits
    from memory_entities me
    join memories m on m.id = me.memory_id
    where m.user_id = ${userId}::uuid
      and not m.is_archived
      and m.duplicate_of is null
      and me.entity_id in (${idList})
    group by 1, 2
  `);

  const dominant = new Map<string, { category: string; hits: number }>();
  for (const row of categoryRows as unknown as Array<{
    entity_id: string;
    category: string;
    hits: number;
  }>) {
    const current = dominant.get(row.entity_id);
    if (!current || Number(row.hits) > current.hits) {
      dominant.set(row.entity_id, {
        category: row.category,
        hits: Number(row.hits),
      });
    }
  }

  const edgeRows = await db.execute<{
    source: string;
    target: string;
    weight: number;
  }>(sql`
    select a.entity_id as source, b.entity_id as target, count(*)::int as weight
    from memory_entities a
    join memory_entities b
      on b.memory_id = a.memory_id and a.entity_id < b.entity_id
    join memories m on m.id = a.memory_id
    where m.user_id = ${userId}::uuid
      and not m.is_archived
      and m.duplicate_of is null
      and a.entity_id in (${idList})
      and b.entity_id in (${idList})
    group by 1, 2
    order by weight desc
    limit 400
  `);

  return {
    nodes: top.map((row) => ({
      ...row,
      category: dominant.get(row.id)?.category ?? "Uncategorized",
    })),
    edges: (
      edgeRows as unknown as Array<{
        source: string;
        target: string;
        weight: number;
      }>
    ).map((row) => ({
      source: row.source,
      target: row.target,
      weight: Number(row.weight),
    })),
  };
}

export async function getEntityPage(userId: string, entityId: string) {
  const db = createServiceDbClient();
  const [entity] = await db
    .select()
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.userId, userId)))
    .limit(1);
  if (!entity) return null;

  const linked = await db
    .select({
      id: memories.id,
      title: memories.title,
      tldr: memories.tldr,
      category: memories.category,
      tags: memories.tags,
      contentType: memories.contentType,
      salience: memoryEntities.salience,
      savedAt: memories.savedAt,
    })
    .from(memoryEntities)
    .innerJoin(memories, eq(memories.id, memoryEntities.memoryId))
    .where(
      and(
        eq(memoryEntities.entityId, entityId),
        eq(memories.userId, userId),
        eq(memories.isArchived, false),
        sql`${memories.duplicateOf} is null`,
      ),
    )
    .orderBy(desc(memoryEntities.salience), desc(memories.savedAt));

  return { entity, memories: linked };
}

export async function relatedMemories(
  userId: string,
  memoryId: string,
  limit = 12,
): Promise<RelatedMemoryCard[]> {
  const db = createServiceDbClient();

  const edgeRows = await db
    .select({
      srcId: memoryEdges.srcId,
      dstId: memoryEdges.dstId,
      kind: memoryEdges.kind,
      score: memoryEdges.score,
      reason: memoryEdges.reason,
    })
    .from(memoryEdges)
    .where(
      and(
        eq(memoryEdges.userId, userId),
        or(eq(memoryEdges.srcId, memoryId), eq(memoryEdges.dstId, memoryId)),
      ),
    )
    .orderBy(desc(memoryEdges.score))
    .limit(limit * 2);

  const relatedIds = edgeRows.map((row) =>
    row.srcId === memoryId ? row.dstId : row.srcId,
  );
  if (!relatedIds.length) return [];

  const idList = sql.join(
    relatedIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const cards = await db
    .select({
      id: memories.id,
      title: memories.title,
      tldr: memories.tldr,
      category: memories.category,
      tags: memories.tags,
      sourceUrl: memories.sourceUrl,
      siteName: memories.siteName,
      savedAt: memories.savedAt,
    })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        sql`${memories.id} in (${idList})`,
        eq(memories.isArchived, false),
      ),
    );

  const byId = new Map(cards.map((card) => [card.id, card]));
  const out: RelatedMemoryCard[] = [];
  for (const edge of edgeRows) {
    const otherId = edge.srcId === memoryId ? edge.dstId : edge.srcId;
    const card = byId.get(otherId);
    if (!card) continue;
    if (out.some((item) => item.id === card.id)) continue;
    out.push({
      id: card.id,
      title: card.title,
      tldr: card.tldr,
      category: card.category,
      tags: card.tags ?? [],
      sourceUrl: card.sourceUrl,
      siteName: card.siteName,
      savedAt: card.savedAt,
      relation: edge.kind,
      reason: edge.reason,
      score: edge.score,
    });
    if (out.length >= limit) break;
  }
  return out;
}
