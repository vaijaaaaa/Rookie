import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postAuthRedirect } from "../_lib/redirects";
import { siteUrl } from "../_lib/url";
import type { Profile } from "@/types";

/** OAuth / PKCE return URL: exchange ?code for a session, then send the user home (or to ?next). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarded_at")
        .eq("id", data.user.id)
        .maybeSingle<Pick<Profile, "role" | "onboarded_at">>();
      return NextResponse.redirect(siteUrl(request, postAuthRedirect(profile ?? null, next)));
    }
  }

  return NextResponse.redirect(siteUrl(request, "/login?error=oauth"));
}
