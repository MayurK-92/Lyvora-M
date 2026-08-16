import type { ReactNode } from "react";
import Link from "next/link";
import { Button, MaterialIcon, cn, type IconName } from "@lyvora/ui";

export function EmptyState({
  icon = "auto_awesome",
  title,
  message,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon?: IconName;
  title?: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  let action: ReactNode = null;
  if (actionLabel && actionHref) {
    action = (
      <Button asChild variant="outline" size="lg">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    );
  } else if (actionLabel && onAction) {
    action = (
      <Button type="button" variant="outline" size="lg" onClick={onAction}>
        {actionLabel}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-md rounded-2xl border border-dashed border-outline-variant px-lg py-2xl text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <MaterialIcon name={icon} />
      </span>
      {title && <h3 className="text-headline-md text-on-surface">{title}</h3>}
      <p className="max-w-sm text-body-md text-on-surface-variant">{message}</p>
      {action}
    </div>
  );
}
