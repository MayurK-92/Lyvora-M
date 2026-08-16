"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MaterialIcon, cn } from "@lyvora/ui";
import {
  getVote,
  setVote,
  subscribeToVotes,
  type MessageVote,
} from "@/lib/message-votes";

/**
 * chat_lyvora's action row. Lyvora has no server-side feedback store, so the
 * rating is remembered locally per message rather than silently discarded.
 */
export function MessageActions({
  messageId,
  text,
}: {
  messageId: string;
  text: string;
}) {
  const vote = useSyncExternalStore(
    subscribeToVotes,
    () => getVote(messageId),
    () => null,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function castVote(next: MessageVote) {
    setVote(messageId, vote === next ? null : next);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex gap-sm pl-sm">
      <button
        type="button"
        title="Thumbs Up"
        aria-label="Helpful"
        aria-pressed={vote === "up"}
        onClick={() => castVote("up")}
        className={cn(
          "rounded-full p-xs transition-colors outline-none hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40",
          vote === "up" ? "text-primary" : "text-on-surface-variant",
        )}
      >
        <MaterialIcon name="thumb_up" size={18} filled={vote === "up"} />
      </button>
      <button
        type="button"
        title="Thumbs Down"
        aria-label="Not helpful"
        aria-pressed={vote === "down"}
        onClick={() => castVote("down")}
        className={cn(
          "rounded-full p-xs transition-colors outline-none hover:bg-error/10 hover:text-error focus-visible:ring-2 focus-visible:ring-primary/40",
          vote === "down" ? "text-error" : "text-on-surface-variant",
        )}
      >
        <MaterialIcon name="thumb_down" size={18} filled={vote === "down"} />
      </button>
      <button
        type="button"
        title={copied ? "Copied" : "Copy"}
        aria-label={copied ? "Copied to clipboard" : "Copy answer"}
        onClick={copy}
        className="rounded-full p-xs text-on-surface-variant transition-colors outline-none hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <MaterialIcon name={copied ? "done" : "content_copy"} size={18} />
      </button>
    </div>
  );
}
