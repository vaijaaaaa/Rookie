"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { errorMessage } from "@/lib/utils";
import type { ActionResult, Note } from "@/types";

/**
 * Notes are private to their owner (RLS "notes: owner").
 * This file is a server-action module: every export is an async function
 * (types are erased). Import from Server Components or Client Components.
 */

export type NoteAttach = {
  lesson_id?: string;
  course_id?: string;
  problem_id?: string;
  class_id?: string;
};

export type NoteAttachType = "course" | "lesson" | "problem" | "class" | "none";

export type NoteListItem = Note & {
  course: { title: string; slug: string } | null;
  lesson: { title: string; slug: string; course: { slug: string } | null } | null;
  problem: { title: string; slug: string } | null;
  class: { title: string } | null;
};

export type NoteAttachOptions = {
  courses: { id: string; title: string }[];
  lessons: { id: string; title: string; course_id: string }[];
  problems: { id: string; title: string }[];
  classes: { id: string; title: string; starts_at: string }[];
};

const ATTACH_KEYS = ["course_id", "lesson_id", "problem_id", "class_id"] as const;

const optionalId = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.guid({ message: "Invalid id" }).nullable(),
);

const noteSchema = z.object({
  title: z.string().trim().max(200, "Title is too long").default(""),
  content: z.string().max(50_000, "Note is too long").default(""),
  course_id: optionalId.optional(),
  lesson_id: optionalId.optional(),
  problem_id: optionalId.optional(),
  class_id: optionalId.optional(),
});

export type NoteInput = {
  title?: string;
  content?: string;
  course_id?: string | null;
  lesson_id?: string | null;
  problem_id?: string | null;
  class_id?: string | null;
};

const idSchema = z.guid();

function cleanAttach(attach: NoteAttach) {
  const out: Partial<Record<(typeof ATTACH_KEYS)[number], string>> = {};
  for (const k of ATTACH_KEYS) {
    const v = attach[k];
    if (v && idSchema.safeParse(v).success) out[k] = v;
  }
  return out;
}

