import { and, eq, sql } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { memories, memoryEvents } from "../db/schema";
import type { ReportMemoryCard } from "../reports/types";
import { notEvalSeedAliasSql } from "../reports/eval-seed";

const VIEW_DEBOUNCE_MS = 5 * 60 * 1000;

/**
 * Record a memory open for interests + Most Revisited.
 * Debounced so refresh spam does not inflate the count.
 */
export async function recordMemoryView(
  userId: string,
  memoryId: string,
): Promise<void> {
  const db = createServiceDbClient();
  const [owned] = await db
    .select({
      id: memories.id,
      lastViewedAt: memories.lastViewedAt,
    })
    .from(memories)
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)))
    .limit(1);
  if (!owned) return;

  if (
    owned.lastViewedAt &&
    Date.now() - owned.lastViewedAt.getTime() < VIEW_DEBOUNCE_MS
  ) {
    return;
  }

  await db.insert(memoryEvents).values({
    userId,
    memoryId,
    kind: "view",
  });

  await db
    .update(memories)
    .set({
      viewCount: sql`${memories.viewCount} + 1`,
      lastViewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(memories.id, memoryId));
}

function addDays(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T12:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Live Most Revisited list. Prefers views inside the given week (from
 * memory_events); falls back to all-time memories.view_count.
 */
export async function listMostRevisitedMemories(
  userId: string,
  options: {
    limit?: number;
    /** Inclusive week start (YYYY-MM-DD). */
    weekStart?: string | null;
    /** Inclusive week end (YYYY-MM-DD). Defaults to weekStart + 6. */
    weekEnd?: string | null;
  } = {},
): Promise<ReportMemoryCard[]> {
  const db = createServiceDbClient();
  const limit = Math.max(1, Math.min(options.limit ?? 5, 12));

  if (options.weekStart) {
    const weekStart = options.weekStart;
    const exclusiveEnd = addDays(options.weekEnd ?? addDays(weekStart, 6), 1);
    const weekRows = (await db.execute<{
      id: string;
      title: string;
      tldr: string | null;
      category: string;
      view_count: number;
    }>(sql`
      select
        m.id,
        m.title,
        m.tldr,
        m.category,
        count(*)::int as view_count
      from memory_events e
      join memories m on m.id = e.memory_id
      where e.user_id = ${userId}::uuid
        and e.kind = 'view'
        and e.created_at >= ${weekStart}::date
        and e.created_at < ${exclusiveEnd}::date
        and not m.is_archived
        and m.duplicate_of is null
        and ${notEvalSeedAliasSql}
      group by m.id, m.title, m.tldr, m.category
      order by view_count desc, max(e.created_at) desc
      limit ${limit}
    `)) as unknown as Array<{
      id: string;
      title: string;
      tldr: string | null;
      category: string;
      view_count: number;
    }>;

    if (weekRows.length > 0) {
      return weekRows.map((row) => ({
        id: row.id,
        title: row.title,
        tldr: row.tldr,
        category: row.category,
        viewCount: Number(row.view_count),
      }));
    }
  }

  const rows = (await db.execute<{
    id: string;
    title: string;
    tldr: string | null;
    category: string;
    view_count: number;
  }>(sql`
    select m.id, m.title, m.tldr, m.category, m.view_count
    from memories m
    where m.user_id = ${userId}::uuid
      and not m.is_archived
      and m.duplicate_of is null
      and m.view_count > 0
      and ${notEvalSeedAliasSql}
    order by m.view_count desc, m.last_viewed_at desc nulls last
    limit ${limit}
  `)) as unknown as Array<{
    id: string;
    title: string;
    tldr: string | null;
    category: string;
    view_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    tldr: row.tldr,
    category: row.category,
    viewCount: Number(row.view_count),
  }));
}
