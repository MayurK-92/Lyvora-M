import { and, eq, sql } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { memories, profiles } from "../db/schema";
import { topInterestKeys, type UserInterests } from "./interests";

export interface RediscoveryCard {
  id: string;
  title: string;
  tldr: string | null;
  category: string;
  tags: string[];
  savedAt: Date;
  reason: string;
}

export async function listRediscovery(
  userId: string,
  limit = 8,
): Promise<RediscoveryCard[]> {
  const db = createServiceDbClient();
  const [profile] = await db
    .select({ interests: profiles.interests })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  const { categories, tags } = topInterestKeys(
    profile?.interests as UserInterests | null,
    10,
  );

  const rows = await db
    .select({
      id: memories.id,
      title: memories.title,
      tldr: memories.tldr,
      category: memories.category,
      tags: memories.tags,
      savedAt: memories.savedAt,
      viewCount: memories.viewCount,
      lastViewedAt: memories.lastViewedAt,
    })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.isArchived, false),
        sql`${memories.duplicateOf} is null`,
        sql`${memories.savedAt} < now() - interval '30 days'`,
        sql`(
          ${memories.viewCount} = 0
          or ${memories.lastViewedAt} is null
          or ${memories.lastViewedAt} < now() - interval '90 days'
        )`,
      ),
    )
    .orderBy(sql`${memories.savedAt} asc`)
    .limit(60);

  const scored = rows
    .map((row) => {
      let score = 0;
      let reason = "Saved a while ago";
      if (categories.includes(row.category)) {
        score += 3;
        reason = `From your ${row.category} saves`;
      }
      const rowTags = (row.tags ?? []).map((t) => t.toLowerCase());
      const tagHit = tags.find((t) => rowTags.includes(t));
      if (tagHit) {
        score += 2;
        reason = `Related to “${tagHit}”`;
      }
      if (row.viewCount === 0) score += 1;
      return { row, score, reason };
    })
    .filter((item) => item.score > 0 || categories.length === 0)
    .sort((a, b) => b.score - a.score || a.row.savedAt.getTime() - b.row.savedAt.getTime())
    .slice(0, limit);

  // If no interest overlap yet, still surface oldest forgotten items
  const picked =
    scored.length > 0
      ? scored
      : rows.slice(0, limit).map((row) => ({
          row,
          score: 0,
          reason: "From your memory",
        }));

  return picked.map(({ row, reason }) => ({
    id: row.id,
    title: row.title,
    tldr: row.tldr,
    category: row.category,
    tags: row.tags ?? [],
    savedAt: row.savedAt,
    reason,
  }));
}
