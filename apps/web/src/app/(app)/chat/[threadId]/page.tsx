import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import {
  extractTextFromUiContent,
  listChatSuggestions,
  listThreads,
  loadThreadMessages,
} from "@lyvora/core";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MemoryCardData } from "@/components/memory/memory-card";
import { ChatPanelSkeleton } from "@/components/chat/chat-panel-skeleton";
import { avatarUrlOf } from "@/lib/user";

const ChatPanel = dynamic(
  () => import("@/components/chat/chat-panel").then((mod) => mod.ChatPanel),
  { loading: () => <ChatPanelSkeleton /> },
);

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const user = await requireUser();
  const [threads, rows, suggestions] = await Promise.all([
    listThreads(user.id, 40),
    loadThreadMessages(user.id, threadId),
    listChatSuggestions(user.id, 4),
  ]);
  if (!rows) notFound();

  const initialMessages: UIMessage[] = rows.map((row) => {
    const content = row.content as { parts?: UIMessage["parts"] };
    const parts =
      content?.parts ??
      ([
        {
          type: "text",
          text: extractTextFromUiContent(row.content),
        },
      ] as UIMessage["parts"]);
    return {
      id: row.id,
      role: row.role as "user" | "assistant" | "system",
      parts,
    };
  });

  const citationIds = [...new Set(rows.flatMap((row) => row.citations ?? []))];
  const citationMemories: Record<string, MemoryCardData> = {};
  if (citationIds.length) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("memories")
      .select(
        "id, title, tldr, category, tags, source_url, site_name, hero_image_url, saved_at, status",
      )
      .in("id", citationIds);
    for (const row of data ?? []) {
      citationMemories[row.id] = {
        id: row.id,
        title: row.title,
        tldr: row.tldr,
        category: row.category,
        tags: row.tags ?? [],
        sourceUrl: row.source_url,
        siteName: row.site_name,
        heroImageUrl: row.hero_image_url,
        savedAt: row.saved_at,
        status: row.status,
      };
    }
  }

  return (
    <ChatPanel
      threadId={threadId}
      threads={threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt.toISOString(),
      }))}
      suggestions={suggestions}
      initialMessages={initialMessages}
      citationMemories={citationMemories}
      userEmail={user.email ?? ""}
      userAvatarUrl={avatarUrlOf(user.user_metadata)}
    />
  );
}
