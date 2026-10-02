import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  dateInTz,
  hhmmInTz,
  APP_TIME_ZONE,
  startOfWeek,
  widenedDayBounds,
} from "@/components/agenda/tz";
import type {
  AgendaItem,
  AgendaItemType,
  AgendaStatus,
  ClassStatus,
  Priority,
  Profile,
  SubmissionStatus,
} from "@/types";

/** One row on the day timeline: a real agenda item or a derived class/assignment. */
export interface AgendaEntry {
  key: string;
  kind: "item" | "class" | "assignment";
  /** agenda_items.id for kind === "item" */
  itemId: string | null;
  title: string;
  description: string;
  type: AgendaItemType;
  /** "HH:mm" local to the user's timezone */
  start: string | null;
  end: string | null;
  priority: Priority | null;
  status: AgendaStatus | null;
  done: boolean;
  /** personal items (owner_id = me) can be edited/deleted */
  personal: boolean;
  /** cohort agenda label (course title) for non-personal items */
  source: string | null;
  course: { id: string; title: string; slug: string } | null;
  lesson: { id: string; title: string; slug: string; courseSlug: string | null } | null;
  href: string | null;
  classStatus: ClassStatus | null;
  meetingUrl: string | null;
  submissionStatus: SubmissionStatus | null;
  /** Raw values for the edit form */
  raw: Pick<AgendaItem, "start_time" | "end_time" | "course_id" | "lesson_id"> | null;
}

export interface DayAgenda {
  date: string;
  timezone: string;
  entries: AgendaEntry[];
  /** completable agenda items */
  total: number;
  completed: number;
}

type ItemRow = AgendaItem & {
  course: { id: string; title: string; slug: string } | null;
  lesson: { id: string; title: string; slug: string; course: { slug: string } | null } | null;
  problem: { slug: string } | null;
  /** The linked class (if any and visible) — supplies Join link, status and real time. */
  class: { starts_at: string; duration_minutes: number; status: ClassStatus; meeting_url: string | null } | null;
};

type AgendaRow = {
  id: string;
  owner_id: string | null;
  course_id: string | null;
  title: string | null;
  course: { title: string } | null;
};

type ClassRow = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  duration_minutes: number;
  status: ClassStatus;
  meeting_url: string | null;
  course: { id: string; title: string; slug: string } | null;
};

type AssignmentRow = {
  id: string;
  title: string;
  description: string;
  due_at: string;
  course: { id: string; title: string; slug: string } | null;
  assignment_submissions: { status: SubmissionStatus }[];
};

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

/** Today (yyyy-MM-dd) in IST. */
export function todayFor(): string {
  return dateInTz(new Date(), APP_TIME_ZONE);
}

