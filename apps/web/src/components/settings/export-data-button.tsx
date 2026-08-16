"use client";

import { useState } from "react";
import { Button, MaterialIcon } from "@lyvora/ui";

export function ExportDataButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not export your data.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `lyvora-export-${stamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export your data.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-xs">
      <Button
        type="button"
        variant="outline"
        shape="rounded"
        disabled={pending}
        onClick={() => void download()}
      >
        <MaterialIcon name="download" size={18} />
        {pending ? "Preparing…" : "Export my data"}
      </Button>
      {error && (
        <p role="alert" className="text-label-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
