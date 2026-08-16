import { Skeleton } from "@lyvora/ui";
import { PageContainer } from "@/components/layout/page-container";

function CardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-lg shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <span className="absolute inset-y-0 left-0 w-1 bg-outline-variant/30" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="mt-md h-6 w-4/5" />
      <Skeleton className="mt-sm h-4 w-full" />
      <Skeleton className="mt-xs h-4 w-2/3" />
    </div>
  );
}

/**
 * Route-level loading placeholder shaped like the design's page header plus a
 * responsive card grid, so the layout does not shift once data arrives.
 */
export function PageSkeleton({
  cards = 6,
  columns = 3,
}: {
  cards?: number;
  columns?: 2 | 3;
}) {
  return (
    <PageContainer>
      <div role="status" aria-label="Loading" className="space-y-xl">
        <header className="space-y-sm pt-lg">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </header>
        <div
          className={
            columns === 2
              ? "grid grid-cols-1 gap-lg md:grid-cols-2"
              : "grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-3"
          }
        >
          {Array.from({ length: cards }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
