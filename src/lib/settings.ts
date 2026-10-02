import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface ShellSettings {
  announcementBanner: string;
  maintenanceMode: boolean;
}

/** Platform settings the app shell needs (readable by any signed-in user). */
export const getShellSettings = cache(async (): Promise<ShellSettings> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", ["announcement_banner", "maintenance_mode"])
    .overrideTypes<{ key: string; value: unknown }[], { merge: false }>();
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  const banner = map.get("announcement_banner");
  return {
    announcementBanner: typeof banner === "string" ? banner.trim() : "",
    maintenanceMode: map.get("maintenance_mode") === true,
  };
});
