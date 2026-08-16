import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Always re-validates with the Supabase Auth server (`getUser`), never trusts the session cookie
 * on its own (`getSession`) — see the Next.js Data Access Layer guidance in the App Router auth guide.
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Use at the top of any (app) route that must not render for a signed-out visitor. */
export async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}
