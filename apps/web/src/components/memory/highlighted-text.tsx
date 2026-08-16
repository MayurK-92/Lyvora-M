import { Fragment } from "react";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wraps query matches in the `<mark>` treatment search_lyvora applies to result
 * snippets. Operates on text nodes only — never on raw HTML.
 */
export function HighlightedText({
  text,
  query,
}: {
  text: string;
  query?: string | null;
}) {
  const terms = (query ?? "")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

  if (terms.length === 0) return <>{text}</>;

  // String.split with one capture group puts the matched delimiters at odd indices.
  const parts = text.split(new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-primary/20 px-1 font-semibold text-on-surface"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={`${part}-${index}`}>{part}</Fragment>
        ),
      )}
    </>
  );
}
