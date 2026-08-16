import Link from "next/link";
import { AccentStripe, Chip, cn, surfaceVariants } from "@lyvora/ui";
import { getCategoryStyle } from "@/lib/categories";
import { formatAbsoluteDate } from "@/lib/format";
import { HighlightedText } from "./highlighted-text";
import type { MemoryCardData } from "./memory-card";

/**
 * search_lyvora result card (lines 84–146). A memory with a hero image gets the
 * wide `md:col-span-2` treatment with the image beside the text, matching the
 * "Macro Tracking" card in the design.
 */
export function SearchResultCard({
  memory,
  query,
  className,
}: {
  memory: MemoryCardData;
  query?: string;
  className?: string;
}) {
  const style = getCategoryStyle(memory.category);
  const when = formatAbsoluteDate(memory.savedAt);
  const wide = Boolean(memory.heroImageUrl);

  const header = (
    <div className="flex items-start justify-between gap-sm">
      <Chip icon={style.icon} className={style.chip}>
        {memory.category}
      </Chip>
      {when && (
        <span className="shrink-0 text-label-sm text-on-surface-variant">{when}</span>
      )}
    </div>
  );

  const body = (
    <div className="flex flex-col gap-xs">
      <h3 className="line-clamp-1 text-headline-md text-on-surface">
        <HighlightedText text={memory.title} query={query} />
      </h3>
      {memory.tldr && (
        <p className={cn("text-body-md text-on-surface-variant", wide ? "" : "line-clamp-3")}>
          <HighlightedText text={memory.tldr} query={query} />
        </p>
      )}
    </div>
  );

  const tags =
    memory.tags.length > 0 ? (
      <div className="flex gap-xs">
        {memory.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-label-sm text-outline">
            #{tag.replace(/^#/, "")}
          </span>
        ))}
      </div>
    ) : null;

  return (
    <Link
      href={`/memory/${memory.id}`}
      className={cn(
        surfaceVariants({ variant: "outlined", radius: "xl" }),
        "group flex flex-col gap-md p-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        wide && "md:col-span-2",
        className,
      )}
    >
      <AccentStripe className={style.stripe} />

      {wide ? (
        <div className="flex flex-col gap-md sm:flex-row">
          <div
            aria-hidden="true"
            className="h-48 w-full shrink-0 rounded-lg bg-surface-container bg-cover bg-center sm:w-48"
            style={{ backgroundImage: `url('${memory.heroImageUrl}')` }}
          />
          <div className="flex flex-1 flex-col gap-sm">
            {header}
            {body}
            {tags && <div className="mt-auto pt-sm">{tags}</div>}
          </div>
        </div>
      ) : (
        <>
          {header}
          {body}
          {tags && <div className="mt-auto pt-md">{tags}</div>}
        </>
      )}
    </Link>
  );
}
