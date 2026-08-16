import { generateObject } from "ai";
import { z } from "zod";
import { models } from "../ai/models";
import { CATEGORY_TAXONOMY } from "../schemas/categories";

const QueryUnderstandingSchema = z.object({
  cleanedQuery: z
    .string()
    .describe("Semantic search query without filter phrases"),
  categories: z
    .array(z.enum(CATEGORY_TAXONOMY))
    .max(3)
    .describe("Likely categories, or empty if unclear"),
  fromIso: z
    .string()
    .nullable()
    .describe("ISO start date if the query implies a time window"),
  toIso: z
    .string()
    .nullable()
    .describe("ISO end date if the query implies a time window"),
});

export type QueryUnderstanding = z.infer<typeof QueryUnderstandingSchema>;

const cache = new Map<string, { value: QueryUnderstanding; expires: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function wordCount(q: string): number {
  return q.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Runs only when the query has more than 3 words (system_design.md §8.1).
 * Cached in-process by normalized query text (no Redis in M3).
 */
export async function understandQuery(query: string): Promise<QueryUnderstanding> {
  const normalized = query.trim().replace(/\s+/g, " ").toLowerCase();
  if (wordCount(normalized) <= 3) {
    return {
      cleanedQuery: query.trim(),
      categories: [],
      fromIso: null,
      toIso: null,
    };
  }

  const cached = cache.get(normalized);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  const { object } = await generateObject({
    model: models.fast,
    schema: QueryUnderstandingSchema,
    system: `You extract search filters for a personal memory app.
Return a cleaned semantic query and optional category/date filters.
Only set categories from the closed taxonomy. Prefer empty filters when unsure.
Today is ${new Date().toISOString().slice(0, 10)}.`,
    prompt: query.trim(),
    maxRetries: 1,
  });

  cache.set(normalized, { value: object, expires: Date.now() + CACHE_TTL_MS });
  return object;
}
