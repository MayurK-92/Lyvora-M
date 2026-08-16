"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon, cn } from "@lyvora/ui";
import { isNavItemActive, MOBILE_MORE_ITEMS, MOBILE_PRIMARY_ITEMS } from "./nav-items";

/**
 * Mobile-only destination bar. The design has no bottom nav (its sidebar is
 * always visible), so this keeps the app's existing mobile navigation while
 * adopting the design's tokens, radii and active treatment.
 */
export function AppBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const panelId = useId();
  const moreRef = useRef<HTMLDivElement>(null);

  const moreActive = MOBILE_MORE_ITEMS.some((item) => isNavItemActive(pathname, item.href));

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    function onPointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (moreRef.current && target && !moreRef.current.contains(target)) {
        setMoreOpen(false);
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
  }, [moreOpen]);

  return (
    <div ref={moreRef} className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
      {moreOpen && (
        <div
          id={panelId}
          role="menu"
          aria-label="More destinations"
          className="mx-md mb-sm overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-xs shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
        >
          {MOBILE_MORE_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-md rounded-xl px-md py-sm text-label-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active
                    ? "bg-secondary-container font-bold text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                )}
              >
                <MaterialIcon name={item.icon} size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Primary"
        className="flex border-t border-outline-variant/30 bg-surface/90 backdrop-blur-xl"
      >
        {MOBILE_PRIMARY_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-sm text-label-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                active ? "text-primary" : "text-on-surface-variant",
              )}
            >
              <MaterialIcon name={item.icon} size={22} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          aria-label="More"
          aria-expanded={moreOpen}
          aria-controls={panelId}
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-sm text-label-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            moreOpen || moreActive ? "text-primary" : "text-on-surface-variant",
          )}
        >
          <MaterialIcon name="more_horiz" size={22} />
          More
        </button>
      </nav>
    </div>
  );
}
