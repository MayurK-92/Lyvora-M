import { EMBED_DIMENSIONS, EMBED_MODEL_ID } from "./models";

export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** L2-normalize — required when truncating gemini-embedding-001 below 3072. */
export function l2Normalize(vector: number[]): number[] {
  let sumSq = 0;
  for (const value of vector) sumSq += value * value;
  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm === 0) return vector;
  return vector.map((value) => value / norm);
}

function getApiKey(): string {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for embeddings");
  }
  return key;
}

async function embedOne(
  text: string,
  taskType: EmbedTaskType,
): Promise<number[]> {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL_ID}:embedContent`,
  );
  url.searchParams.set("key", getApiKey());

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: EMBED_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini embed failed (${response.status}): ${body.slice(0, 500)}`);
  }

  const json = (await response.json()) as {
    embedding?: { values?: number[] };
  };
  const values = json.embedding?.values;
  if (!values?.length) {
    throw new Error("Gemini embed returned empty vector");
  }
  return l2Normalize(values);
}

/**
 * Embed texts with gemini-embedding-001 (1536-d, L2-normalized).
 * Sequential with light concurrency to stay within free-tier limits.
 */
export async function embedTexts(
  texts: string[],
  taskType: EmbedTaskType = "RETRIEVAL_DOCUMENT",
): Promise<number[][]> {
  const cleaned = texts.map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!cleaned.length) return [];

  const results: number[][] = [];
  const concurrency = 4;
  for (let i = 0; i < cleaned.length; i += concurrency) {
    const batch = cleaned.slice(i, i + concurrency);
    const embedded = await Promise.all(
      batch.map((text) => embedOne(text, taskType)),
    );
    results.push(...embedded);
  }
  return results;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text], "RETRIEVAL_QUERY");
  if (!vector) throw new Error("Failed to embed query");
  return vector;
}
