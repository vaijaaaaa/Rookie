"use server";

import { revalidatePath } from "next/cache";
import { dbError, invalid, nn, NOT_PERMITTED, withStaff } from "@/services/instructor/context";
import { classSchema, idSchema, type ClassInput } from "@/services/instructor/schemas";
import type { ActionResult } from "@/types";

function revalidate(id?: string) {
  revalidatePath("/instructor/classes");
  revalidatePath("/instructor");
  revalidatePath("/instructor/attendance");
  revalidatePath("/classes");
  if (id) revalidatePath(`/instructor/classes/${id}`);
}

export async function saveClass(id: string | null, input: ClassInput): Promise<ActionResult<{ id: string }>> {
  return withStaff<{ id: string }>(async (ctx) => {
    const parsed = classSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const courseId = nn(v.course_id);
    let moduleId = courseId ? nn(v.module_id) : null;
    if (moduleId) {
      const { data: mod } = await ctx.supabase
        .from("course_modules")
        .select("course_id")
        .eq("id", moduleId)
        .maybeSingle<{ course_id: string }>();
      if (mod?.course_id !== courseId) moduleId = null;
    }
    const row: Record<string, unknown> = {
      title: v.title,
      description: v.description,
      agenda: v.agenda,
      course_id: courseId,
      module_id: moduleId,
      starts_at: new Date(v.starts_at).toISOString(),
      duration_minutes: v.duration_minutes,
      meeting_url: nn(v.meeting_url),
      recording_url: nn(v.recording_url),
      resources: v.resources,
      status: v.status,
    };
    // Ownership: instructors always own what they create; admins may assign.
    if (ctx.isAdmin) {
      if (nn(v.instructor_id)) row.instructor_id = v.instructor_id;
      else if (!id) row.instructor_id = ctx.profile.id;
    } else if (!id) {
      row.instructor_id = ctx.profile.id;
    }

    if (!id) {
      const { data, error } = await ctx.supabase.from("classes").insert(row).select("id").single<{ id: string }>();
      if (error) return dbError(error);
      revalidate();
      return { ok: true, data: { id: data.id }, message: "Class scheduled" };
    }
    if (!idSchema.safeParse(id).success) return NOT_PERMITTED;
    const { data, error } = await ctx.supabase.from("classes").update(row).eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate(id);
    return { ok: true, data: { id }, message: "Class updated" };
  });
}

export async function deleteClass(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("classes").delete().eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate();
    return { ok: true };
  });
}
