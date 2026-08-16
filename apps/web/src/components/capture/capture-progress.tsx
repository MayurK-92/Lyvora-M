"use client";

import { AccentStripe, MaterialIcon, ProgressBar, cn, surfaceVariants } from "@lyvora/ui";
import type { CapturePipelineStatus } from "./capture-bar";

const STAGES: Array<{
  status: CapturePipelineStatus;
  label: string;
  percent: number;
}> = [
  { status: "queued", label: "Queued", percent: 12 },
  { status: "fetching", label: "Fetching content", percent: 35 },
  { status: "extracting", label: "Extracting text", percent: 58 },
  { status: "enriching", label: "Understanding with AI", percent: 82 },
  { status: "embedding", label: "Indexing", percent: 92 },
  { status: "done", label: "Saved", percent: 100 },
  { status: "duplicate", label: "Already saved", percent: 100 },
  { status: "failed", label: "Failed", percent: 100 },
];

function stageFor(status: CapturePipelineStatus) {
  return STAGES.find((stage) => stage.status === status) ?? STAGES[0]!;
}

/**
 * The "Processing" variant of the feed card (home_lyvora lines 21–36): spinning
 * sync glyph, pulsing placeholder copy, and a slim primary progress track.
 */
export function CaptureProgressCard({
  url,
  status,
  lastError,
  className,
}: {
  url: string;
  status: CapturePipelineStatus;
  lastError?: string | null;
  className?: string;
}) {
  const stage = stageFor(status);
  const failed = status === "failed";
  const complete = status === "done" || status === "duplicate";

  return (
    <article
      role="status"
      aria-live="polite"
      aria-busy={!complete && !failed}
      className={cn(
        surfaceVariants({ variant: "elevated", radius: "xl" }),
        "flex flex-col",
        complete && "animate-capture-done",
        className,
      )}
    >
      <AccentStripe
        className={failed ? "bg-error" : complete ? "bg-primary" : "bg-outline-variant/30"}
      />

      <div className="ml-1 flex flex-1 flex-col justify-between p-lg">
        <div>
          <div className="mb-md flex items-center gap-sm">
            <MaterialIcon
              name={failed ? "error" : complete ? "check_circle" : "sync"}
              className={cn(
                failed ? "text-error" : "text-on-surface-variant",
                !failed && !complete && "animate-spin",
              )}
            />
            <span
              className={cn(
                "text-label-md uppercase tracking-wider",
                failed ? "text-error" : "text-on-surface-variant",
              )}
            >
              {failed ? "Couldn’t save" : complete ? stage.label : "Processing"}
            </span>
            {!failed && (
              <span className="ml-auto text-label-sm tabular-nums text-on-surface-variant">
                {stage.percent}%
              </span>
            )}
          </div>

          <h3 className="mb-sm line-clamp-2 break-all text-headline-md text-on-surface">
            {url}
          </h3>

          <p
            className={cn(
              "mb-lg line-clamp-3 text-body-md",
              failed ? "text-error" : "animate-pulse text-on-surface-variant",
            )}
          >
            {failed
              ? lastError?.slice(0, 160) || "Something went wrong while saving."
              : complete
                ? "Ready to read."
                : `${stage.label} — extracting insights and generating summary…`}
          </p>
        </div>

        <ProgressBar
          value={failed ? 100 : stage.percent}
          label={failed ? "Capture failed" : stage.label}
          barClassName={cn(
            failed && "bg-error",
            !complete && !failed && "animate-[pulse_2s_ease-in-out_infinite]",
          )}
        />
      </div>
    </article>
  );
}
