/** Date and source-label helpers shared by every memory surface. */

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Today" / "3d ago" — the relative stamp on home_lyvora feed cards. */
export function formatRelativeDate(value: string | Date | null | undefined): string | null {
  const date = toDate(value);
  if (!date) return null;

  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 0) return formatAbsoluteDate(date);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/** "Oct 12, 2023" — the absolute stamp on search_lyvora result cards. */
export function formatAbsoluteDate(value: string | Date | null | undefined): string | null {
  const date = toDate(value);
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/** "Oct 7 — Oct 13, 2023" — the weekly report header range. */
export function formatDateRange(start: string, end: string): string {
  const from = parseCalendarDate(start);
  const to = parseCalendarDate(end);
  if (!from || !to) return `${start} — ${end}`;
  const left = from.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const right = to.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${left} — ${right}`;
}

/** Parse YYYY-MM-DD as a local calendar day (avoids UTC off-by-one). */
function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  return toDate(value);
}

/** The domain or site name shown next to a memory's category. */
export function sourceHint(memory: {
  siteName?: string | null;
  sourceUrl?: string | null;
  sourceType?: string | null;
}): string | null {
  if (memory.siteName) return memory.siteName;
  if (memory.sourceUrl && !memory.sourceUrl.startsWith("lyvora://")) {
    try {
      return new URL(memory.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }
  if (memory.sourceType) return memory.sourceType;
  return null;
}
