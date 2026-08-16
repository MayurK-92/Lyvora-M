import Link from "next/link";
import { AccentStripe, Chip, cn, surfaceVariants } from "@lyvora/ui";
import { getCategoryStyle } from "@/lib/categories";
import { formatRelativeDate } from "@/lib/format";

export interface MemoryCardData {
  id: string;
  title: string;
  tldr: string | null;
  category: string;
  tags: string[];
  status?: string;
  sourceUrl?: string | null;
  siteName?: string | null;
  sourceType?: string | null;
  heroImageUrl?: string | null;
  savedAt?: string;
}

/**
 * The signature feed card from home_lyvora (lines 38–56): category-coded stripe,
 * chip + relative date row, clamped title and summary, then a tag row.
 */
export function MemoryCard({
  memory,
  className,
}: {
  memory: MemoryCardData;
  className?: string;
}) {
  const style = getCategoryStyle(memory.category);
  const when = formatRelativeDate(memory.savedAt);
  const visibleTags = memory.tags.slice(0, 3);
  const extraTags = memory.tags.length - visibleTags.length;

  return (
    <Link
      href={`/memory/${memory.id}`}
      className={cn(
        surfaceVariants({ variant: "elevated", radius: "xl" }),
        "group flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <AccentStripe className={style.stripe} />
      <div className="ml-1 flex flex-1 flex-col justify-between p-lg">
        <div>
          <div className="mb-md flex items-center justify-between gap-sm">
            <Chip size="sm" icon={style.icon} className={style.chip}>
              {memory.category}
            </Chip>
            {when && (
              <span className="shrink-0 text-label-sm text-on-surface-variant">{when}</span>
            )}
          </div>

          <h3 className="mb-sm line-clamp-2 text-headline-md text-on-surface transition-colors group-hover:text-primary">
            {memory.title}
          </h3>

          {memory.tldr && (
            <p className="mb-lg line-clamp-3 text-body-md text-on-surface-variant">
              {memory.tldr}
            </p>
          )}
        </div>

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {visibleTags.map((tag) => (
              <span key={tag} className="text-label-sm text-on-surface-variant">
                #{tag.replace(/^#/, "")}
              </span>
            ))}
            {extraTags > 0 && <span className="text-label-sm text-outline">+{extraTags}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
