"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import type { ActionResult } from "@/types";

const answerSchema = z.object({
  questionId: z.guid(),
  content: z.string().trim().min(1, "Write an answer first").max(50_000, "This answer is too long"),
});

/** Creates or updates the current user's answer to a daily question. */
export async function saveDailyAnswer(questionId: string, content: string): Promise<ActionResult<{ updatedAt: string }>> {
  const parsed = answerSchema.safeParse({ questionId, content });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const user = await getUser();
  if (!user) return { ok: false, error: "Your session expired. Log in again." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_question_answers")
    .upsert(
      { question_id: parsed.data.questionId, user_id: user.id, content: parsed.data.content },
      { onConflict: "question_id,user_id" },
    )
    .select("updated_at")
    .single<{ updated_at: string }>();
  if (error) {
    if (error.code === "42501") return { ok: false, error: "This question isn't open yet." };
    return { ok: false, error: "Couldn't save your answer. Please try again." };
  }
  revalidatePath("/daily");
  return { ok: true, data: { updatedAt: data.updated_at }, message: "Answer saved" };
}

export async function deleteDailyAnswer(questionId: string): Promise<ActionResult> {
  if (!z.guid().safeParse(questionId).success) return { ok: false, error: "Invalid question" };
  const user = await getUser();
  if (!user) return { ok: false, error: "Your session expired. Log in again." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_question_answers")
    .delete()
    .eq("question_id", questionId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't delete your answer." };
  revalidatePath("/daily");
  return { ok: true, message: "Answer deleted" };
}
