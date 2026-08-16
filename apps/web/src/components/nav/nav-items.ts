import type { IconName } from "@lyvora/ui";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

// Mirrors the (app) route map in system_design.md §12 and the sidebar order in
// every docs/UI DESIGN screen.
export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/chat", label: "Chat", icon: "forum" },
  { href: "/graph", label: "Graph", icon: "hub" },
  { href: "/report", label: "Reports", icon: "bar_chart" },
];

/** The design puts Settings in its own footer nav, separated from the primaries. */
export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: "settings",
};

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, SETTINGS_ITEM];

/** Bottom nav primaries — remaining destinations live under More. */
export const MOBILE_PRIMARY_ITEMS: NavItem[] = NAV_ITEMS.slice(0, 3);

export const MOBILE_MORE_ITEMS: NavItem[] = [...NAV_ITEMS.slice(3), SETTINGS_ITEM];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
