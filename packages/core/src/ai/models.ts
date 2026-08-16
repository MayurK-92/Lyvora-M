import { google } from "@ai-sdk/google";

/**
 * Model roles from system_design.md §4.
 * Free tier: Gemini Flash via Google AI Studio (`GOOGLE_GENERATIVE_AI_API_KEY`).
 * Embeddings: gemini-embedding-001 @ 1536 dims (M3).
 */
export const models = {
  extract: google("gemini-3.5-flash-lite"),
  fast: google("gemini-3.5-flash-lite"),
  reason: google("gemini-3.5-flash-lite"),
} as const;

export const EXTRACT_MODEL_ID = "gemini-3.5-flash-lite";
export const REASON_MODEL_ID = "gemini-3.5-flash-lite";
export const EMBED_MODEL_ID = "gemini-embedding-001";
export const EMBED_DIMENSIONS = 1536;
