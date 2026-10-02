import "server-only";
import { addDays, format, startOfWeek, subDays, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { ActivityLog, ActivityType, AttendanceStatus, Profile, UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformStats {
  total_students: number;
  total_instructors: number;
  active_courses: number;
  classes_this_week: number;
  avg_attendance: number;
  assignments_completed: number;
  active_users_7d: number;
  student_growth: { week: string; count: number }[];
  daily_activity: { day: string; count: number }[];
  attendance_by_week: { week: string; rate: number }[];
  course_progress: { course: string; enrolled: number; completion: number }[];
}

export type AdminUserRow = Pick<
  Profile,
  "id" | "email" | "full_name" | "username" | "avatar_url" | "role" | "onboarded_at" | "created_at"
> & { last_active: string | null };

export interface UserListParams {
  page: number;
  q: string;
  role: UserRole | null;
}

export const USERS_PAGE_SIZE = 25;

export const ACTIVITY_TYPES: ActivityType[] = [
  "lesson_completed",
  "problem_solved",
  "class_attended",
  "assignment_submitted",
  "roadmap_node_completed",
  "course_completed",
  "achievement_unlocked",
];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  lesson_completed: "Lessons completed",
  problem_solved: "Problems solved",
  class_attended: "Classes attended",
  assignment_submitted: "Assignments submitted",
  roadmap_node_completed: "Roadmap topics",
  course_completed: "Courses completed",
  achievement_unlocked: "Achievements",
};

export const ROLES: UserRole[] = ["student", "admin"];

export function isUserRole(v: unknown): v is UserRole {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip characters that would break a PostgREST `or=(...)` filter or act as wildcards. */
function sanitizeSearch(q: string) {
  return q.replace(/[%_*,()"\\:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

const EMPTY_STATS: PlatformStats = {
  total_students: 0,
  total_instructors: 0,
  active_courses: 0,
  classes_this_week: 0,
  avg_attendance: 0,
  assignments_completed: 0,
  active_users_7d: 0,
  student_growth: [],
  daily_activity: [],
  attendance_by_week: [],
  course_progress: [],
};

/** Weekly series for the last `weeks` weeks (Mon-start, matches Postgres date_trunc('week')). */
export function fillWeeks(rows: { week: string; count: number }[], weeks = 12) {
  const byWeek = new Map(rows.map((r) => [r.week, Number(r.count)]));
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: weeks }, (_, i) => {
    const d = subWeeks(start, weeks - 1 - i);
    const key = format(d, "yyyy-MM-dd");
    return { week: format(d, "MMM d"), signups: byWeek.get(key) ?? 0 };
  });
}

/** Daily series for the last `days` days, zero-filled. */
export function fillDays(rows: { day: string; count: number }[], days = 30) {
  const byDay = new Map(rows.map((r) => [r.day, Number(r.count)]));
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = subDays(today, days - 1 - i);
    const key = format(d, "yyyy-MM-dd");
    return { day: format(d, "MMM d"), events: byDay.get(key) ?? 0 };
  });
}

export function attendanceSeries(rows: { week: string; rate: number }[]) {
  return rows.map((r) => ({ week: format(new Date(`${r.week}T00:00:00`), "MMM d"), rate: Number(r.rate) }));
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createClient();
  const [{ data, error }, admins] = await Promise.all([
    supabase.rpc("get_platform_stats"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
  ]);
  if (error || !data) return EMPTY_STATS;
  // Two roles only: the "instructors" figure is the admin count.
  return { ...EMPTY_STATS, ...(data as Partial<PlatformStats>), total_instructors: admins.count ?? 0 };
}

export async function getRecentSignups(limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "role" | "created_at">[], { merge: false }>();
  return data ?? [];
}

export async function getRoleCounts(): Promise<Record<UserRole | "all", number>> {
  const supabase = await createClient();
  const count = (role?: UserRole) => {
    let q = supabase.from("profiles").select("id", { count: "exact", head: true });
    if (role) q = q.eq("role", role);
    return q.then((r) => r.count ?? 0);
  };
  const [all, student, admin] = await Promise.all([count(), count("student"), count("admin")]);
  return { all, student, admin };
}

export async function listUsers({ page, q, role }: UserListParams) {
  const supabase = await createClient();
  const from = (page - 1) * USERS_PAGE_SIZE;
  let query = supabase
    .from("profiles")
    .select("id, email, full_name, username, avatar_url, role, onboarded_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + USERS_PAGE_SIZE - 1);
  if (role) query = query.eq("role", role);
  const term = sanitizeSearch(q);
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);

  const { data, count, error } = await query.overrideTypes<Omit<AdminUserRow, "last_active">[], { merge: false }>();
  const rows = data ?? [];

  // Last activity for this page only (bounded to the last 90 days).
  const lastActive = new Map<string, string>();
  if (rows.length) {
    const { data: acts } = await supabase
      .from("activity_logs")
      .select("user_id, occurred_at")
      .in("user_id", rows.map((r) => r.id))
      .gte("occurred_at", subDays(new Date(), 90).toISOString())
      .order("occurred_at", { ascending: false })
      .limit(1000)
      .overrideTypes<Pick<ActivityLog, "user_id" | "occurred_at">[], { merge: false }>();
    for (const a of acts ?? []) if (!lastActive.has(a.user_id)) lastActive.set(a.user_id, a.occurred_at);
  }

  return {
    users: rows.map((r) => ({ ...r, last_active: lastActive.get(r.id) ?? null })) as AdminUserRow[],
    total: count ?? 0,
    error: error?.message ?? null,
  };
}

export interface UserEnrollment {
  course_id: string;
  enrolled_at: string;
  title: string;
  slug: string;
  completed: number;
  total: number;
}

export async function getUserDetail(id: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!profile) return null;

  const [enrollRes, attendanceRes, recentRes, typeCounts] = await Promise.all([
    supabase
      .from("course_enrollments")
      .select("course_id, enrolled_at, courses(title, slug)")
      .eq("user_id", id)
      .order("enrolled_at", { ascending: false })
      .limit(50)
      .overrideTypes<
        { course_id: string; enrolled_at: string; courses: { title: string; slug: string } | null }[],
        { merge: false }
      >(),
    supabase
      .from("attendance")
      .select("status")
      .eq("user_id", id)
      .limit(2000)
      .overrideTypes<{ status: AttendanceStatus }[], { merge: false }>(),
    supabase
      .from("activity_logs")
      .select("id, type, title, occurred_at")
      .eq("user_id", id)
      .order("occurred_at", { ascending: false })
      .limit(12)
      .overrideTypes<Pick<ActivityLog, "id" | "type" | "title" | "occurred_at">[], { merge: false }>(),
    Promise.all(
      ACTIVITY_TYPES.map((t) =>
        supabase
          .from("activity_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", id)
          .eq("type", t)
          .then((r) => [t, r.count ?? 0] as const),
      ),
    ),
  ]);

  const enrollRows = enrollRes.data ?? [];
  const courseIds = enrollRows.map((e) => e.course_id);

  // Per-course lesson completion for this user.
  const totals = new Map<string, number>();
  const done = new Map<string, number>();
  if (courseIds.length) {
    const [lessonsRes, progressRes] = await Promise.all([
      supabase
        .from("lessons")
        .select("course_id")
        .in("course_id", courseIds)
        .eq("is_published", true)
        .limit(5000)
        .overrideTypes<{ course_id: string }[], { merge: false }>(),
      supabase
        .from("student_progress")
        .select("lesson_id, lessons!inner(course_id, is_published)")
        .eq("user_id", id)
        .eq("status", "completed")
        .in("lessons.course_id", courseIds)
        .eq("lessons.is_published", true)
        .limit(5000)
        .overrideTypes<{ lesson_id: string; lessons: { course_id: string } | null }[], { merge: false }>(),
    ]);
    for (const l of lessonsRes.data ?? []) totals.set(l.course_id, (totals.get(l.course_id) ?? 0) + 1);
    for (const p of progressRes.data ?? []) {
      const cid = p.lessons?.course_id;
      if (cid) done.set(cid, (done.get(cid) ?? 0) + 1);
    }
  }

  const enrollments: UserEnrollment[] = enrollRows.map((e) => ({
    course_id: e.course_id,
    enrolled_at: e.enrolled_at,
    title: e.courses?.title ?? "Untitled course",
    slug: e.courses?.slug ?? "",
    completed: done.get(e.course_id) ?? 0,
    total: totals.get(e.course_id) ?? 0,
  }));

  const attendance: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const a of attendanceRes.data ?? []) attendance[a.status] += 1;

  return {
    profile,
    enrollments,
    attendance,
    activityCounts: Object.fromEntries(typeCounts) as Record<ActivityType, number>,
    recentActivity: recentRes.data ?? [],
  };
}

