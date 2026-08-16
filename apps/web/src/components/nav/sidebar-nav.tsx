"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon, cn } from "@lyvora/ui";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { isNavItemActive, NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "./nav-items";

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-xl px-md py-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "bg-secondary-container font-bold text-on-secondary-container shadow-sm"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
      )}
    >
      <MaterialIcon name={item.icon} className="mr-md" />
      <span className="text-label-md">{item.label}</span>
    </Link>
  );
}

/**
 * Brand lockup + primary nav + settings footer. Shared verbatim between the
 * desktop `<aside>` and the mobile drawer so the two can never drift.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="mb-md flex items-center gap-sm p-lg">
        <Link
          href="/home"
          onClick={onNavigate}
          className="flex items-center gap-sm rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <BrandLockup size={32} />
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-xs px-md">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <nav aria-label="Account" className="space-y-xs px-md pb-xl">
        <NavLink item={SETTINGS_ITEM} onNavigate={onNavigate} />
      </nav>
    </>
  );
}