/** Everything on the user's plate for one calendar day, sorted by time. */
export const getDayAgenda = cache(async (profile: Pick<Profile, "id" | "timezone">, date: string): Promise<DayAgenda> => {
  const tz = APP_TIME_ZONE;
  const supabase = await createClient();
  const bounds = widenedDayBounds(date);

  const [agendasRes, classesRes, assignmentsRes] = await Promise.all([
    supabase
      .from("daily_agendas")
      .select("id, owner_id, course_id, title, course:courses(title)")
      .eq("date", date)
      .overrideTypes<AgendaRow[], { merge: false }>(),
    supabase
      .from("classes")
      .select("id, title, description, starts_at, duration_minutes, status, meeting_url, course:courses(id, title, slug)")
      .neq("status", "cancelled")
      .gte("starts_at", bounds.gte)
      .lt("starts_at", bounds.lt)
      .order("starts_at")
      .limit(50)
      .overrideTypes<ClassRow[], { merge: false }>(),
    supabase
      .from("assignments")
      .select("id, title, description, due_at, course:courses(id, title, slug), assignment_submissions(status)")
      .eq("is_published", true)
      .eq("assignment_submissions.user_id", profile.id)
      .gte("due_at", bounds.gte)
      .lt("due_at", bounds.lt)
      .limit(50)
      .overrideTypes<AssignmentRow[], { merge: false }>(),
  ]);

  // Personal agenda + cohort agendas of courses I'm in (RLS also lets staff
  // read agendas of courses they manage; keep those out of a personal view).
  const agendas = (agendasRes.data ?? []).filter((a) => a.owner_id === profile.id || a.course_id);
  const agendaById = new Map(agendas.map((a) => [a.id, a]));

  let items: ItemRow[] = [];
  const progress = new Map<string, AgendaStatus>();
  if (agendas.length) {
    const { data } = await supabase
      .from("agenda_items")
      .select(
        "*, course:courses(id, title, slug), lesson:lessons(id, title, slug, course:courses(slug)), problem:coding_problems(slug), class:classes(starts_at, duration_minutes, status, meeting_url)",
      )
      .in("agenda_id", [...agendaById.keys()])
      .overrideTypes<ItemRow[], { merge: false }>();
    items = data ?? [];
    if (items.length) {
      const { data: prog } = await supabase
        .from("agenda_item_progress")
        .select("item_id, status")
        .eq("user_id", profile.id)
        .in(
          "item_id",
          items.map((i) => i.id),
        )
        .overrideTypes<{ item_id: string; status: AgendaStatus }[], { merge: false }>();
      for (const p of prog ?? []) progress.set(p.item_id, p.status);
    }
  }

  const linkedClassIds = new Set(items.map((i) => i.class_id).filter(Boolean));
  const linkedAssignmentIds = new Set(items.map((i) => i.assignment_id).filter(Boolean));
  const entries: AgendaEntry[] = [];

  for (const i of items) {
    const agenda = agendaById.get(i.agenda_id);
    const personal = agenda?.owner_id === profile.id;
    const status = progress.get(i.id) ?? "todo";
    const lessonHref =
      i.lesson && i.lesson.course?.slug ? `/courses/${i.lesson.course.slug}/lessons/${i.lesson.slug}` : null;
    const href = i.class_id
      ? `/class/${i.class_id}`
      : i.assignment_id
        ? `/assignments/${i.assignment_id}`
        : i.problem
          ? `/practice/${i.problem.slug}`
          : (lessonHref ?? (i.course ? `/courses/${i.course.slug}` : null));
    // A linked class replaces the derived class entry, so carry its real time (unless the item sets one),
    // Join link and status onto the item.
    const cls = i.class;
    let start = hhmm(i.start_time);
    let end = hhmm(i.end_time);
    if (cls && !i.start_time) {
      const endAt = new Date(Date.parse(cls.starts_at) + cls.duration_minutes * 60_000);
      start = hhmmInTz(cls.starts_at, tz);
      end = dateInTz(endAt, tz) === dateInTz(cls.starts_at, tz) ? hhmmInTz(endAt, tz) : null;
    }
    entries.push({
      key: `item:${i.id}`,
      kind: "item",
      itemId: i.id,
      title: i.title,
      description: i.description,
      type: i.type,
      start,
      end,
      priority: i.priority,
      status,
      done: status === "done",
      personal,
      source: personal ? null : (agenda?.course?.title ?? agenda?.title ?? "Cohort"),
      course: i.course,
      lesson: i.lesson
        ? { id: i.lesson.id, title: i.lesson.title, slug: i.lesson.slug, courseSlug: i.lesson.course?.slug ?? null }
        : null,
      href,
      classStatus: cls?.status ?? null,
      meetingUrl: cls?.meeting_url ?? null,
      submissionStatus: null,
      raw: { start_time: i.start_time, end_time: i.end_time, course_id: i.course_id, lesson_id: i.lesson_id },
    });
  }

  for (const c of classesRes.data ?? []) {
    if (linkedClassIds.has(c.id) || dateInTz(c.starts_at, tz) !== date) continue;
    const endAt = new Date(Date.parse(c.starts_at) + c.duration_minutes * 60_000);
    entries.push({
      key: `class:${c.id}`,
      kind: "class",
      itemId: null,
      title: c.title,
      description: c.description,
      type: "class",
      start: hhmmInTz(c.starts_at, tz),
      end: dateInTz(endAt, tz) === date ? hhmmInTz(endAt, tz) : null,
      priority: null,
      status: null,
      done: c.status === "completed",
      personal: false,
      source: null,
      course: c.course,
      lesson: null,
      href: `/class/${c.id}`,
      classStatus: c.status,
      meetingUrl: c.meeting_url,
      submissionStatus: null,
      raw: null,
    });
  }

  for (const a of assignmentsRes.data ?? []) {
    if (linkedAssignmentIds.has(a.id) || dateInTz(a.due_at, tz) !== date) continue;
    const sub = a.assignment_submissions?.[0]?.status ?? null;
    entries.push({
      key: `assignment:${a.id}`,
      kind: "assignment",
      itemId: null,
      title: a.title,
      description: "",
      type: "assignment",
      start: hhmmInTz(a.due_at, tz),
      end: null,
      priority: null,
      status: null,
      done: sub === "submitted" || sub === "reviewed",
      personal: false,
      source: null,
      course: a.course,
      lesson: null,
      href: `/assignments/${a.id}`,
      classStatus: null,
      meetingUrl: null,
      submissionStatus: sub,
      raw: null,
    });
  }

  entries.sort((a, b) => {
    if (a.start && b.start) return a.start.localeCompare(b.start) || a.title.localeCompare(b.title);
    if (a.start) return -1;
    if (b.start) return 1;
    return a.title.localeCompare(b.title);
  });

  const completable = entries.filter((e) => e.kind === "item");
  return {
    date,
    timezone: tz,
    entries,
    total: completable.length,
    completed: completable.filter((e) => e.done).length,
  };
});

