import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postAuthRedirect, safeNextPath } from "../_lib/redirects";
import { siteUrl } from "../_lib/url";
import type { Profile } from "@/types";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Email link landing (signup confirmation, password recovery, email change).
 * Supports both the token_hash template (`?token_hash=…&type=…`) and the default
 * PKCE redirect (`?code=…`).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = OTP_TYPES.find((t) => t === rawType) ?? null;

  const supabase = await createClient();
  let userId: string | null = null;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) userId = data.user?.id ?? null;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id ?? null;
  }

  if (!userId) {
    const isRecovery = type === "recovery" || safeNextPath(next) === "/reset-password";
    return NextResponse.redirect(siteUrl(request, `/login?error=${isRecovery ? "link" : "confirm"}`));
  }

  // Password recovery always continues to the requested page (e.g. /reset-password),
  // even for students who haven't onboarded yet.
  const safeNext = safeNextPath(next);
  if (type === "recovery" || safeNext === "/reset-password") {
    return NextResponse.redirect(siteUrl(request, safeNext ?? "/reset-password"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded_at")
    .eq("id", userId)
    .maybeSingle<Pick<Profile, "role" | "onboarded_at">>();

  return NextResponse.redirect(siteUrl(request, postAuthRedirect(profile ?? null, next)));
}
