"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Avatar, Button, Dialog, IconButton, MaterialIcon, Skeleton, cn } from "@lyvora/ui";
import { CompactMemoryCard } from "@/components/memory/compact-memory-card";
import type { MemoryCardData } from "@/components/memory/memory-card";
import {
  extractCitationsFromText,
  stripCitationMarkers,
} from "@/lib/chat-citations";
import { formatAbsoluteDate } from "@/lib/format";
import { sourceHint } from "@/lib/format";
import { ChatComposer } from "./chat-composer";
import { ChatMarkdown } from "./chat-markdown";
import { ChatSidebar, type ThreadListItem } from "./chat-sidebar";
import { MessageActions } from "./message-actions";

export type { ThreadListItem };

function shortThreadTitle(title: string | null | undefined, max = 48) {
  const value = (title ?? "Untitled chat").trim() || "Untitled chat";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function messageText(message: UIMessage): string {
  return (message.parts ?? [])
    .map((part) => (part.type === "text" && "text" in part ? String(part.text) : ""))
    .join("");
}

function citationIdsFromMessage(message: UIMessage): string[] {
  return extractCitationsFromText(messageText(message));
}

/** Hide raw citation markers in the visible answer. */
function displayText(text: string): string {
  return stripCitationMarkers(text);
}

async function fetchMemoryCards(ids: string[]): Promise<Record<string, MemoryCardData>> {
  if (!ids.length) return {};
  const response = await fetch(`/api/memories?ids=${ids.join(",")}`);
  if (!response.ok) return {};
  const data = (await response.json()) as { memories?: MemoryCardData[] };
  const map: Record<string, MemoryCardData> = {};
  for (const memory of data.memories ?? []) {
    map[memory.id.toLowerCase()] = memory;
  }
  return map;
}

export function ChatPanel({
  threadId,
  threads,
  suggestions = [],
  initialMessages,
  citationMemories,
  userEmail,
  userAvatarUrl,
  initialPrompt = null,
  initialDraft = null,
}: {
  threadId: string | null;
  threads: ThreadListItem[];
  /** Personalized prompts from the user's saved links (server-built). */
  suggestions?: string[];
  initialMessages: UIMessage[];
  citationMemories: Record<string, MemoryCardData>;
  userEmail: string;
  userAvatarUrl: string | null;
  /** Question handed over from another page (e.g. the memory detail ask bar). Auto-sends. */
  initialPrompt?: string | null;
  /** Prefill the composer without sending — user can edit first. */
  initialDraft?: string | null;
}) {
  const router = useRouter();
  const [input, setInput] = useState(() => initialDraft?.trim() ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threadList, setThreadList] = useState(threads);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ThreadListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const removedThreadIds = useRef(new Set<string>());

  useEffect(() => {
    setThreadList(threads.filter((thread) => !removedThreadIds.current.has(thread.id)));
  }, [threads]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [memoryCache, setMemoryCache] = useState<Record<string, MemoryCardData>>(() => {
    const initial: Record<string, MemoryCardData> = {};
    for (const [id, memory] of Object.entries(citationMemories)) {
      initial[id.toLowerCase()] = memory;
    }
    return initial;
  });
  const hydratingRef = useRef<Set<string>>(new Set());
  const cacheKeysRef = useRef<Set<string>>(new Set(Object.keys(memoryCache)));

  useEffect(() => {
    setMemoryCache((prev) => {
      const next = { ...prev };
      for (const [id, memory] of Object.entries(citationMemories)) {
        next[id.toLowerCase()] = memory;
      }
      cacheKeysRef.current = new Set(Object.keys(next));
      return next;
    });
  }, [citationMemories]);

  const hydrateCitations = useCallback(async (ids: string[]) => {
    const missing = ids.filter(
      (id) => !cacheKeysRef.current.has(id) && !hydratingRef.current.has(id),
    );
    if (!missing.length) return;
    for (const id of missing) hydratingRef.current.add(id);
    try {
      const fetched = await fetchMemoryCards(missing);
      setMemoryCache((prev) => {
        const next = { ...prev, ...fetched };
        cacheKeysRef.current = new Set(Object.keys(next));
        return next;
      });
    } finally {
      for (const id of missing) hydratingRef.current.delete(id);
    }
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          const createdThreadId = response.headers.get("X-Thread-Id");
          if (
            createdThreadId &&
            (!threadId || createdThreadId !== threadId) &&
            typeof window !== "undefined"
          ) {
            window.sessionStorage.setItem("lyvora:last-thread", createdThreadId);
          }
          return response;
        },
        prepareSendMessagesRequest: ({ messages, body, id, trigger }) => ({
          body: { ...body, threadId, messages, id, trigger },
        }),
      }),
    [threadId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId ?? "new",
    messages: initialMessages,
    transport,
    onFinish: async ({ message }) => {
      await hydrateCitations(citationIdsFromMessage(message));
      const created =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("lyvora:last-thread")
          : null;
      if (created && created !== threadId) {
        window.sessionStorage.removeItem("lyvora:last-thread");
        router.replace(`/chat/${created}`);
        return;
      }
      router.refresh();
    },
  });

  // Hydrate citation cards as soon as [memory:…] appears (including mid-stream).
  useEffect(() => {
    const ids = [
      ...new Set(messages.flatMap((message) => citationIdsFromMessage(message))),
    ];
    void hydrateCitations(ids);
  }, [messages, hydrateCitations]);

  const busy = status === "submitted" || status === "streaming";

  const sentInitialPrompt = useRef(false);
  useEffect(() => {
    if (!initialPrompt || sentInitialPrompt.current || messages.length > 0) return;
    sentInitialPrompt.current = true;
    void sendMessage({ text: initialPrompt });
  }, [initialPrompt, messages.length, sendMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text });
  }

  function askPrompt(prompt: string) {
    if (busy) return;
    setSidebarOpen(false);
    setInput("");
    void sendMessage({ text: prompt });
  }

  function requestDeleteThread(id: string) {
    if (deletingId) return;
    const thread = threadList.find((item) => item.id === id);
    if (!thread) return;
    setDeleteError(null);
    setPendingDelete(thread);
  }

  async function confirmDeleteThread() {
    if (!pendingDelete || deletingId) return;
    const id = pendingDelete.id;

    setDeletingId(id);
    setPendingDelete(null);
    removedThreadIds.current.add(id);
    setThreadList((current) => current.filter((item) => item.id !== id));

    try {
      const response = await fetch(`/api/chat/threads/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error("Failed to delete");
      }
      if (threadId === id) {
        router.push("/chat");
      } else {
        router.refresh();
      }
    } catch {
      removedThreadIds.current.delete(id);
      setThreadList(threads.filter((item) => !removedThreadIds.current.has(item.id)));
      setDeleteError("Could not delete that conversation. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden bg-surface">
        <ChatSidebar
          threads={threadList}
          activeThreadId={threadId}
          suggestions={suggestions.slice(0, 2)}
          onNewChat={() => {
            setSidebarOpen(false);
            router.push("/chat");
          }}
          onSuggestion={askPrompt}
          onDeleteThread={deletingId ? undefined : requestDeleteThread}
          className="hidden lg:flex"
        />

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              aria-hidden="true"
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
            />
            <ChatSidebar
              threads={threadList}
              activeThreadId={threadId}
              suggestions={suggestions.slice(0, 2)}
              onNewChat={() => {
                setSidebarOpen(false);
                router.push("/chat");
              }}
              onSuggestion={askPrompt}
              onDeleteThread={deletingId ? undefined : requestDeleteThread}
              className="animate-page-enter relative h-full max-w-[85vw] shadow-[0_0_40px_rgba(0,0,0,0.12)]"
            />
          </div>
        )}

        <main className="relative flex flex-1 flex-col bg-surface-bright">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden opacity-30"
          >
            <div className="absolute -right-[10%] -top-[20%] size-[600px] rounded-full bg-primary-fixed-dim blur-[100px]" />
            <div className="absolute -left-[20%] bottom-[10%] size-[500px] rounded-full bg-secondary-fixed-dim blur-[120px]" />
          </div>

          <div className="relative z-10 flex items-center gap-sm px-lg pt-lg lg:hidden">
            <IconButton
              icon="menu"
              label="Show conversations"
              size="sm"
              variant="soft"
              onClick={() => setSidebarOpen(true)}
            />
            <h1 className="text-headline-md text-on-surface">Chat</h1>
          </div>

          <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto scroll-smooth p-lg">
            <div className="mx-auto max-w-3xl space-y-xl pb-[10rem]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-md py-2xl text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary text-on-primary">
                    <MaterialIcon name="smart_toy" />
                  </span>
                  <h2 className="text-headline-md text-on-surface">
                    Ask anything you&apos;ve saved
                  </h2>
                  <p className="max-w-md text-body-md text-on-surface-variant">
                    Answers stay grounded in your own memories, with citations back to the
                    source.
                  </p>
                  {suggestions.length > 0 && (
                    <div className="mt-md grid w-full max-w-lg grid-cols-1 gap-sm sm:grid-cols-2">
                      {suggestions.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => askPrompt(prompt)}
                          className="rounded-xl bg-surface-container-low p-md text-left text-body-md text-on-surface transition-colors outline-none hover:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          &ldquo;{prompt}&rdquo;
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center">
                  <span className="rounded-full bg-surface-container-low px-md py-xs text-label-sm text-on-surface-variant">
                    {formatAbsoluteDate(new Date()) ?? "Today"}
                  </span>
                </div>
              )}

              {messages.map((message) => {
                const text = messageText(message);
                const cites = citationIdsFromMessage(message);

                if (message.role === "user") {
                  return (
                    <div key={message.id} className="group flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary-container p-md text-on-primary-container shadow-sm">
                        <p className="whitespace-pre-wrap text-body-md">{text}</p>
                      </div>
                      <div className="ml-sm opacity-0 transition-opacity group-hover:opacity-100">
                        <Avatar src={userAvatarUrl} name={userEmail || "You"} size={32} />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={message.id} className="group flex justify-start">
                    <span className="mr-sm mt-sm flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                      <MaterialIcon name="smart_toy" size={18} />
                    </span>
                    <div className="max-w-[85%] space-y-md">
                      <div className="rounded-2xl rounded-tl-sm bg-surface-container-lowest p-md text-on-surface shadow-[0_4px_20px_rgba(0,0,0,0.04)] ring-1 ring-outline-variant/20">
                        <ChatMarkdown>{displayText(text)}</ChatMarkdown>

                        {cites.length > 0 && (
                          <div className="mt-md border-t border-outline-variant/30 pt-md">
                            <span className="mb-sm flex items-center gap-xs text-label-sm text-on-surface-variant">
                              <MaterialIcon name="library_books" size={14} />
                              Referenced Memories
                            </span>
                            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                              {cites.map((id) => {
                                const memory = memoryCache[id];
                                if (!memory) {
                                  return <Skeleton key={id} className="h-16 rounded-xl" />;
                                }
                                const hint = sourceHint(memory);
                                const when = formatAbsoluteDate(memory.savedAt);
                                return (
                                  <CompactMemoryCard
                                    key={id}
                                    variant="citation"
                                    memory={memory}
                                    meta={[hint, when].filter(Boolean).join(" • ")}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {text.trim() && (
                        <MessageActions messageId={message.id} text={displayText(text)} />
                      )}
                    </div>
                  </div>
                );
              })}

              {busy && (
                <div className="flex justify-start" aria-live="polite">
                  <span className="mr-sm mt-sm flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                    <MaterialIcon name="smart_toy" size={18} />
                  </span>
                  <div className="flex h-12 w-48 flex-col justify-center gap-sm rounded-2xl rounded-tl-sm bg-surface-container-lowest p-md shadow-sm">
                    <span className="animate-pulse text-label-sm text-primary">
                      Searching memory graph...
                    </span>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-variant">
                      <div className="h-full w-1/2 animate-[progress_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className={cn(
                    "mx-auto max-w-3xl rounded-xl border border-error/30 bg-error-container px-md py-sm",
                    "text-body-md text-on-error-container",
                  )}
                >
                  {error.message}
                </p>
              )}
            </div>
          </div>

          <ChatComposer
            value={input}
            onChange={setInput}
            onSubmit={submit}
            disabled={busy}
          />
        </main>
      </div>

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete conversation?"
        description="This permanently removes the thread and all of its messages."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeleteThread()}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="break-words rounded-xl bg-surface-container-low px-3 py-2 text-label-md text-on-surface">
          {shortThreadTitle(pendingDelete?.title, 72)}
        </p>
      </Dialog>

      <Dialog
        open={Boolean(deleteError)}
        onClose={() => setDeleteError(null)}
        title="Couldn’t delete"
        description={deleteError ?? "Check your connection and try again."}
        footer={
          <Button type="button" onClick={() => setDeleteError(null)}>
            OK
          </Button>
        }
      />
    </div>
  );
}
