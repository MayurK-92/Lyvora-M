export const EXTRACTION_PROMPT_VERSION = "extraction.v1";

export const EXTRACTION_SYSTEM_PROMPT = `You are Lyvora's knowledge extractor. Turn saved web content into a structured Knowledge Object.

Rules:
- Be faithful to the source. Do not invent facts, prices, or citations.
- Prefer a clear, specific title under 140 characters.
- tldr is one sentence for list views (max 180 chars).
- summary is 3–6 sentences covering what matters and why someone saved it.
- category MUST be one of the closed taxonomy values provided in the schema.
- tags are free-form (max 10), specific and useful for search.
- Pick the best contentType and fill structured accordingly.
  structured MUST always include a discriminator field "kind"
  ("recipe" | "product" | "workout" | "travel" | "tech" | "generic").
  Use kind "generic" (with facts/actionItems arrays) when no domain payload fits.
- For video sources (YouTube, Instagram Reels), prefer contentType "video";
  summarize from the transcript / AI-watched video report when present, and
  fall back to title + caption/description otherwise.
- confidence reflects how complete and reliable the extraction is (0–1).
- Respect any user note as intent signal (why they saved it).`;

export function buildExtractionPrompt(input: {
  text: string;
  metadata: {
    title?: string | null;
    siteName?: string | null;
    author?: string | null;
    url?: string | null;
  };
  userNote?: string | null;
}): string {
  const metaLines = [
    input.metadata.url ? `URL: ${input.metadata.url}` : null,
    input.metadata.title ? `Page title: ${input.metadata.title}` : null,
    input.metadata.siteName ? `Site: ${input.metadata.siteName}` : null,
    input.metadata.author ? `Author: ${input.metadata.author}` : null,
    input.userNote ? `User note: ${input.userNote}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `${metaLines}

--- CONTENT ---
${input.text}`;
}
