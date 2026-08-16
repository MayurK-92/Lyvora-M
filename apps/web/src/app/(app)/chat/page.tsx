import dynamic from "next/dynamic";
import { listChatSuggestions, listThreads } from "@lyvora/core";
import { requireUser } from "@/lib/auth/session";
import { ChatPanelSkeleton } from "@/components/chat/chat-panel-skeleton";
import { avatarUrlOf } from "@/lib/user";

const ChatPanel = dynamic(
  () => import("@/components/chat/chat-panel").then((mod) => mod.ChatPanel),
  { loading: () => <ChatPanelSkeleton /> },
);

export default async function ChatIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; draft?: string }>;
}) {
  const { q, draft } = await searchParams;
  const user = await requireUser();
  const [threads, suggestions] = await Promise.all([
    listThreads(user.id, 40),
    listChatSuggestions(user.id, 4),
  ]);

  return (
    <ChatPanel
      initialPrompt={q ?? null}
      initialDraft={draft ?? null}
      threadId={null}
      threads={threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt.toISOString(),
      }))}
      suggestions={suggestions}
      initialMessages={[]}
      citationMemories={{}}
      userEmail={user.email ?? ""}
      userAvatarUrl={avatarUrlOf(user.user_metadata)}
    />
  );
}
