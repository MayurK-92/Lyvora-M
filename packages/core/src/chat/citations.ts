const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UUID_TOKEN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Bracket citation blocks: [memory:uuid], [uuid], or comma-separated lists. */
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

/** Strip citation markers from assistant text shown to the user. */
export function stripCitationMarkers(text: string): string {
  return text
    .replace(CITATION_BLOCK_RE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Walk tool JSON for memory `id` / `memoryId` fields. */
export function collectMemoryIdsFromUnknown(value: unknown, into = new Set<string>()): string[] {
  if (value == null) return [...into];
  if (typeof value === "string") {
    if (UUID_RE.test(value)) into.add(value.toLowerCase());
    return [...into];
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMemoryIdsFromUnknown(item, into);
    return [...into];
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const [key, child] of Object.entries(record)) {
      if (
        (key === "id" || key === "memoryId" || key === "memory_id") &&
        typeof child === "string" &&
        UUID_RE.test(child)
      ) {
        into.add(child.toLowerCase());
      } else {
        collectMemoryIdsFromUnknown(child, into);
      }
    }
  }
  return [...into];
}

export function resolveCitations(input: {
  answerText: string;
  toolMemoryIds: string[];
}): string[] {
  const fromText = extractCitationsFromText(input.answerText);
  const allowed = new Set(input.toolMemoryIds.map((id) => id.toLowerCase()));
  const grounded = fromText.filter((id) => allowed.has(id));
  if (grounded.length) return grounded;

  const refusal =
    /don'?t have|nothing saved|no memories|not saved anything|no saved/i.test(
      input.answerText,
    );
  if (refusal || !input.toolMemoryIds.length) return [];
  return input.toolMemoryIds.slice(0, 5);
}
