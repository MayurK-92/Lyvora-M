import { and, eq } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { captures, memories } from "../db/schema";
import type { KnowledgeExtraction } from "../schemas/extraction";
import type { ExtractedText } from "./types";
import type { UnderstandResult } from "./understand";

export async function persistMemory(input: {
  userId: string;
  captureId: string;
  urlHash?: string | null;
  canonicalUrl?: string | null;
  storagePath?: string | null;
  extracted: ExtractedText;
  understandResult: UnderstandResult;
  sourceType?: "web" | "youtube" | "instagram" | "text" | "pdf" | "image";
}): Promise<string> {
  const db = createServiceDbClient();
  const { knowledge, aiMeta } = input.understandResult;
  const aiMetaWithEntities = {
    ...aiMeta,
    entities: knowledge.entities,
  };

  const values = {
    userId: input.userId,
    captureId: input.captureId,
    sourceType: input.sourceType ?? "web",
    sourceUrl: input.extracted.sourceUrl,
    canonicalUrl: input.canonicalUrl ?? null,
    urlHash: input.urlHash ?? null,
    storagePath: input.storagePath ?? null,
    siteName: input.extracted.siteName ?? null,
    author: input.extracted.author ?? null,
    publishedAt: input.extracted.publishedAt
      ? new Date(input.extracted.publishedAt)
      : null,
    contentType: knowledge.contentType,
    title: knowledge.title,
    tldr: knowledge.tldr,
    summary: knowledge.summary,
    category: knowledge.category,
    tags: knowledge.tags,
    language: knowledge.language,
    keyPoints: knowledge.keyPoints,
    structured: knowledge.structured,
    heroImageUrl: input.extracted.heroImageUrl ?? null,
    rawText: input.extracted.text,
    aiMeta: aiMetaWithEntities,
    // Memory is readable while embeddings catch up; capture status tracks embedding.
    status: "embedding" as const,
    updatedAt: new Date(),
  };

  let memoryId: string | undefined;

  if (input.urlHash) {
    const existing = await db
      .select({ id: memories.id })
      .from(memories)
      .where(
        and(eq(memories.userId, input.userId), eq(memories.urlHash, input.urlHash)),
      )
      .limit(1);
    if (existing[0]) {
      memoryId = existing[0].id;
      await db.update(memories).set(values).where(eq(memories.id, memoryId));
    }
  }

  if (!memoryId) {
    const inserted = await db
      .insert(memories)
      .values(values)
      .returning({ id: memories.id });
    memoryId = inserted[0]!.id;
  }

  await db
    .update(captures)
    .set({
      memoryId,
      status: "embedding",
      lastError: null,
      updatedAt: new Date(),
    })
    .where(and(eq(captures.id, input.captureId), eq(captures.userId, input.userId)));

  return memoryId;
}

export async function finalizeCapture(
  captureId: string,
  userId: string,
  memoryId: string,
): Promise<void> {
  const db = createServiceDbClient();
  await db
    .update(memories)
    .set({ status: "done", updatedAt: new Date() })
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)));

  await db
    .update(captures)
    .set({
      memoryId,
      status: "done",
      lastError: null,
      updatedAt: new Date(),
    })
    .where(and(eq(captures.id, captureId), eq(captures.userId, userId)));
}

export async function markCaptureFailed(
  captureId: string,
  userId: string,
  error: string,
): Promise<void> {
  const db = createServiceDbClient();
  await db
    .update(captures)
    .set({
      status: "failed",
      lastError: error.slice(0, 2000),
      attempts: 1,
      updatedAt: new Date(),
    })
    .where(and(eq(captures.id, captureId), eq(captures.userId, userId)));
}

export async function loadCaptureForPipeline(captureId: string, userId: string) {
  const db = createServiceDbClient();
  const rows = await db
    .select()
    .from(captures)
    .where(and(eq(captures.id, captureId), eq(captures.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findMemoryByUrlHash(userId: string, urlHash: string) {
  const db = createServiceDbClient();
  const rows = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.urlHash, urlHash)))
    .limit(1);
  return rows[0] ?? null;
}

export async function mergeDuplicateCapture(input: {
  captureId: string;
  userId: string;
  memoryId: string;
}): Promise<void> {
  const db = createServiceDbClient();
  await db
    .update(captures)
    .set({
      memoryId: input.memoryId,
      status: "duplicate",
      updatedAt: new Date(),
    })
    .where(and(eq(captures.id, input.captureId), eq(captures.userId, input.userId)));
}

export async function setCaptureStatus(
  captureId: string,
  userId: string,
  status:
    | "queued"
    | "fetching"
    | "extracting"
    | "enriching"
    | "embedding"
    | "done"
    | "failed",
): Promise<void> {
  const db = createServiceDbClient();
  await db
    .update(captures)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(captures.id, captureId), eq(captures.userId, userId)));
}

export type { KnowledgeExtraction };
