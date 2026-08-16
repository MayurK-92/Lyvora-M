import { Skeleton } from "@lyvora/ui";

export function ChatPanelSkeleton() {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] w-full overflow-hidden"
      role="status"
      aria-label="Loading chat"
    >
      <div className="hidden w-80 shrink-0 flex-col gap-lg border-r border-outline-variant/30 bg-surface-container-lowest p-lg lg:flex">
        <Skeleton className="h-10 rounded-full" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <div className="flex flex-1 flex-col gap-lg bg-surface-bright p-lg">
        <Skeleton className="ml-auto h-16 w-2/3 rounded-2xl" />
        <Skeleton className="h-32 w-4/5 rounded-2xl" />
        <Skeleton className="mt-auto h-16 w-full rounded-[2rem]" />
      </div>
    </div>
  );
}
