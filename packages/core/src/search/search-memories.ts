import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { embedQuery } from "../ai/embed";
import { createServiceDbClient } from "../db/client";
import { memories } from "../db/schema";
import { understandQuery } from "./query-understand";

export interface SearchFilters {
  categories?: string[] | null;
  tags?: string[] | null;
  contentTypes?: string[] | null;
  from?: string | null;
  to?: string | null;
}

export interface SearchHit {
  id: string;
  title: string;
  tldr: string | null;
  category: string;
  tags: string[];
  contentType: string;
  sourceUrl: string | null;
  siteName: string | null;
  heroImageUrl: string | null;
  savedAt: string;
  score: number;
  ftsRank: number | null;
  vecRank: number | null;
}

export interface SearchFacets {
  categories: Array<{ value: string; count: number }>;
  tags: Array<{ value: string; count: number }>;
  contentTypes: Array<{ value: string; count: number }>;
}

export interface SearchResult {
  hits: SearchHit[];
  facets: SearchFacets;
  cleanedQuery: string;
  mode: "instant" | "full";
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

function sqlTextArray(values: string[] | null | undefined) {
  if (!values?.length) return sql`null::text[]`;
  return sql`array[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::text[]`;
}

function sqlContentTypeArray(values: string[] | null | undefined) {
  if (!values?.length) return sql`null::content_type[]`;
  return sql`array[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::content_type[]`;
}

function facetCounts(
  rows: Array<{ category: string; tags: string[]; contentType: string }>,
): SearchFacets {
  const categories = new Map<string, number>();
  const tags = new Map<string, number>();
  const contentTypes = new Map<string, number>();
  for (const row of rows) {
    categories.set(row.category, (categories.get(row.category) ?? 0) + 1);
    contentTypes.set(
      row.contentType,
      (contentTypes.get(row.contentType) ?? 0) + 1,
    );
    for (const tag of row.tags ?? []) {
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
  }
  const toList = (map: Map<string, number>) =>
    [...map.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  return {
    categories: toList(categories),
    tags: toList(tags).slice(0, 24),
    contentTypes: toList(contentTypes),
  };
}

async function hydrateHits(
  userId: string,
  ranked: Array<{
    id: string;
    score: number;
    fts_rank: number | null;
    vec_rank: number | null;
  }>,
): Promise<SearchHit[]> {
  if (!ranked.length) return [];
  const db = createServiceDbClient();
  const ids = ranked.map((row) => row.id);
  const rows = await db
    .select({
      id: memories.id,
      title: memories.title,
      tldr: memories.tldr,
      category: memories.category,
      tags: memories.tags,
      contentType: memories.contentType,
      sourceUrl: memories.sourceUrl,
      siteName: memories.siteName,
      heroImageUrl: memories.heroImageUrl,
      savedAt: memories.savedAt,
    })
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, ids)));

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ranked.flatMap((rank) => {
    const row = byId.get(rank.id);
    if (!row) return [];
    return [
      {
        id: row.id,
        title: row.title,
        tldr: row.tldr,
        category: row.category,
        tags: row.tags ?? [],
        contentType: row.contentType,
        sourceUrl: row.sourceUrl,
        siteName: row.siteName,
        heroImageUrl: row.heroImageUrl,
        savedAt: row.savedAt.toISOString(),
        score: rank.score,
        ftsRank: rank.fts_rank,
        vecRank: rank.vec_rank,
      } satisfies SearchHit,
    ];
  });
}

/** Keyword-only path for typeahead (skips embedding + query understanding). */
export async function searchInstant(
  userId: string,
  query: string,
  limit = 8,
): Promise<SearchResult> {
  const q = query.trim();
  const db = createServiceDbClient();
  if (!q) {
    return { hits: [], facets: emptyFacets(), cleanedQuery: "", mode: "instant" };
  }

  const rows = await db.execute<{
    id: string;
    score: number;
  }>(sql`
    select m.id,
           ts_rank_cd(m.fts, websearch_to_tsquery('english', ${q}))::float as score
    from memories m
    where m.user_id = ${userId}::uuid
      and not m.is_archived
      and m.duplicate_of is null
      and m.fts @@ websearch_to_tsquery('english', ${q})
    order by score desc, m.saved_at desc
    limit ${limit}
  `);

  const ranked = (rows as unknown as Array<{ id: string; score: number }>).map(
    (row) => ({
      id: row.id,
      score: Number(row.score),
      fts_rank: null,
      vec_rank: null,
    }),
  );
  const hits = await hydrateHits(userId, ranked);
  return {
    hits,
    facets: facetCounts(hits),
    cleanedQuery: q,
    mode: "instant",
  };
}

