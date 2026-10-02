import "server-only";
import { cache } from "react";
import { addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { isClassLive, isClassPast } from "@/components/classes/class-time";
import type { AttendanceStatus, ClassSession } from "@/types";

export {
  JOIN_WINDOW_MINUTES,
  classEnd,
  classStart,
  isClassLive,
  isClassPast,
  joinState,
  type JoinState,
} from "@/components/classes/class-time";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassPerson {
  id: string;
  full_name: string;
  avatar_url: string | null;
  username: string | null;
  bio?: string | null;
}

export type ClassListItem = Pick<
  ClassSession,
  | "id"
  | "title"
  | "starts_at"
  | "duration_minutes"
  | "status"
  | "meeting_url"
  | "recording_url"
  | "course_id"
  | "module_id"
  | "instructor_id"
> & {
  instructor: ClassPerson | null;
  course: { id: string; slug: string; title: string } | null;
  module: { id: string; title: string } | null;
};

export type ClassDetail = ClassListItem &
  Pick<ClassSession, "description" | "agenda" | "resources" | "created_at">;

export type ClassTab = "upcoming" | "live" | "previous" | "recorded";
export const CLASS_TABS: ClassTab[] = ["upcoming", "live", "previous", "recorded"];

export function parseClassTab(v: string | string[] | undefined): ClassTab {
  const s = Array.isArray(v) ? v[0] : v;
  return CLASS_TABS.includes(s as ClassTab) ? (s as ClassTab) : "upcoming";
}

const LIST_SELECT =
  "id,title,starts_at,duration_minutes,status,meeting_url,recording_url,course_id,module_id,instructor_id," +
  "instructor:profiles!classes_instructor_id_fkey(id,full_name,avatar_url,username)," +
  "course:courses!classes_course_id_fkey(id,slug,title)," +
  "module:course_modules!classes_module_id_fkey(id,title)";

const DETAIL_SELECT =
  "id,title,description,agenda,resources,created_at,starts_at,duration_minutes,status,meeting_url,recording_url," +
  "course_id,module_id,instructor_id," +
  "instructor:profiles!classes_instructor_id_fkey(id,full_name,avatar_url,username,bio)," +
  "course:courses!classes_course_id_fkey(id,slug,title)," +
  "module:course_modules!classes_module_id_fkey(id,title)";

/** Longest class we look back over when hunting for "live now" sessions. */
const LIVE_LOOKBACK_HOURS = 12;
/** getUpcomingClasses keeps classes that started up to this long ago (they may still be running). */
const UPCOMING_GRACE_HOURS = 3;
const LIST_LIMIT = 60;

function hoursAgoISO(now: number, hours: number) {
  return new Date(now - hours * 3_600_000).toISOString();
}

function normalizeResources<T extends { resources?: unknown }>(row: T): T {
  if (!("resources" in row)) return row;
  const raw = Array.isArray(row.resources) ? row.resources : [];
  const resources = raw
    .filter((r): r is { title?: unknown; url?: unknown } => typeof r === "object" && r !== null)
    .filter((r) => typeof r.url === "string" && r.url.length > 0)
    .map((r) => ({ title: typeof r.title === "string" && r.title ? r.title : String(r.url), url: String(r.url) }));
  return { ...row, resources };
}

// ---------------------------------------------------------------------------
// Queries (RLS decides visibility: anon → upcoming only; students → roster + open classes)
// ---------------------------------------------------------------------------

/** Classes visible to the current user that started at most a few hours ago, soonest first. */
export async function getUpcomingClasses(limit = 5): Promise<ClassListItem[]> {
  const supabase = await createClient();
  const now = Date.now();
  const { data } = await supabase
    .from("classes")
    .select(LIST_SELECT)
    .gte("starts_at", hoursAgoISO(now, UPCOMING_GRACE_HOURS))
    .neq("status", "cancelled")
    .neq("status", "completed")
    .order("starts_at", { ascending: true })
    .limit(limit)
    .overrideTypes<ClassListItem[], { merge: false }>();
  return (data ?? []).filter((c) => !isClassPast(c, now));
}

/** All classes visible to the current user that start on the given local date (yyyy-MM-dd). */
export async function getClassesOn(dateISO: string): Promise<ClassListItem[]> {
  const start = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];
  return getClassesBetween(start, addDays(start, 1));
}

/** Classes visible to the current user with starts_at in [from, to). */
export async function getClassesBetween(from: Date, to: Date): Promise<ClassListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select(LIST_SELECT)
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at", { ascending: true })
    .overrideTypes<ClassListItem[], { merge: false }>();
  return data ?? [];
}

/** Classes for one tab of /classes. */
export async function listClasses(tab: ClassTab): Promise<{ classes: ClassListItem[]; now: number }> {
  const supabase = await createClient();
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  const base = () => supabase.from("classes").select(LIST_SELECT);

  if (tab === "upcoming") {
    const { data } = await base()
      .gt("starts_at", nowISO)
      .neq("status", "completed")
      .order("starts_at", { ascending: true })
      .limit(LIST_LIMIT)
      .overrideTypes<ClassListItem[], { merge: false }>();
    return { classes: (data ?? []).filter((c) => !isClassLive(c, now)), now };
  }

  if (tab === "live") {
    const { data } = await base()
      .or(`status.eq.live,and(starts_at.lte."${nowISO}",starts_at.gte."${hoursAgoISO(now, LIVE_LOOKBACK_HOURS)}")`)
      .order("starts_at", { ascending: true })
      .limit(LIST_LIMIT)
      .overrideTypes<ClassListItem[], { merge: false }>();
    return { classes: (data ?? []).filter((c) => isClassLive(c, now)), now };
  }

  if (tab === "recorded") {
    const { data } = await base()
      .not("recording_url", "is", null)
      .order("starts_at", { ascending: false })
      .limit(LIST_LIMIT)
      .overrideTypes<ClassListItem[], { merge: false }>();
    return { classes: data ?? [], now };
  }

  const { data } = await base()
    .lte("starts_at", nowISO)
    .order("starts_at", { ascending: false })
    .limit(LIST_LIMIT)
    .overrideTypes<ClassListItem[], { merge: false }>();
  return { classes: (data ?? []).filter((c) => !isClassLive(c, now)), now };
}

/** One class, or null when it doesn't exist / RLS hides it. Memoized per request. */
export const getClass = cache(async (id: string): Promise<ClassDetail | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select(DETAIL_SELECT).eq("id", id).maybeSingle<ClassDetail>();
  return data ? normalizeResources(data) : null;
});

/** The current user's attendance status keyed by class id (read only). */
export async function getMyAttendanceFor(
  userId: string,
  classIds: string[],
): Promise<Map<string, { status: AttendanceStatus; note: string | null }>> {
  const map = new Map<string, { status: AttendanceStatus; note: string | null }>();
  if (classIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("class_id,status,note")
    .eq("user_id", userId)
    .in("class_id", classIds)
    .overrideTypes<{ class_id: string; status: AttendanceStatus; note: string | null }[], { merge: false }>();
  for (const row of data ?? []) map.set(row.class_id, { status: row.status, note: row.note });
  return map;
}
