"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";
import type { ActionResult } from "@/types";

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const schema = z.object({
  site_name: z.string().trim().min(1, "Site name is required").max(60, "Site name is too long"),
  allow_signups: z.boolean(),
  default_timezone: z.string().refine(isTimeZone, "Unknown timezone"),
  announcement_banner: z.string().trim().max(280, "Banner must be 280 characters or fewer"),
  maintenance_mode: z.boolean(),
});

export type SettingsInput = z.input<typeof schema>;

export async function updatePlatformSettings(input: SettingsInput): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };

  const now = new Date().toISOString();
  const rows = Object.entries(parsed.data).map(([key, value]) => ({ key, value, updated_at: now }));

  const supabase = await createClient();
  const { error } = await supabase.from("platform_settings").upsert(rows, { onConflict: "key" });
  if (error) return { ok: false, error: errorMessage(error) };

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved" };
}
