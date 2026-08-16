import { and, eq, sql } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { memories, profiles } from "../db/schema";

export interface UserInterests {
  categories: Record<string, number>;
  tags: Record<string, number>;
  updatedAt: string;
}

function decayWeight(savedAt: Date, now: Date): number {
  const ageDays = Math.max(
    0,
    (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  // Half-life ~45 days
  return Math.exp(-ageDays / 65);
}

export async function recomputeInterests(userId: string): Promise<UserInterests> {
  const db = createServiceDbClient();
  const rows = await db
    .select({
      category: memories.category,
      tags: memories.tags,
      viewCount: memories.viewCount,
      savedAt: memories.savedAt,
    })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.isArchived, false),
        sql`${memories.duplicateOf} is null`,
      ),
    );

  const now = new Date();
  const categories: Record<string, number> = {};
  const tags: Record<string, number> = {};

  for (const row of rows) {
    const recency = decayWeight(row.savedAt, now);
    const engagement = 1 + Math.log1p(row.viewCount ?? 0) * 0.35;
    const weight = recency * engagement;

    if (row.category) {
      categories[row.category] = (categories[row.category] ?? 0) + weight;
    }
    for (const tag of row.tags ?? []) {
      const key = tag.trim().toLowerCase();
      if (!key) continue;
      tags[key] = (tags[key] ?? 0) + weight * 0.6;
    }
  }

  const interests: UserInterests = {
    categories,
    tags,
    updatedAt: now.toISOString(),
  };

  await db
    .update(profiles)
    .set({ interests })
    .where(eq(profiles.id, userId));

  return interests;
}

export async function listProfileIds(): Promise<string[]> {
  const db = createServiceDbClient();
  const rows = await db.select({ id: profiles.id }).from(profiles);
  return rows.map((row) => row.id);
}

export function topInterestKeys(
  interests: UserInterests | Record<string, unknown> | null | undefined,
  limit = 8,
): { categories: string[]; tags: string[] } {
  if (!interests || typeof interests !== "object") {
    return { categories: [], tags: [] };
  }
  const cats =
    "categories" in interests &&
    interests.categories &&
    typeof interests.categories === "object"
      ? (interests.categories as Record<string, number>)
      : {};
  const tagMap =
    "tags" in interests && interests.tags && typeof interests.tags === "object"
      ? (interests.tags as Record<string, number>)
      : {};

  const sortKeys = (record: Record<string, number>) =>
    Object.entries(record)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => key);

  return { categories: sortKeys(cats), tags: sortKeys(tagMap) };
}
