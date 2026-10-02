import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfile, requireRole } from "@/lib/auth/session";
import { errorMessage } from "@/lib/utils";
import type { ActionResult, Profile } from "@/types";

export type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface StaffContext {
  supabase: Supabase;
  profile: Profile;
  isAdmin: boolean;
}

/** For Server Components under /admin: redirects non-admins away. */
export async function requireStaff(): Promise<StaffContext> {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  return { supabase, profile, isAdmin: profile.role === "admin" };
}

/** For Server Actions: returns null instead of redirecting. */
export async function staffContext(): Promise<StaffContext | null> {
  const profile = await getProfile();
  if (!profile || (profile.role !== "admin")) return null;
  const supabase = await createClient();
  return { supabase, profile, isAdmin: profile.role === "admin" };
}

/** Wraps a server action body: auth check + uniform error handling. */
export async function withStaff<T = undefined>(
  fn: (ctx: StaffContext) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const ctx = await staffContext();
  if (!ctx) return { ok: false, error: "You need an admin account to do that." };
  try {
    return await fn(ctx);
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

interface PgError {
  code?: string;
  message: string;
}

/** Turns a PostgREST error into a human message. */
export function dbError(error: PgError): ActionResult<never> {
  if (error.code === "23505") return { ok: false, error: "That slug (or unique value) is already in use." };
  if (error.code === "42501") return { ok: false, error: "You don't have permission to do that." };
  if (error.code === "23503") return { ok: false, error: "A referenced record no longer exists." };
  if (error.code === "23514") return { ok: false, error: "A value is out of range." };
  return { ok: false, error: error.message };
}

export const NOT_PERMITTED: ActionResult<never> = {
  ok: false,
  error: "Not found, or you don't have permission to change it.",
};

/** Empty string → null. */
export function nn(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/** First zod issue as an ActionResult. */
export function invalid(error: { issues: { message: string; path: PropertyKey[] }[] }): ActionResult<never> {
  const issue = error.issues[0];
  if (!issue) return { ok: false, error: "Invalid input" };
  const field = issue.path.filter((p) => typeof p === "string").join(".");
  return { ok: false, error: field ? `${field}: ${issue.message}` : issue.message };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checks that an instructor id is an existing admin. Returns an error message, or null when valid. */
export async function checkInstructor(ctx: StaffContext, instructorId: string): Promise<string | null> {
  if (!UUID_RE.test(instructorId)) return "Pick a valid instructor.";
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("role")
    .eq("id", instructorId)
    .maybeSingle<{ role: string }>();
  if (error) return error.message;
  if (data?.role !== "admin") return "The instructor must be an existing admin.";
  return null;
}
