import Link from "next/link";
import { AccentStripe, MaterialIcon, cn, surfaceVariants } from "@lyvora/ui";
import { getCategoryStyle } from "@/lib/categories";

export interface CompactMemory {
  id: string;
  title: string;
  tldr?: string | null;
  category: string;
  heroImageUrl?: string | null;
}

/**
 * The small memory surface shared by three places in the design:
 * home_lyvora "Rediscover" tiles, chat_lyvora "Referenced Memories" citations,
 * and memory_detail_lyvora "Related Memories".
 */
export function CompactMemoryCard({
  memory,
  meta,
  variant = "tile",
  className,
}: {
  memory: CompactMemory;
  /** Context line under the title — "Read 6 months ago", "Personal Note • Oct 12", … */
  meta?: string | null;
  variant?: "tile" | "citation" | "related";
  className?: string;
}) {
  const style = getCategoryStyle(memory.category);

  if (variant === "citation") {
    return (
      <Link
        href={`/memory/${memory.id}`}
        className={cn(
          surfaceVariants({ variant: "filled", radius: "xl" }),
          "group/card flex items-start p-sm transition-transform hover:-translate-y-0.5 hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          className,
        )}
      >
        <AccentStripe className={style.stripe} />
        <div className="ml-2 min-w-0 flex-1">
          <h4 className="line-clamp-1 text-label-md text-on-surface transition-colors group-hover/card:text-primary">
            {memory.title}
          </h4>
          {meta && (
            <p className="mt-xs line-clamp-1 text-label-sm text-on-surface-variant">{meta}</p>
          )}
        </div>
      </Link>
    );
  }

  if (variant === "related") {
    return (
      <Link
        href={`/memory/${memory.id}`}
        className={cn(
          surfaceVariants({ variant: "lowest", radius: "xl" }),
          "group block p-md transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          className,
        )}
      >
        <AccentStripe className={style.stripe} />
        <div className="flex items-start gap-md pl-xs">
          {memory.heroImageUrl ? (
            <div
              aria-hidden="true"
              className="size-16 shrink-0 rounded-lg bg-surface-container bg-cover bg-center"
              style={{ backgroundImage: `url('${memory.heroImageUrl}')` }}
            />
          ) : (
            <div
              aria-hidden="true"
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-lg",
                style.tile,
              )}
            >
              <MaterialIcon name={style.icon} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-label-md text-on-surface transition-colors group-hover:text-primary">
              {memory.title}
            </h4>
            {memory.tldr && (
              <p className="mt-xs truncate text-label-sm text-on-surface-variant">
                {memory.tldr}
              </p>
            )}
            <span className="mt-xs inline-block rounded-full bg-surface-container px-2 py-0.5 text-[10px] uppercase tracking-wider text-on-surface-variant">
              {memory.category}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/memory/${memory.id}`}
      className={cn(
        "flex items-start gap-md rounded-xl bg-surface p-md shadow-sm transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-lg",
          style.tile,
        )}
      >
        <MaterialIcon name={style.icon} />
      </div>
      <div className="min-w-0">
        <h4 className="mb-xs line-clamp-1 text-label-md text-on-surface">{memory.title}</h4>
        {meta && <p className="text-label-sm text-on-surface-variant">{meta}</p>}
      </div>
    </Link>
  );
}
