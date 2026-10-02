"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";
import type { ActionResult, Assignment, AssignmentSubmission } from "@/types";

const MAX_CONTENT = 100_000;

const saveSchema = z.object({
  assignmentId: z.uuid(),
  intent: z.enum(["draft", "submit"]),
  content: z.string().max(MAX_CONTENT, "Answer is too long").default(""),
  url: z.string().trim().max(2048, "URL is too long").default(""),
});

const unsubmitSchema = z.object({ assignmentId: z.uuid() });

const httpUrl = z.url({ protocol: /^https?$/, error: "Enter a valid http(s) URL" });

type SubmissionState = Pick<AssignmentSubmission, "status" | "submitted_at">;

function revalidate(assignmentId: string) {
  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/assignments");
}

/** Save a draft (status in_progress) or submit (status submitted). Upserts on (assignment_id, user_id). */
export async function saveSubmission(formData: FormData): Promise<ActionResult<SubmissionState>> {
  const parsed = saveSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    intent: formData.get("intent"),
    content: formData.get("content") ?? undefined,
    url: formData.get("url") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { assignmentId, intent, content, url } = parsed.data;

  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const supabase = await createClient();
  const [{ data: assignment }, { data: existing }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id,submission_type,is_published")
      .eq("id", assignmentId)
      .maybeSingle<Pick<Assignment, "id" | "submission_type" | "is_published">>(),
    supabase
      .from("assignment_submissions")
      .select("status")
      .eq("assignment_id", assignmentId)
      .eq("user_id", user.id)
      .maybeSingle<Pick<AssignmentSubmission, "status">>(),
  ]);
  if (!assignment || !assignment.is_published) return { ok: false, error: "Assignment not found." };
  if (existing?.status === "reviewed") return { ok: false, error: "This submission has been reviewed and is locked." };
  if (existing?.status === "submitted") {
    return { ok: false, error: "Already submitted — unsubmit first to make changes." };
  }

  const isUrl = assignment.submission_type === "url";
  if (isUrl && url) {
    const check = httpUrl.safeParse(url);
    if (!check.success) return { ok: false, error: check.error.issues[0]?.message ?? "Invalid URL" };
  }
  if (intent === "submit") {
    if (isUrl && !url) return { ok: false, error: "Add a link before submitting." };
    if (!isUrl && !content.trim()) {
      return { ok: false, error: assignment.submission_type === "code" ? "Add your code before submitting." : "Write an answer before submitting." };
    }
  }

  const { data, error } = await supabase
    .from("assignment_submissions")
    .upsert(
      {
        assignment_id: assignmentId,
        user_id: user.id,
        content,
        url: isUrl ? url || null : null,
        status: intent === "submit" ? "submitted" : "in_progress",
      },
      { onConflict: "assignment_id,user_id" },
    )
    .select("status,submitted_at")
    .single<SubmissionState>();
  if (error) return { ok: false, error: errorMessage(error) };

  revalidate(assignmentId);
  return {
    ok: true,
    data,
    message: intent === "submit" ? "Submitted. Nice work!" : "Draft saved.",
  };
}

/** Pull a submitted (not yet reviewed) submission back to in_progress for editing. */
export async function unsubmitSubmission(formData: FormData): Promise<ActionResult> {
  const parsed = unsubmitSchema.safeParse({ assignmentId: formData.get("assignmentId") });
  if (!parsed.success) return { ok: false, error: "Invalid assignment." };
  const { assignmentId } = parsed.data;

  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_submissions")
    .update({ status: "in_progress" })
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .eq("status", "submitted")
    .select("id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data || data.length === 0) {
    return { ok: false, error: "Nothing to unsubmit — it may already have been reviewed." };
  }

  revalidate(assignmentId);
  return { ok: true, message: "Unsubmitted. You can edit and submit again." };
}
