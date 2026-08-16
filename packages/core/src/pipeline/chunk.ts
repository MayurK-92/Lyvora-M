export interface TextChunk {
  ordinal: number;
  heading: string | null;
  content: string;
  tokenCount: number;
}

/** Rough token estimate (~4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

const TARGET_MIN = 300;
const TARGET_MAX = 500;
const SINGLE_DOC_MAX = 600;
const OVERLAP_RATIO = 0.15;

/**
 * Structure-aware chunking: split on markdown/heading lines, then paragraphs.
 * Docs under ~600 tokens → one chunk. Otherwise pack to 300–500 tokens with ~15% overlap.
 */
export function chunkText(raw: string, title?: string | null): TextChunk[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return [
      {
        ordinal: 0,
        heading: title ?? null,
        content: title?.trim() || "(empty)",
        tokenCount: estimateTokens(title ?? "(empty)"),
      },
    ];
  }

  const totalTokens = estimateTokens(text);
  if (totalTokens < SINGLE_DOC_MAX) {
    return [
      {
        ordinal: 0,
        heading: title ?? null,
        content: text,
        tokenCount: totalTokens,
      },
    ];
  }

  const sections = splitIntoSections(text);
  const packed: TextChunk[] = [];
  let buffer = "";
  let bufferHeading: string | null = null;

  const flush = () => {
    const content = buffer.trim();
    if (!content) return;
    packed.push({
      ordinal: packed.length,
      heading: bufferHeading,
      content,
      tokenCount: estimateTokens(content),
    });
    const overlapTokens = Math.floor(TARGET_MAX * OVERLAP_RATIO);
    const words = content.split(/\s+/);
    const keep = Math.max(1, Math.floor(words.length * (overlapTokens / Math.max(estimateTokens(content), 1))));
    buffer = words.slice(-keep).join(" ");
    bufferHeading = null;
  };

  for (const section of sections) {
    const piece = section.body.trim();
    if (!piece) continue;
    if (!buffer) bufferHeading = section.heading;
    const candidate = buffer ? `${buffer}\n\n${piece}` : piece;
    if (estimateTokens(candidate) > TARGET_MAX && estimateTokens(buffer) >= TARGET_MIN) {
      flush();
      bufferHeading = section.heading;
      buffer = piece;
    } else {
      buffer = candidate;
    }
  }
  if (buffer.trim()) {
    packed.push({
      ordinal: packed.length,
      heading: bufferHeading,
      content: buffer.trim(),
      tokenCount: estimateTokens(buffer),
    });
  }

  return packed.length
    ? packed
    : [
        {
          ordinal: 0,
          heading: title ?? null,
          content: text.slice(0, TARGET_MAX * 4),
          tokenCount: estimateTokens(text.slice(0, TARGET_MAX * 4)),
        },
      ];
}

function splitIntoSections(text: string): Array<{ heading: string | null; body: string }> {
  const lines = text.split("\n");
  const sections: Array<{ heading: string | null; body: string }> = [];
  let heading: string | null = null;
  let body: string[] = [];

  const push = () => {
    if (!body.length && !heading) return;
    sections.push({ heading, body: body.join("\n").trim() });
    body = [];
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,6}\s+.+|[A-Z][A-Za-z0-9 /&-]{2,80})$/.exec(line.trim());
    const looksLikeHeading =
      /^#{1,6}\s+/.test(line.trim()) ||
      (headingMatch &&
        line.trim().length < 80 &&
        !line.trim().endsWith(".") &&
        body.length > 0);

    if (looksLikeHeading && /^#{1,6}\s+/.test(line.trim())) {
      push();
      heading = line.trim().replace(/^#{1,6}\s+/, "");
      continue;
    }
    body.push(line);
  }
  push();

  if (sections.length <= 1) {
    return text
      .split(/\n{2,}/)
      .map((para) => para.trim())
      .filter(Boolean)
      .map((para) => ({ heading: null, body: para }));
  }
  return sections;
}
