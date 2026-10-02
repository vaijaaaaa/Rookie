import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types";

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * Signed-in user from the verified session JWT — memoized per request.
 * getClaims() checks the signature locally against the project's cached JWKS,
 * so it avoids a round-trip to the auth server on every page render.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return data ?? null;
});

/** Require any signed-in user; redirects to /login otherwise. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Require one of the given roles; others are sent to their own home. */
export async function requireRole(roles: UserRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect(homeForRole(profile.role));
  return profile;
}

export function homeForRole(role: UserRole): string {
  if (role === "admin") return "/admin";
  return "/dashboard";
}
