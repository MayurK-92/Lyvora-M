"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, MaterialIcon, cn } from "@lyvora/ui";

/**
 * Generates or refreshes the current week's digest via POST /api/reports/generate.
 */
export function GenerateReportButton({
  label = "Generate report",
  mode = "generate",
  className,
}: {
  label?: string;
  mode?: "generate" | "refresh";
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/reports/generate", { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not generate the report.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the report.");
    } finally {
      setPending(false);
    }
  }

  const idleIcon = mode === "refresh" ? "refresh" : "auto_awesome";
  const pendingLabel = mode === "refresh" ? "Refreshing…" : "Generating…";

  return (
    <div className={cn("flex flex-col items-stretch gap-xs", className)}>
      <Button
        type="button"
        variant={mode === "refresh" ? "soft" : "primary"}
        size="lg"
        disabled={pending}
        onClick={() => void run()}
      >
        <MaterialIcon
          name={pending ? "sync" : idleIcon}
          className={pending ? "animate-spin" : undefined}
        />
        {pending ? pendingLabel : label}
      </Button>
      {error && (
        <p role="alert" className="text-label-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
