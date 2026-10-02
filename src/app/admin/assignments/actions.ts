"use server";

import { revalidatePath } from "next/cache";
import { dbError, invalid, nn, NOT_PERMITTED, withStaff } from "@/services/instructor/context";
import { assignmentSchema, gradeSchema, type AssignmentInput, type GradeInput } from "@/services/instructor/schemas";
import type { ActionResult } from "@/types";

function revalidate(id?: string) {
  revalidatePath("/admin/assignments");
  revalidatePath("/admin/teaching");
  if (id) revalidatePath(`/admin/assignments/${id}`, "layout");
  revalidatePath("/assignments", "layout");
}

export async function saveAssignment(id: string | null, input: AssignmentInput): Promise<ActionResult<{ id: string }>> {
  return withStaff<{ id: string }>(async (ctx) => {
    const parsed = assignmentSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    let lessonId = nn(v.lesson_id);
    if (lessonId) {
      const { data: lesson } = await ctx.supabase.from("lessons").select("course_id").eq("id", lessonId).maybeSingle<{ course_id: string }>();
      if (lesson?.course_id !== v.course_id) lessonId = null;
    }
    const row = { ...v, lesson_id: lessonId, due_at: new Date(v.due_at).toISOString() };
    if (!id) {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .insert({ ...row, created_by: ctx.profile.id })
        .select("id")
        .single<{ id: string }>();
      if (error) return dbError(error);
      revalidate();
      return { ok: true, data: { id: data.id }, message: "Assignment created" };
    }
    const { data, error } = await ctx.supabase.from("assignments").update(row).eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate(id);
    return { ok: true, data: { id }, message: "Assignment saved" };
  });
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("assignments").delete().eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate();
    return { ok: true };
  });
}

export async function gradeSubmission(submissionId: string, input: GradeInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = gradeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { data: sub } = await ctx.supabase
      .from("assignment_submissions")
      .select("assignment_id, status, assignments(points)")
      .eq("id", submissionId)
      .maybeSingle<{ assignment_id: string; status: string; assignments: { points: number } | null }>();
    if (!sub || !sub.assignments) return NOT_PERMITTED;
    if (sub.status === "in_progress") return { ok: false, error: "This submission is still a draft." };
    if (parsed.data.grade > sub.assignments.points) {
      return { ok: false, error: `Grade can't exceed ${sub.assignments.points} points.` };
    }
    // Trigger stamps reviewed_by / reviewed_at and notifies the student.
    const { data, error } = await ctx.supabase
      .from("assignment_submissions")
      .update({ grade: parsed.data.grade, feedback: nn(parsed.data.feedback), status: "reviewed" })
      .eq("id", submissionId)
      .select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate(sub.assignment_id);
    return { ok: true, message: "Graded — the student has been notified" };
  });
}
