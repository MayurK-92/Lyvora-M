"use client";

import { useState, useTransition } from "react";
import { Button } from "@lyvora/ui";
import { updateTimezoneAction } from "@/app/(app)/settings/actions";
import { TIMEZONES, timezoneLabel } from "@/lib/timezones";

export function TimezoneForm({ initialTimezone }: { initialTimezone: string }) {
  const [value, setValue] = useState(initialTimezone);
  const [pending, startTransition] = useTransition();
  const dirty = value !== initialTimezone;

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await updateTimezoneAction(formData);
        });
      }}
      className="flex flex-col gap-sm sm:flex-row sm:items-end"
    >
      <label className="min-w-0 flex-1">
        <span className="mb-xs block text-label-sm font-normal text-on-surface-variant">
          Timezone
        </span>
        <select
          name="timezone"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="flex h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md text-body-md text-on-surface outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          {!TIMEZONES.includes(value as (typeof TIMEZONES)[number]) && (
            <option value={value}>{value}</option>
          )}
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {timezoneLabel(zone)}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="submit"
        variant="outline"
        shape="rounded"
        disabled={!dirty || pending}
      >
        {pending ? "Updating report…" : "Save"}
      </Button>
    </form>
  );
}
