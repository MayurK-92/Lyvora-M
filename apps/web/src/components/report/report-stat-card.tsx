import type { ReactNode } from "react";
import { MaterialIcon, cn, type IconName } from "@lyvora/ui";

export function ReportStatCard({
  icon,
  iconClassName,
  label,
  value,
  unit,
  badge,
  decoration,
  footer,
  className,
}: {
  icon: IconName;
  iconClassName?: string;
  label: string;
  value: string;
  unit?: string;
  badge?: ReactNode;
  decoration?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-md overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {decoration}
      <div className="relative z-10 flex items-center justify-between">
        <MaterialIcon
          name={icon}
          className={cn("transition-colors", iconClassName ?? "text-primary-fixed-dim group-hover:text-primary")}
        />
        {badge}
      </div>
      <div className="relative z-10">
        <h3 className="mb-1 text-label-md text-on-surface-variant">{label}</h3>
        <div className="flex items-baseline gap-xs text-headline-lg text-on-surface">
          {value}
          {unit && (
            <span className="text-body-md font-normal text-on-surface-variant/70">
              {unit}
            </span>
          )}
        </div>
        {footer}
      </div>
    </div>
  );
}

/** The abstract node/edge doodle behind the "connections" stat. */
export function NetworkDecoration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="pointer-events-none absolute -bottom-4 -right-4 size-24 text-tertiary-fixed-dim/20 transition-colors group-hover:text-tertiary-fixed-dim/40"
    >
      <circle cx="50" cy="50" r="10" />
      <circle cx="20" cy="20" r="6" />
      <circle cx="80" cy="30" r="8" />
      <line x1="50" y1="50" x2="20" y2="20" />
      <line x1="50" y1="50" x2="80" y2="30" />
    </svg>
  );
}
