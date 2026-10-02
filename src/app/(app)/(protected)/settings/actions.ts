"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { passwordSchema, profileSchema, type PasswordValues, type ProfileValues } from "@/components/profile/schemas";
import type { ActionResult } from "@/types";

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Updates the current user's own profile. Role is never sent (and is guarded by a DB trigger). */
export async function updateProfile(values: ProfileValues): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;
  if (!isValidTimezone(v.timezone)) return { ok: false, error: "Unknown timezone" };

  const user = await getUser();
  if (!user) return { ok: false, error: "Your session expired. Log in again." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: v.full_name,
      username: v.username ? v.username.toLowerCase() : null,
      bio: v.bio.trim() ? v.bio.trim() : null,
      avatar_url: v.avatar_url || null,
      timezone: v.timezone,
      learning_goal: v.learning_goal || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That username is taken." };
    return { ok: false, error: "Couldn't save your profile. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved" };
}

export async function changePassword(values: PasswordValues): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const user = await getUser();
  if (!user) return { ok: false, error: "Your session expired. Log in again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "Choose a password different from your current one." };
    if (error.code === "reauthentication_needed") {
      return { ok: false, error: "For security, log out and back in before changing your password." };
    }
    return { ok: false, error: error.message || "Couldn't update your password." };
  }
  return { ok: true, message: "Password updated" };
}
