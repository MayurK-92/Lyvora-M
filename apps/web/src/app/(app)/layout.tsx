import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { AppTopBar } from "@/components/nav/app-top-bar";
import { AppBottomNav } from "@/components/nav/app-bottom-nav";
import { PageEnter } from "@/components/ui/page-enter";
import { avatarUrlOf } from "@/lib/user";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-background">
      <div className="print-hidden">
        <AppSidebar />
      </div>
      <div className="lg:pl-72">
        <div className="print-hidden">
          <AppTopBar email={user.email ?? ""} avatarUrl={avatarUrlOf(user.user_metadata)} />
        </div>
        <main id="main-content" className="relative min-h-screen bg-surface pt-16 print:min-h-0 print:bg-white print:pt-0">
          <PageEnter>{children}</PageEnter>
        </main>
      </div>
      <div className="print-hidden">
        <AppBottomNav />
      </div>
    </div>
  );
}
