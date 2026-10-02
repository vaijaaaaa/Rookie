"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { isEmailConfigured, sendEmails } from "@/lib/email";
import { errorMessage } from "@/lib/utils";
import { buildClassEmails, getClassRecipients, type ClassEmailKind } from "@/services/class-emails";
import { dbError, invalid, nn, NOT_PERMITTED, withStaff, type StaffContext } from "@/services/instructor/context";
import { classSchema, idSchema, type ClassInput } from "@/services/instructor/schemas";
import type { ActionResult, ClassSession } from "@/types";

function revalidate(id?: string) {
  revalidatePath("/admin/classes");
  revalidatePath("/admin/teaching");
  revalidatePath("/admin/attendance");
  revalidatePath("/classes");
  if (id) revalidatePath(`/admin/classes/${id}`);
}

type PrevClass = Pick<ClassSession, "starts_at" | "status">;

/** Which email (if any) students should get for this save. */
function emailKind(prev: PrevClass | null, next: PrevClass): ClassEmailKind | null {
  if (new Date(next.starts_at).getTime() <= Date.now()) return null;
  if (!prev) return next.status === "cancelled" ? null : "scheduled";
  if (next.status === "cancelled") return prev.status === "cancelled" ? null : "cancelled";
  if (next.status === "completed") return null;
  if (prev.status === "cancelled") return "scheduled";
  return new Date(prev.starts_at).getTime() !== new Date(next.starts_at).getTime() ? "rescheduled" : null;
}

/**
 * Looks up the roster now (while the request's auth is available) and sends the
 * emails after the response, so saving never waits on SMTP. Returns a toast suffix.
 */
async function queueClassEmails(
  ctx: StaffContext,
  kind: ClassEmailKind,
  cls: Pick<ClassSession, "id" | "title" | "description" | "starts_at" | "duration_minutes" | "course_id">,
): Promise<string> {
  if (!isEmailConfigured()) return " (email not configured)";
  try {
    const recipients = await getClassRecipients(ctx.supabase, cls.course_id);
    if (!recipients.length) return "";
    let courseTitle: string | null = null;
    if (cls.course_id) {
      const { data } = await ctx.supabase.from("courses").select("title").eq("id", cls.course_id).maybeSingle<{ title: string }>();
      courseTitle = data?.title ?? null;
    }
    const messages = buildClassEmails(kind, cls, recipients, courseTitle);
    after(async () => {
      const { sent, failed } = await sendEmails(messages);
      console.info(`[email] class ${cls.id} ${kind}: ${sent} sent, ${failed} failed`);
    });
    return ` · emailing ${recipients.length} student${recipients.length === 1 ? "" : "s"}`;
  } catch (err) {
    console.error("[email] could not queue class emails:", errorMessage(err));
    return " (emails could not be sent)";
  }
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

    const next = { starts_at: row.starts_at as string, status: v.status };
    const emailFields = {
      title: v.title,
      description: v.description,
      starts_at: next.starts_at,
      duration_minutes: v.duration_minutes,
      course_id: courseId,
    };

    if (!id) {
      const { data, error } = await ctx.supabase.from("classes").insert(row).select("id").single<{ id: string }>();
      if (error) return dbError(error);
      revalidate();
      const kind = emailKind(null, next);
      const note = kind ? await queueClassEmails(ctx, kind, { id: data.id, ...emailFields }) : "";
      return { ok: true, data: { id: data.id }, message: `Class scheduled${note}` };
    }
    if (!idSchema.safeParse(id).success) return NOT_PERMITTED;
    const { data: prev } = await ctx.supabase
      .from("classes")
      .select("starts_at, status")
      .eq("id", id)
      .maybeSingle<PrevClass>();
    const { data, error } = await ctx.supabase.from("classes").update(row).eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate(id);
    const kind = prev ? emailKind(prev, next) : null;
    const note = kind ? await queueClassEmails(ctx, kind, { id, ...emailFields }) : "";
    return { ok: true, data: { id }, message: `Class updated${note}` };
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
