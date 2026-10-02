"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { errorMessage } from "@/lib/utils";
import { isISODate } from "@/components/agenda/tz";
import type { ActionResult } from "@/types";

const PERSONAL_TYPES = ["task", "study", "revision", "problem"] as const;

const optionalId = z.preprocess((v) => (v === "" || v == null ? null : v), z.guid().nullable());
const optionalTime = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use HH:MM")
    .nullable(),
);

const itemSchema = z
  .object({
    date: z.string().refine(isISODate, "Invalid date"),
    title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
    description: z.string().trim().max(2000, "Description is too long").default(""),
    type: z.enum(PERSONAL_TYPES),
    priority: z.enum(["low", "medium", "high"]),
    start_time: optionalTime,
    end_time: optionalTime,
    course_id: optionalId,
    lesson_id: optionalId,
  })
  .refine((v) => !v.start_time || !v.end_time || v.end_time >= v.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  });

export type AgendaItemInput = z.input<typeof itemSchema>;

function revalidate() {
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

/** Mark an agenda item (personal or cohort) done / not done for the current user. */
export async function setAgendaItemDone(itemId: string, done: boolean): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };
  if (!z.guid().safeParse(itemId).success) return { ok: false, error: "Invalid item" };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("agenda_item_progress").upsert(
      {
        item_id: itemId,
        user_id: user.id,
        status: done ? "done" : "todo",
        completed_at: done ? new Date().toISOString() : null,
      },
      { onConflict: "item_id,user_id" },
    );
    if (error) throw error;
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Get-or-create the user's personal agenda for a date. */
async function personalAgendaId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, date: string) {
  const find = () =>
    supabase
      .from("daily_agendas")
      .select("id")
      .eq("owner_id", userId)
      .eq("date", date)
      .maybeSingle<{ id: string }>();
  const existing = await find();
  if (existing.data) return existing.data.id;
  const { data, error } = await supabase
    .from("daily_agendas")
    .insert({ owner_id: userId, date, created_by: userId })
    .select("id")
    .single<{ id: string }>();
  if (data) return data.id;
  // Lost a race against a concurrent insert (unique (owner_id, date)).
  if (error?.code === "23505") {
    const again = await find();
    if (again.data) return again.data.id;
  }
  throw error ?? new Error("Could not create agenda");
}

/** Is this item on the user's own (personal) agenda? */
async function ownsItem(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, itemId: string) {
  const { data } = await supabase
    .from("agenda_items")
    .select("id, daily_agendas!inner(owner_id)")
    .eq("id", itemId)
    .eq("daily_agendas.owner_id", userId)
    .maybeSingle();
  return !!data;
}

export async function saveAgendaItem(input: AgendaItemInput, itemId?: string): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item" };
  const v = parsed.data;

  try {
    const supabase = await createClient();

    // A lesson implies its course; keep them consistent.
    let courseId = v.course_id;
    if (v.lesson_id) {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("course_id")
        .eq("id", v.lesson_id)
        .maybeSingle<{ course_id: string }>();
      if (!lesson) return { ok: false, error: "Lesson not found" };
      courseId = lesson.course_id;
    }

    const agendaId = await personalAgendaId(supabase, user.id, v.date);
    const row = {
      agenda_id: agendaId,
      title: v.title,
      description: v.description,
      type: v.type,
      priority: v.priority,
      start_time: v.start_time,
      end_time: v.end_time,
      course_id: courseId,
      lesson_id: v.lesson_id,
    };

    if (itemId) {
      if (!z.guid().safeParse(itemId).success) return { ok: false, error: "Invalid item" };
      if (!(await ownsItem(supabase, user.id, itemId))) {
        return { ok: false, error: "Only your personal items can be edited." };
      }
      const { error } = await supabase.from("agenda_items").update(row).eq("id", itemId);
      if (error) throw error;
      revalidate();
      return { ok: true, data: { id: itemId }, message: "Item updated" };
    }

    const { data, error } = await supabase.from("agenda_items").insert(row).select("id").single<{ id: string }>();
    if (error) throw error;
    revalidate();
    return { ok: true, data, message: "Added to your agenda" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteAgendaItem(itemId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };
  if (!z.guid().safeParse(itemId).success) return { ok: false, error: "Invalid item" };
  try {
    const supabase = await createClient();
    if (!(await ownsItem(supabase, user.id, itemId))) {
      return { ok: false, error: "Only your personal items can be deleted." };
    }
    const { error } = await supabase.from("agenda_items").delete().eq("id", itemId);
    if (error) throw error;
    revalidate();
    return { ok: true, message: "Item deleted" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
