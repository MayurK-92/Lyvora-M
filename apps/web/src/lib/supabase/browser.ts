"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** User-context Supabase client for Client Components. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
