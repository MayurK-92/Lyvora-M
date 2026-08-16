import { tool } from "ai";
import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { memories } from "../db/schema";
import { CATEGORY_TAXONOMY } from "../schemas/categories";
import { searchChunks } from "../search/search-chunks";
import { searchFull } from "../search/search-memories";

/** Build AI SDK tools scoped to a single user (service DB + explicit userId filter). */
export function createChatTools(userId: string) {
  return {
    searchMemories: tool({
      description:
        "Hybrid search over the user's saved memories. Returns compact cards (id, title, tldr, category, tags).",
      inputSchema: z.object({
        query: z.string().describe("Natural language search query"),
        limit: z.number().int().min(1).max(20).optional(),
      }),
      execute: async ({ query, limit }) => {
        const result = await searchFull(userId, query, {}, limit ?? 8);
        return {
          cleanedQuery: result.cleanedQuery,
          results: result.hits.map((hit) => ({
            id: hit.id,
            title: hit.title,
            tldr: hit.tldr,
            category: hit.category,
            tags: hit.tags,
            contentType: hit.contentType,
          })),
        };
      },
    }),

    getMemoryDetail: tool({
      description:
        "Load full details for specific memory IDs (summary, key points, structured payload).",
      inputSchema: z.object({
        memoryIds: z.array(z.string().uuid()).min(1).max(8),
      }),
      execute: async ({ memoryIds }) => {
        const db = createServiceDbClient();
        const rows = await db
          .select({
            id: memories.id,
            title: memories.title,
            tldr: memories.tldr,
            summary: memories.summary,
            category: memories.category,
            tags: memories.tags,
            keyPoints: memories.keyPoints,
            contentType: memories.contentType,
            structured: memories.structured,
            sourceUrl: memories.sourceUrl,
            siteName: memories.siteName,
          })
          .from(memories)
          .where(
            and(eq(memories.userId, userId), inArray(memories.id, memoryIds)),
          );
        return { memories: rows };
      },
    }),

    searchChunks: tool({
      description:
        "Search memory chunks for verbatim passages. Use after searchMemories when you need exact wording.",
      inputSchema: z.object({
        query: z.string(),
        limit: z.number().int().min(1).max(12).optional(),
      }),
      execute: async ({ query, limit }) => {
        const hits = await searchChunks(userId, query, limit ?? 6);
        return {
          results: hits.map((hit) => ({
            memoryId: hit.memoryId,
            title: hit.title,
            heading: hit.heading,
            excerpt: hit.content,
            score: hit.score,
          })),
        };
      },
    }),

    listByCategory: tool({
      description:
        "List recent memories in a category or matching a tag (e.g. Shopping for laptops, Travel for Goa).",
      inputSchema: z.object({
        category: z.enum(CATEGORY_TAXONOMY).optional(),
        tag: z.string().optional(),
        limit: z.number().int().min(1).max(30).optional(),
      }),
      execute: async ({ category, tag, limit }) => {
        const db = createServiceDbClient();
        const max = limit ?? 15;
        const conditions = [
          eq(memories.userId, userId),
          eq(memories.isArchived, false),
          sql`${memories.duplicateOf} is null`,
        ];
        if (category) conditions.push(eq(memories.category, category));
        if (tag) conditions.push(sql`${tag} = any(${memories.tags})`);

        const rows = await db
          .select({
            id: memories.id,
            title: memories.title,
            tldr: memories.tldr,
            category: memories.category,
            tags: memories.tags,
            contentType: memories.contentType,
          })
          .from(memories)
          .where(and(...conditions))
          .orderBy(desc(memories.savedAt))
          .limit(max);

        return { results: rows };
      },
    }),
  };
}

export type ChatTools = ReturnType<typeof createChatTools>;