function revalidateNotes(id?: string) {
  revalidatePath("/notes");
  if (id) revalidatePath(`/notes/${id}`);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Notes attached to the given entity (all provided keys must match), newest first. */
export async function getNotesFor(attach: NoteAttach): Promise<Note[]> {
  const user = await getUser();
  if (!user) return [];
  const filters = cleanAttach(attach);
  if (Object.keys(filters).length === 0) return [];
  const supabase = await createClient();
  let query = supabase.from("notes").select("*").eq("user_id", user.id);
  for (const [k, v] of Object.entries(filters)) query = query.eq(k, v);
  const { data } = await query
    .order("updated_at", { ascending: false })
    .limit(50)
    .overrideTypes<Note[], { merge: false }>();
  return data ?? [];
}

/** The current user's notes with optional search and attachment filter. */
export async function listNotes(opts: { q?: string; type?: NoteAttachType } = {}): Promise<NoteListItem[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  let query = supabase
    .from("notes")
    .select(
      "*, course:courses(title, slug), lesson:lessons(title, slug, course:courses(slug)), problem:coding_problems(title, slug), class:classes(title)",
    )
    .eq("user_id", user.id);

  // Strip characters with meaning in PostgREST filter syntax / LIKE patterns.
  const q = (opts.q ?? "").replace(/[%_,()*\\:."']/g, " ").trim().slice(0, 100);
  if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);

  switch (opts.type) {
    case "course":
    case "lesson":
    case "problem":
    case "class":
      query = query.not(`${opts.type}_id`, "is", null);
      break;
    case "none":
      query = query.is("course_id", null).is("lesson_id", null).is("problem_id", null).is("class_id", null);
      break;
  }

  const { data } = await query
    .order("updated_at", { ascending: false })
    .limit(200)
    .overrideTypes<NoteListItem[], { merge: false }>();
  return data ?? [];
}

export async function getNote(id: string): Promise<Note | null> {
  if (!idSchema.safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("notes").select("*").eq("id", id).maybeSingle<Note>();
  return data ?? null;
}

/** Lists used by the note editor's "attach to" selects. */
export async function getNoteAttachOptions(): Promise<NoteAttachOptions> {
  const user = await getUser();
  if (!user) return { courses: [], lessons: [], problems: [], classes: [] };
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("course_enrollments")
    .select("course:courses(id, title, position)")
    .eq("user_id", user.id)
    .overrideTypes<{ course: { id: string; title: string; position: number } | null }[], { merge: false }>();
  const courses = (enrollments ?? [])
    .map((e) => e.course)
    .filter((c): c is NonNullable<typeof c> => !!c)
    .sort((a, b) => a.position - b.position)
    .map(({ id, title }) => ({ id, title }));
  const courseIds = courses.map((c) => c.id);

  const [lessonsRes, problemsRes, classesRes] = await Promise.all([
    courseIds.length
      ? supabase
          .from("lessons")
          .select("id, title, course_id, position, module:course_modules(position)")
          .in("course_id", courseIds)
          .eq("is_published", true)
          .limit(1000)
          .overrideTypes<
            { id: string; title: string; course_id: string; position: number; module: { position: number } | null }[],
            { merge: false }
          >()
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("coding_problems")
      .select("id, title")
      .eq("is_published", true)
      .order("title")
      .limit(500)
      .overrideTypes<{ id: string; title: string }[], { merge: false }>(),
    supabase
      .from("classes")
      .select("id, title, starts_at")
      .neq("status", "cancelled")
      .lte("starts_at", new Date(Date.now() + 14 * 86_400_000).toISOString())
      .order("starts_at", { ascending: false })
      .limit(50)
      .overrideTypes<{ id: string; title: string; starts_at: string }[], { merge: false }>(),
  ]);

  const lessons = (lessonsRes.data ?? [])
    .slice()
    .sort((a, b) => (a.module?.position ?? 0) - (b.module?.position ?? 0) || a.position - b.position)
    .map(({ id, title, course_id }) => ({ id, title, course_id }));

  return {
    courses,
    lessons,
    problems: problemsRes.data ?? [],
    classes: classesRes.data ?? [],
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createNote(input: NoteInput): Promise<ActionResult<Note>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note" };
  const v = parsed.data;
  if (!v.title && !v.content.trim()) return { ok: false, error: "Write something first." };

  try {
    const supabase = await createClient();
    // A lesson note also belongs to that lesson's course.
    let courseId = v.course_id ?? null;
    if (!courseId && v.lesson_id) {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("course_id")
        .eq("id", v.lesson_id)
        .maybeSingle<{ course_id: string }>();
      courseId = lesson?.course_id ?? null;
    }
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: v.title || deriveTitle(v.content),
        content: v.content,
        course_id: courseId,
        lesson_id: v.lesson_id ?? null,
        problem_id: v.problem_id ?? null,
        class_id: v.class_id ?? null,
      })
      .select("*")
      .single<Note>();
    if (error) throw error;
    revalidateNotes();
    return { ok: true, data, message: "Note saved" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateNote(id: string, input: NoteInput): Promise<ActionResult<Note>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid note" };
  const parsed = noteSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note" };
  const v = parsed.data;

  const patch: Record<string, string | null> = {};
  if (input.title !== undefined) patch.title = v.title || deriveTitle(v.content ?? "");
  if (input.content !== undefined) patch.content = v.content ?? "";
  for (const k of ATTACH_KEYS) if (input[k] !== undefined) patch[k] = v[k] ?? null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notes")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle<Note>();
    if (error) throw error;
    if (!data) return { ok: false, error: "Note not found" };
    revalidateNotes(id);
    return { ok: true, data, message: "Note updated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid note" };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    revalidateNotes(id);
    return { ok: true, message: "Note deleted" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

function deriveTitle(content: string) {
  const line = content
    .split("\n")
    .map((l) => l.replace(/^[#>*\-\s`]+/, "").trim())
    .find(Boolean);
  return line ? line.slice(0, 80) : "Untitled note";
}
