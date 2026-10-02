"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isISODate } from "@/components/agenda/tz";
import { dbError, invalid, NOT_PERMITTED, withStaff } from "@/services/instructor/context";
import type { ActionResult } from "@/types";

const questionSchema = z.object({
  question_date: z.string().refine((v) => isISODate(v), "Pick a valid date"),
  title: z.string().trim().min(1, "Add a title").max(200, "Keep the title under 200 characters"),
  body: z.string().max(50_000, "The question is too long"),
});
export type DailyQuestionInput = z.infer<typeof questionSchema>;

function revalidate(id?: string) {
  revalidatePath("/admin/daily");
  revalidatePath("/daily");
  if (id) revalidatePath(`/admin/daily/${id}`);
}

export async function saveDailyQuestion(id: string | null, input: DailyQuestionInput): Promise<ActionResult<{ id: string }>> {
  return withStaff<{ id: string }>(async (ctx) => {
    const parsed = questionSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const row = { ...parsed.data, body: parsed.data.body.trim() };

    if (!id) {
      const { data, error } = await ctx.supabase
        .from("daily_questions")
        .insert({ ...row, created_by: ctx.profile.id })
        .select("id")
        .single<{ id: string }>();
      if (error?.code === "23505") return { ok: false, error: "There's already a question for that date — edit it instead." };
      if (error) return dbError(error);
      revalidate();
      return { ok: true, data: { id: data.id }, message: "Question posted" };
    }
    if (!z.guid().safeParse(id).success) return NOT_PERMITTED;
    const { data, error } = await ctx.supabase.from("daily_questions").update(row).eq("id", id).select("id");
    if (error?.code === "23505") return { ok: false, error: "There's already a question for that date." };
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate(id);
    return { ok: true, data: { id }, message: "Question updated" };
  });
}

export async function deleteDailyQuestion(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("daily_questions").delete().eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate();
    return { ok: true };
  });
}
