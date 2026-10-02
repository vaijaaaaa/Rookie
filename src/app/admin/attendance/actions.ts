"use server";

import { revalidatePath } from "next/cache";
import { dbError, invalid, nn, NOT_PERMITTED, withStaff } from "@/services/instructor/context";
import { getManagedClass } from "@/services/instructor/classes";
import { attendanceSchema, type AttendanceInput } from "@/services/instructor/schemas";
import type { ActionResult } from "@/types";

export async function saveAttendance(input: AttendanceInput): Promise<ActionResult<{ saved: number }>> {
  return withStaff<{ saved: number }>(async (ctx) => {
    const parsed = attendanceSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { class_id, rows } = parsed.data;
    const cls = await getManagedClass(ctx, class_id);
    if (!cls) return NOT_PERMITTED;
    if (!rows.length) return { ok: false, error: "Mark at least one student first." };
    const { error } = await ctx.supabase.from("attendance").upsert(
      rows.map((r) => ({
        class_id,
        user_id: r.user_id,
        status: r.status,
        note: nn(r.note),
        marked_by: ctx.profile.id,
      })),
      { onConflict: "class_id,user_id" },
    );
    if (error) return dbError(error);
    revalidatePath(`/admin/attendance/${class_id}`);
    revalidatePath("/admin/attendance");
    revalidatePath("/admin/teaching");
    revalidatePath("/attendance");
    return { ok: true, data: { saved: rows.length }, message: `Attendance saved for ${rows.length} student${rows.length === 1 ? "" : "s"}` };
  });
}
