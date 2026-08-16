import { EmptyState } from "@/components/ui/empty-state";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md items-center justify-center px-md">
      <EmptyState
        className="w-full"
        icon="search"
        title="Not found"
        message="That memory or page isn't here — it may have been deleted, or the link is wrong."
        actionLabel="Back to home"
        actionHref="/home"
      />
    </div>
  );
}
