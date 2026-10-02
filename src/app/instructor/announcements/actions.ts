"use server";

import { revalidatePath } from "next/cache";
import { dbError, invalid, NOT_PERMITTED, withStaff } from "@/services/instructor/context";
import { announcementSchema, type AnnouncementInput } from "@/services/instructor/schemas";
import type { ActionResult } from "@/types";

function revalidate() {
  revalidatePath("/instructor/announcements");
  revalidatePath("/instructor");
  revalidatePath("/dashboard");
}

export async function saveAnnouncement(id: string | null, input: AnnouncementInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = announcementSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const row = { ...parsed.data, course_id: parsed.data.course_id || null };
    if (!id) {
      // author_id is always the caller; RLS also enforces it.
      const { error } = await ctx.supabase.from("announcements").insert({ ...row, author_id: ctx.profile.id });
      if (error) return dbError(error);
      revalidate();
      return { ok: true, message: "Announcement published — students were notified" };
    }
    const { data, error } = await ctx.supabase.from("announcements").update(row).eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate();
    return { ok: true, message: "Announcement updated" };
  });
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("announcements").delete().eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate();
    return { ok: true };
  });
}