export interface PlatformSettings {
  site_name: string;
  default_timezone: string;
  announcement_banner: string;
  maintenance_mode: boolean;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  site_name: "Rookie",
  default_timezone: "UTC",
  announcement_banner: "",
  maintenance_mode: false,
};

export async function getPlatformSettings(): Promise<{ settings: PlatformSettings; updatedAt: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("key, value, updated_at")
    .in("key", Object.keys(DEFAULT_SETTINGS))
    .overrideTypes<{ key: string; value: unknown; updated_at: string }[], { merge: false }>();

  const settings: PlatformSettings = { ...DEFAULT_SETTINGS };
  let updatedAt: string | null = null;
  for (const row of data ?? []) {
    const def = DEFAULT_SETTINGS[row.key as keyof PlatformSettings];
    if (typeof row.value === typeof def) {
      (settings as unknown as Record<string, unknown>)[row.key] = row.value;
    }
    if (!updatedAt || row.updated_at > updatedAt) updatedAt = row.updated_at;
  }
  return { settings, updatedAt };
}

export interface PlatformAnalytics {
  totalUsers: number;
  active7d: number;
  active30d: number;
  /** True when the 30-day scan hit its row cap (counts are lower bounds). */
  activeTruncated: boolean;
  coursesCompleted: number;
  assignmentsSubmitted: number;
  assignmentsExpected: number;
  activityByType: { type: ActivityType; label: string; count: number }[];
}

