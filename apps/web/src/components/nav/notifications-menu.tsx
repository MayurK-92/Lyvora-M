"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  MaterialIcon,
  Spinner,
  cn,
} from "@lyvora/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatRelativeDate } from "@/lib/format";

interface Notification {
  id: string;
  icon: "bar_chart" | "error";
  tone: "info" | "error";
  title: string;
  detail: string;
  href: string;
  at: string;
}

/**
 * The design's bell. Lyvora has no dedicated notification service, so this
 * surfaces the two real signals the app already produces: a freshly generated
 * weekly report and captures that failed to process.
 */
export function NotificationsMenu() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const next: Notification[] = [];

    try {
      const response = await fetch("/api/reports/latest");
      if (response.ok) {
        const data = (await response.json()) as {
          report: { id: string; weekStart: string; createdAt: string } | null;
        };
        if (data.report) {
          next.push({
            id: `report-${data.report.id}`,
            icon: "bar_chart",
            tone: "info",
            title: "Weekly synthesis ready",
            detail: `Week of ${data.report.weekStart}`,
            href: "/report",
            at: data.report.createdAt,
          });
        }
      }
    } catch {
      // Notifications are best-effort; a failed fetch simply shows fewer items.
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("captures")
        .select("id, raw_input, last_error, updated_at")
        .eq("status", "failed")
        .order("updated_at", { ascending: false })
        .limit(5);
      for (const row of data ?? []) {
        next.push({
          id: `capture-${row.id}`,
          icon: "error",
          tone: "error",
          title: "A capture didn’t finish",
          detail: row.last_error?.slice(0, 80) || (row.raw_input ?? "Unknown source"),
          href: "/home",
          at: row.updated_at,
        });
      }
    } catch {
      // ignore
    }

    next.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    setItems(next);
    setLoading(false);
  }, []);

  return (
    <DropdownMenu
      label="Notifications"
      className="w-80"
      trigger={(triggerProps) => (
        <NotificationsTrigger {...triggerProps} onOpen={load} hasItems={Boolean(items?.length)} />
      )}
    >
      <DropdownMenuLabel className="text-label-sm uppercase tracking-wider">
        Notifications
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {loading && items === null ? (
        <div className="flex items-center justify-center py-lg">
          <Spinner />
        </div>
      ) : items && items.length > 0 ? (
        items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            role="menuitem"
            className="flex items-start gap-sm rounded-lg px-md py-sm transition-colors hover:bg-surface-container-high"
          >
            <MaterialIcon
              name={item.icon}
              size={18}
              className={cn(
                "mt-0.5",
                item.tone === "error" ? "text-error" : "text-primary",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-label-md text-on-surface">{item.title}</span>
              <span className="block truncate text-label-sm font-normal text-on-surface-variant">
                {item.detail}
              </span>
              <span className="mt-xs block text-label-sm font-normal text-outline">
                {formatRelativeDate(item.at)}
              </span>
            </span>
          </Link>
        ))
      ) : (
        <p className="px-md py-lg text-center text-label-md text-on-surface-variant">
          You’re all caught up.
        </p>
      )}
    </DropdownMenu>
  );
}

function NotificationsTrigger({
  onOpen,
  hasItems,
  onClick,
  ...props
}: {
  onOpen: () => void;
  hasItems: boolean;
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-haspopup": "menu";
  "aria-controls": string;
}) {
  const expanded = props["aria-expanded"];

  useEffect(() => {
    if (expanded) onOpen();
  }, [expanded, onOpen]);

  return (
    <button
      type="button"
      aria-label="Notifications"
      onClick={onClick}
      className="relative rounded-full p-xs text-on-surface-variant transition-colors outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary/40"
      {...props}
    >
      <MaterialIcon name="notifications" />
      {hasItems && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 size-1.5 rounded-full bg-primary"
        />
      )}
    </button>
  );
}
