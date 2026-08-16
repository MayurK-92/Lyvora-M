import { listBrowseMemories, type SearchHit } from "../search/search-memories";

/** Static fallbacks when the library is empty or too thin to personalize. */
export const FALLBACK_CHAT_SUGGESTIONS = [
  "What healthy meals have I saved this month?",
  "What laptops was I considering?",
  "What do I know about Kubernetes?",
  "What restaurants did I save for Goa?",
] as const;

const SKIP_CATEGORIES = new Set(["uncategorized", "other", "general"]);

export interface ChatSuggestionMemory {
  title: string;
  category: string;
  tags: string[];
  siteName: string | null;
  sourceUrl: string | null;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isSkippableCategory(category: string): boolean {
  return SKIP_CATEGORIES.has(normalizeKey(category));
}

function prettyLabel(value: string): string {
  const trimmed = value.trim().replace(/^#/, "");
  if (!trimmed) return trimmed;
  if (/^[A-Z0-9]/.test(trimmed) && trimmed === trimmed.toUpperCase() && trimmed.length <= 6) {
    return trimmed;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function shortTitle(title: string, max = 42): string {
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

function isUsableTitle(title: string): boolean {
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (cleaned.length < 12 || cleaned.length > 120) return false;
  if (/^https?:\/\//i.test(cleaned)) return false;
  if (/^(untitled|new memory|document|pdf|image)$/i.test(cleaned)) return false;
  return true;
}

function countBy(values: string[]): Array<{ value: string; count: number }> {
  const map = new Map<string, { value: string; count: number }>();
  for (const raw of values) {
    const key = normalizeKey(raw);
    if (!key || key.length < 2) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { value: raw.trim(), count: 1 });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value),
  );
}

/**
 * Build personalized chat prompts from recent saved links/memories.
 * Prefer topic (category/tag) prompts, then 1–2 title/site prompts.
 */
export function buildChatSuggestions(
  memories: ReadonlyArray<ChatSuggestionMemory>,
  limit = 4,
): string[] {
  const capped = Math.max(0, Math.min(limit, 6));
  if (capped === 0) return [];

  const prompts: string[] = [];
  const seen = new Set<string>();

  function push(prompt: string, topicKey?: string) {
    const key = normalizeKey(prompt);
    if (!key || seen.has(key)) return false;
    if (topicKey && seen.has(`topic:${normalizeKey(topicKey)}`)) return false;
    seen.add(key);
    if (topicKey) seen.add(`topic:${normalizeKey(topicKey)}`);
    prompts.push(prompt);
    return true;
  }

  const categories = countBy(
    memories.map((m) => m.category).filter((c) => c && !isSkippableCategory(c)),
  );
  const tags = countBy(memories.flatMap((m) => m.tags ?? []));

  for (const tag of tags) {
    if (prompts.length >= Math.max(1, capped - 1)) break;
    // Prefer tags that show up more than once when we have enough library signal.
    if (tag.count < 2 && memories.length >= 8) continue;
    push(`What do I know about ${prettyLabel(tag.value)}?`, tag.value);
  }

  for (const category of categories) {
    if (prompts.length >= Math.max(2, capped - 1)) break;
    push(`What have I saved in ${prettyLabel(category.value)}?`, category.value);
  }

  // Title / site prompts — fill remaining slots (at least one when possible).
  const titleBudget = Math.max(1, capped - prompts.length);
  let titleAdded = 0;
  for (const memory of memories) {
    if (titleAdded >= titleBudget || prompts.length >= capped) break;

    if (memory.siteName?.trim() && memory.siteName.trim().length >= 3) {
      const site = prettyLabel(memory.siteName);
      if (push(`What have I saved from ${site}?`, `site:${site}`)) {
        titleAdded += 1;
        continue;
      }
    }

    if (!isUsableTitle(memory.title)) continue;
    const title = shortTitle(memory.title);
    if (push(`Summarize what I saved about "${title}"`, `title:${title}`)) {
      titleAdded += 1;
    }
  }

  for (const fallback of FALLBACK_CHAT_SUGGESTIONS) {
    if (prompts.length >= capped) break;
    push(fallback);
  }

  return prompts.slice(0, capped);
}

/** Load recent memories and return personalized chat suggestion prompts. */
export async function listChatSuggestions(
  userId: string,
  limit = 4,
): Promise<string[]> {
  try {
    const memories = await listBrowseMemories(userId, 30);
    return buildChatSuggestions(
      memories.map((row: SearchHit) => ({
        title: row.title,
        category: row.category,
        tags: row.tags ?? [],
        siteName: row.siteName,
        sourceUrl: row.sourceUrl,
      })),
      limit,
    );
  } catch {
    return [...FALLBACK_CHAT_SUGGESTIONS].slice(0, limit);
  }
}
