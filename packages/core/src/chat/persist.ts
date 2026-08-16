import { and, asc, desc, eq } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { chatMessages, chatThreads } from "../db/schema";

export async function listThreads(userId: string, limit = 40) {
  const db = createServiceDbClient();
  return db
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      createdAt: chatThreads.createdAt,
    })
    .from(chatThreads)
    .where(eq(chatThreads.userId, userId))
    .orderBy(desc(chatThreads.createdAt))
    .limit(limit);
}

export async function ensureThread(input: {
  userId: string;
  threadId?: string | null;
  titleHint?: string | null;
}): Promise<{ id: string; title: string | null; created: boolean }> {
  const db = createServiceDbClient();

  if (input.threadId) {
    const existing = await db
      .select({
        id: chatThreads.id,
        title: chatThreads.title,
      })
      .from(chatThreads)
      .where(
        and(
          eq(chatThreads.id, input.threadId),
          eq(chatThreads.userId, input.userId),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return { id: existing[0].id, title: existing[0].title, created: false };
    }
  }

  const title =
    input.titleHint?.trim().slice(0, 80) ||
    "New chat";
  const inserted = await db
    .insert(chatThreads)
    .values({
      userId: input.userId,
      title,
    })
    .returning({ id: chatThreads.id, title: chatThreads.title });

  return { id: inserted[0]!.id, title: inserted[0]!.title, created: true };
}

export async function loadThreadMessages(userId: string, threadId: string) {
  const db = createServiceDbClient();
  const thread = await db
    .select({ id: chatThreads.id })
    .from(chatThreads)
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
    .limit(1);
  if (!thread[0]) return null;

  const messages = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      citations: chatMessages.citations,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.threadId, threadId),
        eq(chatMessages.userId, userId),
      ),
    )
    .orderBy(asc(chatMessages.createdAt));

  return messages;
}

export async function appendMessage(input: {
  userId: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: unknown;
  citations?: string[];
}): Promise<string> {
  const db = createServiceDbClient();
  const inserted = await db
    .insert(chatMessages)
    .values({
      userId: input.userId,
      threadId: input.threadId,
      role: input.role,
      content: input.content as Record<string, unknown>,
      citations: input.citations ?? [],
    })
    .returning({ id: chatMessages.id });
  return inserted[0]!.id;
}

export async function maybeSetThreadTitle(
  userId: string,
  threadId: string,
  title: string,
): Promise<void> {
  const db = createServiceDbClient();
  const rows = await db
    .select({ title: chatThreads.title })
    .from(chatThreads)
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
    .limit(1);
  if (!rows[0]) return;
  if (rows[0].title && rows[0].title !== "New chat") return;
  await db
    .update(chatThreads)
    .set({ title: title.trim().slice(0, 80) })
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)));
}

/** Deletes a thread owned by the user. Messages cascade via FK. */
export async function deleteThread(
  userId: string,
  threadId: string,
): Promise<boolean> {
  const db = createServiceDbClient();
  const removed = await db
    .delete(chatThreads)
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
    .returning({ id: chatThreads.id });
  return Boolean(removed[0]);
}

export function extractTextFromUiContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      if (record.type === "text" && typeof record.text === "string") {
        return record.text;
      }
      return "";
    })
    .join("");
}
