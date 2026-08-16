import * as React from "react";
import { cn } from "../lib/cn";

export interface ProgressBarProps {
  /** 0–100. Ignored when `indeterminate`. */
  value?: number;
  indeterminate?: boolean;
  label?: string;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}

/**
 * Slim progress track. DESIGN.md § Components → Progress Bars (AI Processing):
 * 4px tall, primary fill, subtle pulse while the AI is synthesising.
 */
export function ProgressBar({
  value = 0,
  indeterminate = false,
  label,
  className,
  trackClassName,
  barClassName,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-1 w-full overflow-hidden rounded-full bg-surface-container-high", trackClassName, className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary",
          indeterminate
            ? "w-1/2 animate-[progress_1.5s_ease-in-out_infinite]"
            : "transition-[width] duration-500 ease-out",
          barClassName,
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}
