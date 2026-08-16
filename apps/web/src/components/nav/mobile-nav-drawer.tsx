"use client";

import { useEffect } from "react";
import { IconButton } from "@lyvora/ui";
import { SidebarNav } from "./sidebar-nav";

/**
 * Below `lg` the design's fixed 288px rail cannot coexist with the content
 * column, so the identical SidebarNav markup slides in over a scrim instead.
 */
export function MobileNavDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="animate-page-enter relative flex h-full w-72 max-w-[85vw] flex-col bg-surface-container-low shadow-[0_0_40px_rgba(0,0,0,0.12)]"
      >
        <div className="absolute right-sm top-lg">
          <IconButton icon="close" label="Close navigation" size="sm" onClick={onClose} />
        </div>
        <SidebarNav onNavigate={onClose} />
      </aside>
    </div>
  );
}
