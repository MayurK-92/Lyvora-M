"use client";

import Link from "next/link";
import { IconButton, MaterialIcon, cn } from "@lyvora/ui";
import { formatRelativeDate } from "@/lib/format";

export interface ThreadListItem {
  id: string;
  title: string | null;
  createdAt: string;
}

/** Accent rail colours for the suggestion tiles, per chat_lyvora lines 20–27. */
const SUGGESTION_ACCENTS = ["bg-secondary", "bg-tertiary", "bg-primary", "bg-error"];

export function ChatSidebar({
  threads,
  activeThreadId,
  suggestions,
  onNewChat,
  onSuggestion,
  onDeleteThread,
  className,
}: {
  threads: ThreadListItem[];
  activeThreadId: string | null;
  suggestions: string[];
  onNewChat: () => void;
  onSuggestion: (prompt: string) => void;
  onDeleteThread?: (threadId: string) => void;
  className?: string;
}) {
  return (
    <aside
      aria-label="Conversations"
      className={cn(
        "flex w-full shrink-0 flex-col overflow-y-auto border-outline-variant/30 bg-surface-container-lowest lg:w-80 lg:border-r",
        className,
      )}
    >
      <div className="space-y-xl p-lg">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-sm rounded-full bg-primary px-md py-sm text-label-md text-on-primary shadow-sm transition-colors outline-none hover:bg-primary-container hover:text-on-primary-container focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <MaterialIcon name="add" size={20} />
          New Conversation
        </button>

        {suggestions.length > 0 && (
          <div>
            <h3 className="mb-md flex items-center gap-xs text-label-sm uppercase tracking-wider text-on-surface-variant">
              <MaterialIcon name="lightbulb" size={16} />
              Suggestions
            </h3>
            <div className="grid grid-cols-1 gap-sm">
              {suggestions.map((prompt, index) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSuggestion(prompt)}
                  className="group relative overflow-hidden rounded-xl bg-surface-container-low p-md text-left transition-colors outline-none hover:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-0 right-0 w-1 opacity-0 transition-opacity group-hover:opacity-100",
                      SUGGESTION_ACCENTS[index % SUGGESTION_ACCENTS.length],
                    )}
                  />
                  <p className="line-clamp-2 text-body-md text-on-surface">
                    &ldquo;{prompt}&rdquo;
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-md flex items-center gap-xs text-label-sm uppercase tracking-wider text-on-surface-variant">
            <MaterialIcon name="history" size={16} />
            Recent Threads
          </h3>
          {threads.length === 0 ? (
            <p className="px-md text-label-sm text-on-surface-variant">
              No conversations yet.
            </p>
          ) : (
            <ul className="space-y-xs">
              {threads.map((thread) => {
                const active = thread.id === activeThreadId;
                return (
                  <li key={thread.id} className="group/thread relative">
                    <Link
                      href={`/chat/${thread.id}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex flex-col rounded-lg py-sm pr-10 pl-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        active
                          ? "bg-secondary-container text-on-secondary-container"
                          : "hover:bg-surface-container",
                      )}
                    >
                      <span
                        className={cn(
                          "truncate text-label-md",
                          active ? "font-bold" : "text-on-surface",
                        )}
                      >
                        {thread.title || "Untitled chat"}
                      </span>
                      <span
                        className={cn(
                          "text-label-sm font-normal",
                          active ? "text-on-secondary-container" : "text-on-surface-variant",
                        )}
                      >
                        {formatRelativeDate(thread.createdAt)}
                      </span>
                    </Link>
                    {onDeleteThread && (
                      <div className="absolute top-1/2 right-1 -translate-y-1/2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/thread:opacity-100 sm:group-focus-within/thread:opacity-100">
                        <IconButton
                          icon="delete"
                          label={`Delete ${thread.title || "conversation"}`}
                          size="sm"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onDeleteThread(thread.id);
                          }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