const ACTIVE_SCAN_LIMIT = 20000;

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const supabase = await createClient();
  const now = new Date();
  const since30 = subDays(now, 30).toISOString();
  const since7 = subDays(now, 7).toISOString();

  const [totalRes, activeRes, coursesCompletedRes, byType, pastDueRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("activity_logs")
      .select("user_id, occurred_at")
      .gte("occurred_at", since30)
      .order("occurred_at", { ascending: false })
      .limit(ACTIVE_SCAN_LIMIT)
      .overrideTypes<Pick<ActivityLog, "user_id" | "occurred_at">[], { merge: false }>(),
    supabase.from("activity_logs").select("id", { count: "exact", head: true }).eq("type", "course_completed"),
    Promise.all(
      ACTIVITY_TYPES.map((t) =>
        supabase
          .from("activity_logs")
          .select("id", { count: "exact", head: true })
          .eq("type", t)
          .gte("occurred_at", since30)
          .then((r) => ({ type: t, label: ACTIVITY_LABELS[t], count: r.count ?? 0 })),
      ),
    ),
    supabase
      .from("assignments")
      .select("id, course_id")
      .eq("is_published", true)
      .lt("due_at", now.toISOString())
      .order("due_at", { ascending: false })
      .limit(300) // keeps the follow-up `in()` filter URL bounded
      .overrideTypes<{ id: string; course_id: string }[], { merge: false }>(),
  ]);

  const activeRows = activeRes.data ?? [];
  const users30 = new Set<string>();
  const users7 = new Set<string>();
  for (const r of activeRows) {
    users30.add(r.user_id);
    if (r.occurred_at >= since7) users7.add(r.user_id);
  }

  // Assignments: submitted vs expected (past-due published assignments x enrolled students).
  const pastDue = pastDueRes.data ?? [];
  let assignmentsExpected = 0;
  let assignmentsSubmitted = 0;
  if (pastDue.length) {
    const perCourse = new Map<string, number>();
    for (const a of pastDue) perCourse.set(a.course_id, (perCourse.get(a.course_id) ?? 0) + 1);
    const [enrollCounts, submittedRes] = await Promise.all([
      Promise.all(
        [...perCourse.keys()].map((cid) =>
          supabase
            .from("course_enrollments")
            .select("user_id", { count: "exact", head: true })
            .eq("course_id", cid)
            .then((r) => (r.count ?? 0) * (perCourse.get(cid) ?? 0)),
        ),
      ),
      supabase
        .from("assignment_submissions")
        .select("id", { count: "exact", head: true })
        .in("assignment_id", pastDue.map((a) => a.id))
        .in("status", ["submitted", "reviewed"]),
    ]);
    assignmentsExpected = enrollCounts.reduce((s, n) => s + n, 0);
    assignmentsSubmitted = submittedRes.count ?? 0;
  }

  return {
    totalUsers: totalRes.count ?? 0,
    active7d: users7.size,
    active30d: users30.size,
    activeTruncated: activeRows.length >= ACTIVE_SCAN_LIMIT,
    coursesCompleted: coursesCompletedRes.count ?? 0,
    assignmentsSubmitted,
    assignmentsExpected,
    activityByType: byType.sort((a, b) => b.count - a.count),
  };
}

/** Monday of the current week + 6 days, for display. */
export function currentWeekRange() {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return `${format(start, "MMM d")} – ${format(addDays(start, 6), "MMM d")}`;
}
