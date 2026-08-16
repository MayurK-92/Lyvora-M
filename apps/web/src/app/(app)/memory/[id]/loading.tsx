import { Skeleton } from "@lyvora/ui";
import { PageContainer } from "@/components/layout/page-container";

export default function MemoryDetailLoading() {
  return (
    <PageContainer className="max-w-3xl">
      <div role="status" aria-label="Loading memory" className="space-y-lg pt-lg">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <div className="space-y-sm">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </PageContainer>
  );
}
