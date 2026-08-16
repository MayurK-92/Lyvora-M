"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@lyvora/ui";
import { updateDisplayNameAction } from "@/app/(app)/settings/actions";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [value, setValue] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dirty = value.trim() !== initialName.trim();

  return (
    <div>
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await updateDisplayNameAction(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save the name.");
          }
        });
      }}
      className="flex flex-col gap-sm sm:flex-row sm:items-end"
    >
      <label className="min-w-0 flex-1">
        <span className="mb-xs block text-label-sm font-normal text-on-surface-variant">
          Display name
        </span>
        <Input
          name="displayName"
          value={value}
          maxLength={80}
          autoComplete="name"
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <Button
        type="submit"
        variant="outline"
        shape="rounded"
        disabled={!dirty || pending}
      >
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
    {error ? (
      <p role="alert" className="mt-xs text-label-sm text-error">
        {error}
      </p>
    ) : null}
    </div>
  );
}
