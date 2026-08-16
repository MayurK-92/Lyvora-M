"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  IconButton,
  MaterialIcon,
} from "@lyvora/ui";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { NotificationsMenu } from "./notifications-menu";
import { SignOutButton } from "./sign-out-button";

export interface AppTopBarProps {
  email: string;
  avatarUrl: string | null;
}

/**
 * The `h-16` translucent bar from every docs/UI DESIGN screen. It starts at
 * `left-72` on desktop; below `lg` it spans the full width and gains the drawer
 * trigger plus the brand lockup that the hidden sidebar would otherwise carry.
 */
export function AppTopBar({ email, avatarUrl }: AppTopBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-surface/80 px-lg shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:left-72 lg:justify-end">
        <div className="flex items-center gap-sm lg:hidden">
          <IconButton
            icon="menu"
            label="Open navigation"
            size="sm"
            onClick={() => setDrawerOpen(true)}
          />
          <Link
            href="/home"
            className="flex items-center gap-sm rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <BrandLockup size={28} />
          </Link>
        </div>

        <div className="flex items-center gap-md">
          <NotificationsMenu />
          <div aria-hidden="true" className="mx-sm h-8 w-px bg-outline-variant" />
          <DropdownMenu
            label="Account"
            trigger={(triggerProps) => (
              <button
                type="button"
                aria-label="Account menu"
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                {...triggerProps}
              >
                <Avatar src={avatarUrl} name={email || "Account"} size={32} />
              </button>
            )}
          >
            <DropdownMenuLabel>{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link
              href="/settings"
              role="menuitem"
              className="flex items-center gap-sm rounded-lg px-md py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <MaterialIcon name="settings" size={18} />
              Settings
            </Link>
            <SignOutButton />
          </DropdownMenu>
        </div>
      </header>

      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
