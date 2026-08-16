import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * User-context Supabase client for Server Components, Server Actions, and Route Handlers.
 * Requests through this client are subject to RLS as the signed-in user (system_design.md §5.4).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Thrown when called during a Server Component render, which cannot set cookies.
          // Harmless here: proxy.ts refreshes the session cookie on every request instead.
        }
      },
    },
  });
}
