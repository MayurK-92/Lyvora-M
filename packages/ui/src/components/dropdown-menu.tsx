"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface DropdownMenuProps {
  /** Receives the props that must be spread onto the element that opens the menu. */
  trigger: (props: {
    "aria-expanded": boolean;
    "aria-haspopup": "menu";
    "aria-controls": string;
    onClick: () => void;
  }) => React.ReactNode;
  children: React.ReactNode;
  label: string;
  align?: "start" | "end";
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  label,
  align = "end",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({
        "aria-expanded": open,
        "aria-haspopup": "menu",
        "aria-controls": menuId,
        onClick: () => setOpen((value) => !value),
      })}
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onClick={() => setOpen(false)}
          className={cn(
            "absolute top-[calc(100%+8px)] z-50 min-w-56 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-xs shadow-[0_10px_30px_rgba(0,0,0,0.08)]",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="menuitem"
      className={cn(
        "flex items-center gap-sm rounded-lg px-md py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("truncate px-md py-sm text-label-sm text-on-surface-variant", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("my-xs h-px bg-outline-variant/40", className)} />;
}
