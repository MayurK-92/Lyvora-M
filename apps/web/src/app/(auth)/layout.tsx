import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { getAuthenticatedUser } from "@/lib/auth/session";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/home");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface px-md py-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary-fixed-dim/25 blur-[110px] mix-blend-multiply"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-tertiary-fixed-dim/25 blur-[100px] mix-blend-multiply"
      />

      <Link
        href="/"
        className="relative z-10 mb-2xl rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <BrandLockup size={36} wordmarkClassName="text-headline-lg" />
      </Link>

      <main id="main-content" className="relative z-10 w-full max-w-[400px]">
        {children}
      </main>
    </div>
  );
}
