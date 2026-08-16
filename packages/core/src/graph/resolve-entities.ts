import { and, eq, sql } from "drizzle-orm";
import { embedTexts } from "../ai/embed";
import { createServiceDbClient } from "../db/client";
import { entities, memoryEntities } from "../db/schema";
import {
  mapExtractionKindToDb,
  normName,
  type DbEntityKind,
  type ExtractedEntityInput,
} from "./normalize";

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

async function findByTrigram(
  userId: string,
  kind: DbEntityKind,
  normalized: string,
): Promise<{ id: string; name: string } | null> {
  const db = createServiceDbClient();
  const rows = await db.execute<{ id: string; name: string; sim: number }>(sql`
    select id, name, similarity(norm_name, ${normalized})::float as sim
    from entities
    where user_id = ${userId}::uuid
      and kind = ${kind}::entity_kind
      and similarity(norm_name, ${normalized}) > 0.85
    order by sim desc
    limit 1
  `);
  const row = (rows as unknown as Array<{ id: string; name: string }>)[0];
  return row ?? null;
}

async function findByEmbedding(
  userId: string,
  kind: DbEntityKind,
  embedding: number[],
): Promise<{ id: string; name: string } | null> {
  const db = createServiceDbClient();
  const rows = await db.execute<{ id: string; name: string; dist: number }>(sql`
    select id, name, (embedding <=> ${toVectorLiteral(embedding)}::vector(1536))::float as dist
    from entities
    where user_id = ${userId}::uuid
      and kind = ${kind}::entity_kind
      and embedding is not null
    order by embedding <=> ${toVectorLiteral(embedding)}::vector(1536)
    limit 1
  `);
  const row = (rows as unknown as Array<{ id: string; name: string; dist: number }>)[0];
  if (!row) return null;
  // cosine distance: 0 = identical; similarity > 0.9 => distance < 0.1
  if (Number(row.dist) < 0.1) return { id: row.id, name: row.name };
  return null;
}

export async function resolveEntitiesForMemory(input: {
  userId: string;
  memoryId: string;
  entities: ExtractedEntityInput[];
}): Promise<string[]> {
  const db = createServiceDbClient();
  const entityIds: string[] = [];

  // Clear prior links for idempotent re-runs
  await db
    .delete(memoryEntities)
    .where(eq(memoryEntities.memoryId, input.memoryId));

  for (const raw of input.entities) {
    const name = raw.name?.trim();
    if (!name) continue;
    const kind = mapExtractionKindToDb(raw.kind);
    const normalized = normName(name);
    if (!normalized) continue;
    const salience = Math.min(1, Math.max(0, Number(raw.salience) || 0.5));

    let entityId: string | undefined;

    const exact = await db
      .select({ id: entities.id })
      .from(entities)
      .where(
        and(
          eq(entities.userId, input.userId),
          eq(entities.kind, kind),
          eq(entities.normName, normalized),
        ),
      )
      .limit(1);
    if (exact[0]) {
      entityId = exact[0].id;
    }

    if (!entityId) {
      const trigram = await findByTrigram(input.userId, kind, normalized);
      if (trigram) entityId = trigram.id;
    }

    let embedding: number[] | undefined;
    if (!entityId) {
      [embedding] = await embedTexts([name], "RETRIEVAL_DOCUMENT");
      if (embedding) {
        const byEmbed = await findByEmbedding(input.userId, kind, embedding);
        if (byEmbed) entityId = byEmbed.id;
      }
    }

    if (!entityId) {
      if (!embedding) {
        [embedding] = await embedTexts([name], "RETRIEVAL_DOCUMENT");
      }
      const inserted = await db
        .insert(entities)
        .values({
          userId: input.userId,
          kind,
          name,
          normName: normalized,
          embedding: embedding ?? null,
          mentionCount: 0,
        })
        .onConflictDoNothing()
        .returning({ id: entities.id });
      if (inserted[0]) {
        entityId = inserted[0].id;
      } else {
        const again = await db
          .select({ id: entities.id })
          .from(entities)
          .where(
            and(
              eq(entities.userId, input.userId),
              eq(entities.kind, kind),
              eq(entities.normName, normalized),
            ),
          )
          .limit(1);
        entityId = again[0]?.id;
      }
    }

    if (!entityId) continue;

    await db
      .insert(memoryEntities)
      .values({
        memoryId: input.memoryId,
        entityId,
        role: "mentions",
        salience,
      })
      .onConflictDoNothing();

    await db
      .update(entities)
      .set({
        mentionCount: sql`(
          select count(*)::int from memory_entities where entity_id = ${entityId}::uuid
        )`,
      })
      .where(eq(entities.id, entityId));

    entityIds.push(entityId);
  }

  return entityIds;
}
