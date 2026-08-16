import { SidebarNav } from "./sidebar-nav";

/**
 * Desktop rail. Matches the `fixed left-0 top-0 h-full w-72` aside present in
 * every docs/UI DESIGN screen; below `lg` it is replaced by MobileNavDrawer.
 */
export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-72 flex-col bg-surface-container-low shadow-[0_0_20px_rgba(0,0,0,0.02)] lg:flex">
      <SidebarNav />
    </aside>
  );
}
