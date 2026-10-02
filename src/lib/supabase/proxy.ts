import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

const PROTECTED_PREFIXES = [
  "/dashboard", "/agenda", "/attendance", "/progress", "/practice", "/assignments",
  "/notes", "/daily", "/achievements", "/profile", "/settings", "/onboarding", "/notifications",
  "/class/", "/admin/teaching", "/admin", "/learn",
];

/** Refreshes the auth session cookie and does an optimistic auth redirect. */
/** Static public pages: skip the auth round-trip so they're served instantly. */
const STATIC_PUBLIC = new Set(["/", "/about"]);

export async function updateSession(request: NextRequest) {
  if (STATIC_PUBLIC.has(request.nextUrl.pathname)) return NextResponse.next();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const path = request.nextUrl.pathname;

  if (!user && PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  return response;
}
