"use client";

import { ChipButton, cn } from "@lyvora/ui";
import { EyebrowLabel } from "@/components/layout/section-heading";

export interface FacetBucket {
  value: string;
  count: number;
}

export const DATE_RANGES = [
  { value: "week", label: "Past Week", days: 7 },
  { value: "month", label: "Past Month", days: 30 },
  { value: "year", label: "Past Year", days: 365 },
] as const;

export type DateRange = (typeof DATE_RANGES)[number]["value"];

/** The design's "radio dot + label" filter row (search_lyvora lines 19–24). */
function DotOption({
  label,
  count,
  selected,
  onToggle,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={selected}
        onClick={onToggle}
        className="group flex w-full cursor-pointer items-center gap-sm rounded-lg py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
            selected
              ? "border-primary bg-primary"
              : "border-outline group-hover:border-primary",
          )}
        >
          {selected && <span className="size-1.5 rounded-full bg-on-primary" />}
        </span>
        <span className="flex-1 text-body-md text-on-surface">{label}</span>
        {typeof count === "number" && (
          <span className="text-label-sm text-on-surface-variant">{count}</span>
        )}
      </button>
    </li>
  );
}

export function SearchFilters({
  categories,
  tags,
  selectedCategories,
  selectedTags,
  dateRange,
  onToggleCategory,
  onToggleTag,
  onDateRangeChange,
  className,
}: {
  categories: FacetBucket[];
  tags: FacetBucket[];
  selectedCategories: string[];
  selectedTags: string[];
  dateRange: DateRange | null;
  onToggleCategory: (value: string) => void;
  onToggleTag: (value: string) => void;
  onDateRangeChange: (value: DateRange | null) => void;
  className?: string;
}) {
  return (
    <aside
      aria-label="Filters"
      className={cn("flex w-full shrink-0 flex-col gap-xl pb-lg lg:w-64", className)}
    >
      {categories.length > 0 && (
        <div className="flex flex-col gap-sm">
          <EyebrowLabel>Categories</EyebrowLabel>
          <ul className="flex flex-col gap-xs">
            {categories.map((bucket) => (
              <DotOption
                key={bucket.value}
                label={bucket.value}
                count={bucket.count}
                selected={selectedCategories.includes(bucket.value)}
                onToggle={() => onToggleCategory(bucket.value)}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-sm">
        <EyebrowLabel>Date</EyebrowLabel>
        <ul className="flex flex-col gap-xs">
          {DATE_RANGES.map((range) => (
            <DotOption
              key={range.value}
              label={range.label}
              selected={dateRange === range.value}
              onToggle={() =>
                onDateRangeChange(dateRange === range.value ? null : range.value)
              }
            />
          ))}
        </ul>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-col gap-sm">
          <EyebrowLabel>Tags</EyebrowLabel>
          <div className="flex flex-wrap gap-xs">
            {tags.map((bucket) => {
              const selected = selectedTags.includes(bucket.value);
              return (
                <ChipButton
                  key={bucket.value}
                  aria-pressed={selected}
                  onClick={() => onToggleTag(bucket.value)}
                  className={cn(
                    "transition-colors",
                    selected
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-surface-container-high text-on-surface hover:bg-secondary-container hover:text-on-secondary-container",
                  )}
                >
                  #{bucket.value.replace(/^#/, "")}
                </ChipButton>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
