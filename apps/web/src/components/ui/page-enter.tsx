"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Quiet enter transition when the app route changes. */
export function PageEnter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-enter">
      {children}
    </div>
  );
}
