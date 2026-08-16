"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { MaterialIcon, type IconName } from "./icon";

export interface SegmentedTabItem<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedTabsProps<T extends string> {
  items: ReadonlyArray<SegmentedTabItem<T>>;
  value: T;
  onValueChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Pill segmented control — the Link / Text / File switcher in the capture bar
 * (home_lyvora lines 120–130).
 */
export function SegmentedTabs<T extends string>({
  items,
  value,
  onValueChange,
  label,
  disabled = false,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("flex items-center gap-xs", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1.5 text-label-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50",
              active
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            {item.icon && <MaterialIcon name={item.icon} size={16} />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
