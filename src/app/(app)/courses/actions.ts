"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/app/auth/_lib/redirects";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";
import type { ActionResult } from "@/types";

const uuid = z.guid();
const slug = z.string().min(1).max(200);

/** Form action: enroll in a course (RPC) then go to `next` (first/next lesson or overview). */
export async function enrollInCourseAction(formData: FormData): Promise<void> {
  const parsed = z
    .object({ courseId: uuid, courseSlug: slug, next: z.string().max(2000).optional() })
    .safeParse({
      courseId: formData.get("courseId"),
      courseSlug: formData.get("courseSlug"),
      next: formData.get("next") || undefined,
    });
  if (!parsed.success) throw new Error("Invalid course");
  const { courseId, courseSlug, next } = parsed.data;

  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/courses/${courseSlug}`)}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("enroll_in_course", { p_course_id: courseId });
  if (error) throw new Error(error.message);

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseSlug}`);
  redirect(safeNextPath(next) ?? `/courses/${courseSlug}`);
}

const completionSchema = z.object({
  lessonId: uuid,
  courseId: uuid,
  courseSlug: slug,
  completed: z.boolean(),
});

/** Toggle a lesson complete / back to in-progress for the current user. */
export async function setLessonCompletion(input: z.input<typeof completionSchema>): Promise<ActionResult> {
  const parsed = completionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  const { lessonId, courseId, courseSlug, completed } = parsed.data;

  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to track progress" };

  try {
    const supabase = await createClient();
    // Completing a lesson implicitly enrolls the student (no-op if already enrolled).
    if (completed) await supabase.rpc("enroll_in_course", { p_course_id: courseId });

    const { error } = await supabase.from("student_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        status: completed ? "completed" : "in_progress",
        last_viewed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) return { ok: false, error: error.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }

  revalidatePath(`/courses/${courseSlug}`, "layout");
  revalidatePath("/courses");
  return { ok: true, message: completed ? "Lesson completed" : "Marked as in progress" };
}

/**
 * Records that the user opened a lesson. Bumps last_viewed_at on an existing
 * row (never touching status, so a completed lesson stays completed) or
 * creates an in_progress row. No revalidation — this is a background ping.
 */
export async function recordLessonView(lessonId: string): Promise<ActionResult> {
  if (!uuid.safeParse(lessonId).success) return { ok: false, error: "Invalid lesson" };
  const user = await getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("student_progress")
    .update({ last_viewed_at: now })
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .select("lesson_id");
  if (error) return { ok: false, error: error.message };

  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase
      .from("student_progress")
      .upsert(
        { user_id: user.id, lesson_id: lessonId, status: "in_progress", last_viewed_at: now },
        { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
      );
    if (insertError) return { ok: false, error: insertError.message };
  }
  return { ok: true };
}
