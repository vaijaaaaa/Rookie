"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/supabase/env";
import { postAuthRedirect, landingFor } from "@/app/auth/_lib/redirects";
import type { ActionResult, Profile } from "@/types";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type LoginValues,
  type ResetPasswordValues,
} from "./schemas";

type RedirectProfile = Pick<Profile, "role" | "onboarded_at">;

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input";
}

/** Email + password sign in. Redirects on success. */
export async function signInWithPassword(values: LoginValues): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return { ok: false, error: "Confirm your email first — check your inbox for the link." };
    }
    return { ok: false, error: "Incorrect email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded_at")
    .eq("id", data.user.id)
    .maybeSingle<RedirectProfile>();

  if (!profile) {
    // No profile row: every protected page would bounce back to /login.
    await supabase.auth.signOut();
    return { ok: false, error: "Your account isn't set up yet — contact your admin." };
  }

  redirect(postAuthRedirect(profile, parsed.data.next));
}

/** Sends a password reset email. Always reports success to avoid account enumeration. */
export async function requestPasswordReset(values: ForgotPasswordValues): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/confirm?next=/reset-password`,
  });
  if (error?.status === 429) {
    return { ok: false, error: "Too many requests. Wait a minute and try again." };
  }
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

/** Sets a new password for the signed-in (recovery) session. */
export async function updatePassword(values: ResetPasswordValues): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, error: "Choose a password different from your current one." };
    }
    return { ok: false, error: error.message || "Couldn't update your password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded_at")
    .eq("id", userData.user.id)
    .maybeSingle<RedirectProfile>();

  return { ok: true, data: { redirectTo: landingFor(profile ?? null) }, message: "Password updated." };
}
