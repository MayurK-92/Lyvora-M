"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md items-center justify-center px-md">
      <EmptyState
        className="w-full"
        icon="error"
        title="Something went wrong"
        message="This page failed to load. Retrying usually fixes it."
        actionLabel="Try again"
        onAction={reset}
      />
    </div>
  );
}