/** Dates (yyyy-MM-dd) in the Mon–Sun week of `date` that have anything scheduled. */
export async function getWeekMarkers(profile: Pick<Profile, "id" | "timezone">, date: string) {
  const tz = APP_TIME_ZONE;
  const from = startOfWeek(date);
  const to = addDays(from, 6);
  const bounds = widenedDayBounds(from, to);
  const supabase = await createClient();

  const [agendas, classes, assignments] = await Promise.all([
    supabase
      .from("daily_agendas")
      .select("date, owner_id, course_id, agenda_items(count)")
      .gte("date", from)
      .lte("date", to)
      .overrideTypes<
        { date: string; owner_id: string | null; course_id: string | null; agenda_items: { count: number }[] }[],
        { merge: false }
      >(),
    supabase
      .from("classes")
      .select("starts_at")
      .neq("status", "cancelled")
      .gte("starts_at", bounds.gte)
      .lt("starts_at", bounds.lt)
      .limit(200)
      .overrideTypes<{ starts_at: string }[], { merge: false }>(),
    supabase
      .from("assignments")
      .select("due_at")
      .eq("is_published", true)
      .gte("due_at", bounds.gte)
      .lt("due_at", bounds.lt)
      .limit(200)
      .overrideTypes<{ due_at: string }[], { merge: false }>(),
  ]);

  const days = new Set<string>();
  for (const a of agendas.data ?? []) {
    if ((a.owner_id === profile.id || a.course_id) && (a.agenda_items?.[0]?.count ?? 0) > 0) days.add(a.date);
  }
  for (const c of classes.data ?? []) days.add(dateInTz(c.starts_at, tz));
  for (const a of assignments.data ?? []) days.add(dateInTz(a.due_at, tz));

  return { from, days: [...days].filter((d) => d >= from && d <= to) };
}

/** Enrolled courses with their lessons, for the "add item" form. */
export async function getAgendaFormOptions(userId: string) {
  const supabase = await createClient();
  const { data: enr } = await supabase
    .from("course_enrollments")
    .select("course:courses(id, title, position)")
    .eq("user_id", userId)
    .overrideTypes<{ course: { id: string; title: string; position: number } | null }[], { merge: false }>();
  const courses = (enr ?? [])
    .map((e) => e.course)
    .filter((c): c is NonNullable<typeof c> => !!c)
    .sort((a, b) => a.position - b.position)
    .map(({ id, title }) => ({ id, title }));
  if (!courses.length) return { courses, lessons: [] as { id: string; title: string; course_id: string }[] };

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, course_id, position, module:course_modules(position)")
    .in(
      "course_id",
      courses.map((c) => c.id),
    )
    .eq("is_published", true)
    .limit(1000)
    .overrideTypes<
      { id: string; title: string; course_id: string; position: number; module: { position: number } | null }[],
      { merge: false }
    >();
  return {
    courses,
    lessons: (lessons ?? [])
      .slice()
      .sort((a, b) => (a.module?.position ?? 0) - (b.module?.position ?? 0) || a.position - b.position)
      .map(({ id, title, course_id }) => ({ id, title, course_id })),
  };
}
