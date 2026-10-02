"use server";

import { revalidatePath } from "next/cache";
import { dbError, invalid, NOT_PERMITTED, withStaff, type StaffContext } from "@/services/instructor/context";
import { agendaItemSchema, type AgendaItemInput } from "@/services/instructor/schemas";
import type { ActionResult } from "@/types";

function revalidate() {
  revalidatePath("/admin/agendas");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

/** Find the cohort agenda for (course, date) or create it. The unique index is partial, so no upsert. */
async function ensureAgenda(ctx: StaffContext, courseId: string, date: string, title: string) {
  const find = () =>
    ctx.supabase.from("daily_agendas").select("id").eq("course_id", courseId).eq("date", date).maybeSingle<{ id: string }>();
  const existing = await find();
  if (existing.data) return { id: existing.data.id, error: null };
  const { data, error } = await ctx.supabase
    .from("daily_agendas")
    .insert({ course_id: courseId, date, title: title || null, created_by: ctx.profile.id })
    .select("id")
    .single<{ id: string }>();
  if (error?.code === "23505") {
    const again = await find();
    return { id: again.data?.id ?? null, error: again.error };
  }
  return { id: data?.id ?? null, error };
}

export async function addCohortAgendaItem(input: AgendaItemInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = agendaItemSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const agenda = await ensureAgenda(ctx, v.course_id, v.date, v.agenda_title.trim());
    if (agenda.error) return dbError(agenda.error);
    if (!agenda.id) return NOT_PERMITTED;
    const { error } = await ctx.supabase.from("agenda_items").insert({
      agenda_id: agenda.id,
      title: v.title,
      description: v.description,
      type: v.type,
      start_time: v.start_time || null,
      end_time: v.end_time || null,
      priority: v.priority,
      course_id: v.course_id,
      lesson_id: v.lesson_id || null,
      class_id: v.class_id || null,
      assignment_id: v.assignment_id || null,
      problem_id: v.problem_id || null,
    });
    if (error) return dbError(error);
    revalidate();
    return { ok: true, message: "Added to the cohort agenda" };
  });
}

export async function deleteAgendaItem(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("agenda_items").delete().eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate();
    return { ok: true };
  });
}

export async function deleteAgenda(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("daily_agendas").delete().eq("id", id).not("course_id", "is", null).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate();
    return { ok: true };
  });
}
