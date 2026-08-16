import type { ReactNode } from "react";
import { MaterialIcon, cn, type IconName } from "@lyvora/ui";

/**
 * "Recent Memories" style section header: icon + title on the left, an optional
 * action on the right (home_lyvora lines 10–18).
 */
export function SectionHeading({
  icon,
  title,
  action,
  iconClassName,
  className,
}: {
  icon?: IconName;
  title: string;
  action?: ReactNode;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-lg flex items-center justify-between gap-md", className)}>
      <h2 className="flex items-center gap-sm text-headline-md text-on-surface">
        {icon && <MaterialIcon name={icon} className={cn("text-primary", iconClassName)} />}
        {title}
      </h2>
      {action}
    </div>
  );
}

/** Uppercase micro-label used above filter groups and metadata pairs. */
export function EyebrowLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-label-sm uppercase tracking-widest text-on-surface-variant",
        className,
      )}
    >
      {children}
    </p>
  );
}
