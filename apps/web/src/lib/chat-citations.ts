/**
 * Client-safe citation parsing — keep out of `@lyvora/core` barrel imports
 * so browser bundles never pull Node-only deps (canvas/fs).
 */

const UUID_TOKEN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** [memory:uuid], [uuid], or comma-separated lists inside one bracket. */
const CITATION_BLOCK_RE = new RegExp(
  `\\[\\s*(?:memory\\s*:\\s*)?${UUID_TOKEN}(?:\\s*,\\s*(?:memory\\s*:\\s*)?${UUID_TOKEN})*\\s*\\]`,
  "gi",
);

export function extractCitationsFromText(text: string): string[] {
  const ids = new Set<string>();
  for (const block of text.matchAll(CITATION_BLOCK_RE)) {
    for (const id of block[0]!.matchAll(new RegExp(UUID_TOKEN, "gi"))) {
      ids.add(id[0]!.toLowerCase());
    }
  }
  return [...ids];
}

export function stripCitationMarkers(text: string): string {
  return text
    .replace(CITATION_BLOCK_RE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