export async function searchFull(
  userId: string,
  query: string,
  filters: SearchFilters = {},
  limit = 20,
): Promise<SearchResult> {
  const q = query.trim();
  if (!q) {
    return { hits: [], facets: emptyFacets(), cleanedQuery: "", mode: "full" };
  }

  const understood = await understandQuery(q);
  const cleanedQuery = understood.cleanedQuery.trim() || q;
  const categories =
    filters.categories?.length
      ? filters.categories
      : understood.categories.length
        ? understood.categories
        : null;
  const from = filters.from ?? understood.fromIso;
  const to = filters.to ?? understood.toIso;

  const embedding = await embedQuery(cleanedQuery);
  const db = createServiceDbClient();

  const rows = await db.execute<{
    id: string;
    score: number;
    fts_rank: number | null;
    vec_rank: number | null;
  }>(sql`
    select id, score, fts_rank, vec_rank
    from search_memories(
      ${userId}::uuid,
      ${cleanedQuery},
      ${toVectorLiteral(embedding)}::vector(1536),
      ${sqlTextArray(categories)},
      ${sqlTextArray(filters.tags)},
      ${sqlContentTypeArray(filters.contentTypes)},
      ${from ?? null}::timestamptz,
      ${to ?? null}::timestamptz,
      ${limit}::int
    )
  `);

  const ranked = (
    rows as unknown as Array<{
      id: string;
      score: number;
      fts_rank: number | null;
      vec_rank: number | null;
    }>
  ).map((row) => ({
    id: row.id,
    score: Number(row.score),
    fts_rank: row.fts_rank,
    vec_rank: row.vec_rank,
  }));

  const hits = await hydrateHits(userId, ranked);
  return {
    hits,
    facets: facetCounts(hits),
    cleanedQuery,
    mode: "full",
  };
}

export async function listBrowseMemories(
  userId: string,
  limit = 24,
): Promise<SearchHit[]> {
  const db = createServiceDbClient();
  const pinned = await db
    .select({
      id: memories.id,
      title: memories.title,
      tldr: memories.tldr,
      category: memories.category,
      tags: memories.tags,
      contentType: memories.contentType,
      sourceUrl: memories.sourceUrl,
      siteName: memories.siteName,
      heroImageUrl: memories.heroImageUrl,
      savedAt: memories.savedAt,
    })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.isArchived, false),
        eq(memories.isPinned, true),
      ),
    )
    .orderBy(desc(memories.savedAt))
    .limit(limit);

  const recent = await db
    .select({
      id: memories.id,
      title: memories.title,
      tldr: memories.tldr,
      category: memories.category,
      tags: memories.tags,
      contentType: memories.contentType,
      sourceUrl: memories.sourceUrl,
      siteName: memories.siteName,
      heroImageUrl: memories.heroImageUrl,
      savedAt: memories.savedAt,
    })
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.isArchived, false)))
    .orderBy(desc(memories.savedAt))
    .limit(limit);

  const seen = new Set<string>();
  const merged = [...pinned, ...recent].filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  return merged.map((row) => ({
    id: row.id,
    title: row.title,
    tldr: row.tldr,
    category: row.category,
    tags: row.tags ?? [],
    contentType: row.contentType,
    sourceUrl: row.sourceUrl,
    siteName: row.siteName,
    heroImageUrl: row.heroImageUrl,
    savedAt: row.savedAt.toISOString(),
    score: 0,
    ftsRank: null,
    vecRank: null,
  }));
}

function emptyFacets(): SearchFacets {
  return { categories: [], tags: [], contentTypes: [] };
}
