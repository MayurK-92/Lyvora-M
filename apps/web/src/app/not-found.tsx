import { EmptyState } from "@/components/ui/empty-state";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-md">
      <EmptyState
        className="w-full max-w-md border-0 bg-transparent"
        icon="search"
        title="Page not found"
        message="Nothing lives at this URL."
        actionLabel="Go to Lyvora"
        actionHref="/home"
      />
    </div>
  );
}
