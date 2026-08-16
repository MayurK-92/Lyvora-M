export type MessageVote = "up" | "down";

const STORAGE_KEY = "lyvora.chat.votes.v1";
const listeners = new Set<() => void>();

let cache: Record<string, MessageVote> | null = null;

function load(): Record<string, MessageVote> {
  if (cache) return cache;
  try {
    cache = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      MessageVote
    >;
  } catch {
    cache = {};
  }
  return cache;
}

export function subscribeToVotes(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVote(messageId: string): MessageVote | null {
  return load()[messageId] ?? null;
}

export function setVote(messageId: string, vote: MessageVote | null) {
  const next = { ...load() };
  if (vote) next[messageId] = vote;
  else delete next[messageId];
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Rating is a convenience; storage failures shouldn't surface an error.
  }
  for (const listener of listeners) listener();
}
