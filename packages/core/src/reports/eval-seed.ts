import { sql } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { memories } from "../db/schema";

/** Fake rows inserted by packages/core/scripts/eval-report.ts during M6 testing. */
export function isEvalSeedTitle(title: string | null | undefined): boolean {
  return Boolean(title?.startsWith("M6 Eval"));
}

export function isEvalSeedUrl(sourceUrl: string | null | undefined): boolean {
  return Boolean(sourceUrl?.startsWith("lyvora://eval-m6/"));
}

/** Raw SQL fragment when querying with table alias `m`. */
export const notEvalSeedAliasSql = sql`(
  coalesce(m.source_url, '') not like 'lyvora://eval-m6/%'
  and m.title not like 'M6 Eval%'
)`;

/**
 * Hide leftover eval-report seed memories so they stop polluting Reports / Home.
 * Returns how many rows were archived.
 */
export async function archiveEvalSeedMemories(userId: string): Promise<number> {
  const db = createServiceDbClient();
  const updated = await db
    .update(memories)
    .set({
      isArchived: true,
      updatedAt: new Date(),
    })
    .where(
      sql`${memories.userId} = ${userId}::uuid
        and not ${memories.isArchived}
        and (
          coalesce(${memories.sourceUrl}, '') like 'lyvora://eval-m6/%'
          or ${memories.title} like 'M6 Eval%'
        )`,
    )
    .returning({ id: memories.id });

  return updated.length;
}

/** Convenience: archive for one user (used before regenerating a report). */
export async function cleanupEvalSeedForUser(userId: string): Promise<number> {
  try {
    return await archiveEvalSeedMemories(userId);
  } catch {
    return 0;
  }
}
