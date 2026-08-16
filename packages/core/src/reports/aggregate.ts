import { eq, sql } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { profiles } from "../db/schema";
import type { WeeklyReportPayload } from "./types";
import { notEvalSeedAliasSql } from "./eval-seed";

function mondayOf(date: Date, timeZone: string): string {
  // Compute local calendar date in timezone, then walk back to Monday (ISO week).
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const local = fmt.format(date); // YYYY-MM-DD
  const parts = local.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = utcNoon.getUTCDay(); // 0 Sun .. 6 Sat
  const daysFromMonday = (weekday + 6) % 7;
  utcNoon.setUTCDate(utcNoon.getUTCDate() - daysFromMonday);
  return utcNoon.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T12:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export async function aggregateWeeklyReport(
  userId: string,
  asOf: Date = new Date(),
): Promise<WeeklyReportPayload> {
  const db = createServiceDbClient();
  const [profile] = await db
    .select({ timezone: profiles.timezone })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  const timezone = profile?.timezone || "UTC";

  const weekStart = mondayOf(asOf, timezone);
  const weekEnd = addDays(weekStart, 7);
  const prevStart = addDays(weekStart, -7);

  const [saved] = await db.execute<{ this_week: number; last_week: number }>(sql`
    select
      count(*) filter (
        where saved_at >= ${weekStart}::date
          and saved_at < ${weekEnd}::date
      )::int as this_week,
      count(*) filter (
        where saved_at >= ${prevStart}::date
          and saved_at < ${weekStart}::date
      )::int as last_week
    from memories m
    where m.user_id = ${userId}::uuid
      and not m.is_archived
      and m.duplicate_of is null
      and ${notEvalSeedAliasSql}
  `);

  const topCategories = (await db.execute<{ category: string; count: number }>(sql`
    select category, count(*)::int as count
    from memories m
    where m.user_id = ${userId}::uuid
      and not m.is_archived
      and m.duplicate_of is null
      and m.saved_at >= ${weekStart}::date
      and m.saved_at < ${weekEnd}::date
      and ${notEvalSeedAliasSql}
    group by category
    order by count desc
    limit 5
  `)) as unknown as Array<{ category: string; count: number }>;

  const emergingTags = (await db.execute<{ tag: string; count: number }>(sql`
    select lower(trim(tag)) as tag, count(*)::int as count
    from memories m, unnest(m.tags) as tag
    where m.user_id = ${userId}::uuid
      and not m.is_archived
      and m.duplicate_of is null
      and m.saved_at >= ${weekStart}::date
      and m.saved_at < ${weekEnd}::date
      and length(trim(tag)) > 0
      and ${notEvalSeedAliasSql}
    group by 1
    order by count desc
    limit 8
  `)) as unknown as Array<{ tag: string; count: number }>;

  const mostViewed = (await db.execute<{
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
      and e.created_at < ${addDays(weekStart, 7)}::date
      and not m.is_archived
      and m.duplicate_of is null
      and ${notEvalSeedAliasSql}
    group by m.id, m.title, m.tldr, m.category
    order by view_count desc, max(e.created_at) desc
    limit 5
  `)) as unknown as Array<{
    id: string;
    title: string;
    tldr: string | null;
    category: string;
    view_count: number;
  }>;

  const mostViewedFallback =
    mostViewed.length > 0
      ? mostViewed
      : ((await db.execute<{
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
          limit 5
        `)) as unknown as Array<{
          id: string;
          title: string;
          tldr: string | null;
          category: string;
          view_count: number;
        }>);

  const [never] = await db.execute<{ count: number }>(sql`
    select count(*)::int as count
    from memories m
    where m.user_id = ${userId}::uuid
      and not m.is_archived
      and m.duplicate_of is null
      and m.view_count = 0
      and ${notEvalSeedAliasSql}
  `);

  const recommended = (await db.execute<{
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
      and ${notEvalSeedAliasSql}
      and (
        m.view_count = 0
        or m.last_viewed_at is null
        or m.last_viewed_at < now() - interval '30 days'
      )
      and m.saved_at < now() - interval '7 days'
    order by
      case when m.view_count = 0 then 0 else 1 end,
      m.saved_at asc
    limit 3
  `)) as unknown as Array<{
    id: string;
    title: string;
    tldr: string | null;
    category: string;
    view_count: number;
  }>;

  const [growth] = await db.execute<{
    memories: number;
    entities: number;
    edges: number;
  }>(sql`
    select
      (select count(*)::int from memories m
        where m.user_id = ${userId}::uuid
          and not m.is_archived
          and m.duplicate_of is null
          and ${notEvalSeedAliasSql}) as memories,
      (select count(*)::int from entities where user_id = ${userId}::uuid) as entities,
      (select count(*)::int from memory_edges where user_id = ${userId}::uuid) as edges
  `);

  const stale = (await db.execute<{
    id: string;
    title: string;
    reason: string;
  }>(sql`
    select m.id, m.title,
      case
        when m.content_type = 'product'
          and coalesce(m.structured->>'price', m.structured->'price'->>'amount') is not null
          then 'Product with a saved price — may be outdated'
        when m.category in ('Programming', 'Technology', 'Shopping')
          and m.saved_at < now() - interval '18 months'
          then 'Tech content older than 18 months'
        else 'Possibly outdated'
      end as reason
    from memories m
    where m.user_id = ${userId}::uuid
      and not m.is_archived
      and m.duplicate_of is null
      and ${notEvalSeedAliasSql}
      and (
        (
          m.content_type = 'product'
          and (
            m.structured ? 'price'
            or m.structured->'price' is not null
          )
        )
        or (
          m.category in ('Programming', 'Technology', 'Shopping')
          and m.saved_at < now() - interval '18 months'
        )
      )
    order by m.saved_at asc
    limit 5
  `)) as unknown as Array<{ id: string; title: string; reason: string }>;

  const savedRow = saved as unknown as { this_week: number; last_week: number };
  const neverRow = never as unknown as { count: number };
  const growthRow = growth as unknown as {
    memories: number;
    entities: number;
    edges: number;
  };

  const savedThisWeek = Number(savedRow?.this_week ?? 0);
  const savedLastWeek = Number(savedRow?.last_week ?? 0);

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    timezone,
    savedThisWeek,
    savedLastWeek,
    savedDelta: savedThisWeek - savedLastWeek,
    topCategories: (topCategories ?? []).map((row) => ({
      category: row.category,
      count: Number(row.count),
    })),
    emergingTags: (emergingTags ?? []).map((row) => ({
      tag: row.tag,
      count: Number(row.count),
    })),
    mostViewed: (mostViewedFallback ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      tldr: row.tldr,
      category: row.category,
      viewCount: Number(row.view_count),
    })),
    neverRevisitedCount: Number(neverRow?.count ?? 0),
    recommendedRevisits: (recommended ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      tldr: row.tldr,
      category: row.category,
      viewCount: Number(row.view_count),
    })),
    growth: {
      totalMemories: Number(growthRow?.memories ?? 0),
      totalEntities: Number(growthRow?.entities ?? 0),
      totalEdges: Number(growthRow?.edges ?? 0),
    },
    stale: stale ?? [],
  };
}
