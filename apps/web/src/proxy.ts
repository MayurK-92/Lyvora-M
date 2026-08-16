import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Next.js 16 `proxy.ts` (formerly middleware). Refreshes the Supabase auth cookie
 * so Server Components always see a valid session.
 *
 * Pass `{ request: { headers } }` — not the whole NextRequest. Passing `{ request }`
 * makes Turbopack 404 every route except `/` in `next dev` (Next 16.2.x).
 */
function nextWithHeaders(headers: Headers) {
  return NextResponse.next({ request: { headers } });
}

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let response = nextWithHeaders(requestHeaders);

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        requestHeaders.set(
          "cookie",
          request.cookies
            .getAll()
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join("; "),
        );
        response = nextWithHeaders(requestHeaders);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
