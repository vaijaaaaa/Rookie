import type { Profile } from "@/types";

/**
 * Only allow same-origin relative paths ("/foo", not "//evil.com" or "/\\evil.com").
 * Returns null for anything unsafe.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (/[\r\n\t]/.test(next)) return null;
  // Never bounce back into the auth pages themselves.
  if (/^\/(login|forgot-password)(\/|\?|$)/.test(next)) return null;
  return next;
}

/** Where a signed-in user lands by default. Students finish onboarding first. */
export function landingFor(profile: Pick<Profile, "role" | "onboarded_at"> | null): string {
  if (!profile) return "/dashboard";
  if (profile.role === "admin") return "/admin";
  return profile.onboarded_at ? "/dashboard" : "/onboarding";
}

/** next param wins for onboarded users; un-onboarded students always go to /onboarding. */
export function postAuthRedirect(
  profile: Pick<Profile, "role" | "onboarded_at"> | null,
  next: string | null | undefined,
): string {
  const home = landingFor(profile);
  if (home === "/onboarding") return home;
  return safeNextPath(next) ?? home;
}
