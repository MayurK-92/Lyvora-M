"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button, IconButton, MaterialIcon, Skeleton, cn } from "@lyvora/ui";
import { SearchResultCard } from "@/components/memory/search-result-card";
import type { MemoryCardData } from "@/components/memory/memory-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import {
  DATE_RANGES,
  SearchFilters,
  type DateRange,
  type FacetBucket,
} from "./search-filters";

const PAGE_SIZE = 12;

interface SearchResponse {
  hits: Array<MemoryCardData & { contentType?: string; score?: number }>;
  facets: {
    categories: FacetBucket[];
    tags: FacetBucket[];
    contentTypes: FacetBucket[];
  };
  cleanedQuery?: string;
  mode?: string;
  error?: string;
}

const EMPTY_FACETS: SearchResponse["facets"] = {
  categories: [],
  tags: [],
  contentTypes: [],
};

function isoFor(range: DateRange | null): string | null {
  if (!range) return null;
  const days = DATE_RANGES.find((item) => item.value === range)?.days ?? 0;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function SearchPanel({
  initialBrowse,
  initialQuery = "",
}: {
  initialBrowse: MemoryCardData[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [typeahead, setTypeahead] = useState<MemoryCardData[]>([]);
  const [showTypeahead, setShowTypeahead] = useState(false);
  const [results, setResults] = useState<MemoryCardData[]>(initialBrowse);
  const [facets, setFacets] = useState(EMPTY_FACETS);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!debounced) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: debounced, mode: "instant", limit: 6 }),
        });
        const data = (await response.json()) as SearchResponse;
        if (!cancelled && response.ok) setTypeahead(data.hits ?? []);
      } catch {
        // Typeahead is best-effort; the full search still runs on submit.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  // Hits from the previous query stay in state until the next fetch resolves,
  // so they are dropped here rather than cleared in an effect.
  const suggestions = debounced ? typeahead : [];

  const runFullSearch = useCallback(
    (nextQuery: string, categories: string[], tags: string[], range: DateRange | null) => {
      const trimmed = nextQuery.trim();
      setSubmitted(trimmed);
      setShowTypeahead(false);
      setError(null);
      setVisible(PAGE_SIZE);

      if (!trimmed) {
        setResults(initialBrowse);
        setFacets(EMPTY_FACETS);
        return;
      }

      startTransition(async () => {
        try {
          const response = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              q: trimmed,
              mode: "full",
              categories: categories.length ? categories : undefined,
              tags: tags.length ? tags : undefined,
              from: isoFor(range),
              limit: 50,
            }),
          });
          const data = (await response.json()) as SearchResponse;
          if (!response.ok) throw new Error(data.error ?? "Search failed");
          setResults(data.hits ?? []);
          // Keep the facet rail stable while the user narrows down.
          setFacets((prev) =>
            categories.length || tags.length ? prev : (data.facets ?? EMPTY_FACETS),
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Search failed");
        }
      });
    },
    [initialBrowse],
  );

  const ranInitialQuery = useRef(false);
  useEffect(() => {
    if (!initialQuery || ranInitialQuery.current) return;
    ranInitialQuery.current = true;
    runFullSearch(initialQuery, [], [], null);
  }, [initialQuery, runFullSearch]);

  function toggle(value: string, list: string[]) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function handleCategoryToggle(value: string) {
    const next = toggle(value, selectedCategories);
    setSelectedCategories(next);
    runFullSearch(submitted || query, next, selectedTags, dateRange);
  }

  function handleTagToggle(value: string) {
    const next = toggle(value, selectedTags);
    setSelectedTags(next);
    runFullSearch(submitted || query, selectedCategories, next, dateRange);
  }

  function handleDateChange(value: DateRange | null) {
    setDateRange(value);
    runFullSearch(submitted || query, selectedCategories, selectedTags, value);
  }

  function clearAll() {
    setQuery("");
    setSelectedCategories([]);
    setSelectedTags([]);
    setDateRange(null);
    runFullSearch("", [], [], null);
  }

  const shown = results.slice(0, visible);
  const filterProps = {
    categories: facets.categories,
    tags: facets.tags.slice(0, 12),
    selectedCategories,
    selectedTags,
    dateRange,
    onToggleCategory: handleCategoryToggle,
    onToggleTag: handleTagToggle,
    onDateRangeChange: handleDateChange,
  };
  const hasFilters =
    facets.categories.length > 0 || facets.tags.length > 0 || Boolean(submitted);

  return (
    <div className="flex h-full w-full flex-col pb-xl">
      <section className="flex w-full justify-center px-md py-xl md:px-lg md:py-2xl">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            runFullSearch(query, selectedCategories, selectedTags, dateRange);
          }}
          className="relative flex w-full max-w-page items-center rounded-full bg-surface-container p-sm shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
        >
          <MaterialIcon name="search" className="ml-md text-headline-md text-outline" />
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShowTypeahead(true);
            }}
            onFocus={() => setShowTypeahead(true)}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setShowTypeahead(false), 150);
            }}
            aria-label="Search memories"
            placeholder="Find that healthy pasta recipe..."
            className="w-full border-none bg-transparent px-md py-md text-headline-md text-on-surface outline-none placeholder:text-outline-variant"
          />
          <Button type="submit" size="xl" disabled={pending} className="shrink-0 shadow-md">
            <span className="max-sm:sr-only">{pending ? "Searching…" : "Search"}</span>
            <MaterialIcon name="arrow_forward" size={18} />
          </Button>

          {showTypeahead && suggestions.length > 0 && query.trim() && (
            <ul
              role="listbox"
              aria-label="Suggestions"
              className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-auto rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-xs shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
            >
              {suggestions.map((hit) => (
                <li key={hit.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setQuery(hit.title);
                      runFullSearch(hit.title, selectedCategories, selectedTags, dateRange);
                    }}
                    className="block w-full rounded-lg px-md py-sm text-left transition-colors hover:bg-surface-container-high"
                  >
                    <span className="block text-label-md text-on-surface">{hit.title}</span>
                    {hit.tldr && (
                      <span className="mt-0.5 block line-clamp-1 text-label-sm font-normal text-on-surface-variant">
                        {hit.tldr}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      </section>

      <PageContainer className="flex flex-1 flex-col gap-lg py-0 lg:flex-row">
        {hasFilters && (
          <>
            <SearchFilters
              {...filterProps}
              className="sticky top-24 hidden h-max md:flex"
            />
            {filtersOpen && (
              <div className="md:hidden">
                <SearchFilters {...filterProps} />
              </div>
            )}
          </>
        )}

        <div className="flex flex-1 flex-col gap-lg">
          <div className="flex items-center justify-between gap-md">
            <h1 className="text-headline-md text-on-surface">
              {submitted ? "Search Results" : "Recent & pinned"}
            </h1>
            <div className="flex items-center gap-sm">
              <span className="text-label-md text-on-surface-variant">
                {pending ? "Searching…" : `Showing ${results.length} matches`}
              </span>
              {hasFilters && (
                <IconButton
                  icon="tune"
                  label={filtersOpen ? "Hide filters" : "Show filters"}
                  size="sm"
                  variant="soft"
                  className="md:hidden"
                  onClick={() => setFiltersOpen((open) => !open)}
                />
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-body-md text-error">
              {error}
            </p>
          )}

          {pending && results.length === 0 ? (
            <div className="grid auto-rows-max grid-cols-1 gap-md md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            submitted ? (
              <EmptyState
                icon="search"
                title="No matches"
                message="Try fewer words, or clear the filters to widen the search."
                actionLabel="Clear search"
                onAction={clearAll}
              />
            ) : (
              <EmptyState
                icon="memory"
                title="Nothing to browse yet"
                message="Save a link, note, PDF, or image and it will show up here."
                actionLabel="Go to Home"
                actionHref="/home"
              />
            )
          ) : (
            <div
              className={cn(
                "grid auto-rows-max grid-cols-1 gap-md md:grid-cols-2",
                pending && "opacity-60 transition-opacity",
              )}
            >
              {shown.map((memory) => (
                <SearchResultCard
                  key={memory.id}
                  memory={memory}
                  query={submitted || undefined}
                />
              ))}
            </div>
          )}

          {visible < results.length && (
            <div className="flex w-full justify-center pt-md">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setVisible((count) => count + PAGE_SIZE)}
              >
                Load More Results
              </Button>
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
