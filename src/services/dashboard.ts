import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  ActivityLog,
  Announcement,
  ClassStatus,
  CourseProgressRow,
  MyStats,
  Profile,
  RoadmapProgressRow,
  SubmissionStatus,
} from "@/types";

const EMPTY_STATS: MyStats = {
  lessons_completed: 0,
  problems_solved: 0,
  problems_attempted: 0,
  courses_completed: 0,
  assignments_submitted: 0,
  classes_attended: 0,
  classes_total: 0,
  current_streak: 0,
  longest_streak: 0,
  active_today: false,
  solved_by_difficulty: {},
  language_usage: {},
};

/** get_my_stats(), memoized per request. Shared by dashboard / progress / achievements. */
export const getMyStats = cache(async (): Promise<MyStats> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_stats");
  return { ...EMPTY_STATS, ...((data as Partial<MyStats> | null) ?? {}) };
});

export type EnrolledCourse = { id: string; slug: string; title: string; icon: string | null; position: number; enrolled_at: string };

export const getEnrolledCourses = cache(async (userId: string): Promise<EnrolledCourse[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_enrollments")
    .select("enrolled_at, course:courses(id, slug, title, icon, position)")
    .eq("user_id", userId)
    .overrideTypes<
      { enrolled_at: string; course: Omit<EnrolledCourse, "enrolled_at"> | null }[],
      { merge: false }
    >();
  return (data ?? [])
    .filter((r) => r.course)
    .map((r) => ({ ...r.course!, enrolled_at: r.enrolled_at }))
    .sort((a, b) => a.position - b.position);
});

export const getCourseProgress = cache(async (): Promise<Map<string, CourseProgressRow>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_course_progress");
  return new Map(((data as CourseProgressRow[] | null) ?? []).map((r) => [r.course_id, r]));
});

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

export interface RoadmapSummary {
  roadmap: { id: string; slug: string; title: string };
  percent: number;
  completed: number;
  total: number;
  sections: { id: string; title: string; completed: number; total: number; percent: number }[];
}

export const getPrimaryRoadmap = cache(async (roadmapId: string | null): Promise<RoadmapSummary | null> => {
  if (!roadmapId) return null;
  const supabase = await createClient();
  const [roadmapRes, overallRes, nodesRes, progressRes] = await Promise.all([
    supabase.from("roadmaps").select("id, slug, title").eq("id", roadmapId).maybeSingle<RoadmapSummary["roadmap"]>(),
    supabase.rpc("get_roadmaps_progress"),
    supabase
      .from("roadmap_nodes")
      .select("id, parent_id, kind, title, position")
      .eq("roadmap_id", roadmapId)
      .order("position")
      .overrideTypes<
        { id: string; parent_id: string | null; kind: "section" | "topic"; title: string; position: number }[],
        { merge: false }
      >(),
    supabase.rpc("get_roadmap_progress", { p_roadmap_id: roadmapId }),
  ]);
  if (!roadmapRes.data) return null;

  const topicProgress = (progressRes.data as { node_id: string; completed: boolean }[] | null) ?? [];
  const done = new Set(topicProgress.filter((p) => p.completed).map((p) => p.node_id));
  const nodes = nodesRes.data ?? [];
  const sections = nodes
    .filter((n) => n.kind === "section")
    .map((s) => {
      const topics = nodes.filter((n) => n.parent_id === s.id && n.kind === "topic");
      const completed = topics.filter((t) => done.has(t.id)).length;
      return {
        id: s.id,
        title: s.title,
        completed,
        total: topics.length,
        percent: topics.length ? Math.round((completed / topics.length) * 100) : 0,
      };
    })
    .filter((s) => s.total > 0);

  const overall = ((overallRes.data as RoadmapProgressRow[] | null) ?? []).find((r) => r.roadmap_id === roadmapId);
  return {
    roadmap: roadmapRes.data,
    percent: overall?.percent ?? 0,
    completed: overall?.completed_topics ?? 0,
    total: overall?.total_topics ?? 0,
    sections,
  };
});

// ---------------------------------------------------------------------------
// Continue learning
// ---------------------------------------------------------------------------

export interface ContinueItem {
  course: { id: string; slug: string; title: string; icon: string | null };
  lesson: { id: string; slug: string; title: string; estimated_minutes: number };
  completed: number;
  total: number;
  percent: number;
  lastViewedAt: string | null;
  started: boolean;
}

export async function getContinueLearning(userId: string, limit = 3): Promise<ContinueItem[]> {
  const courses = await getEnrolledCourses(userId);
  if (!courses.length) return [];
  const supabase = await createClient();
  const courseIds = courses.map((c) => c.id);

  const [lessonsRes, progressRes] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, slug, title, course_id, position, estimated_minutes, module:course_modules(position)")
      .in("course_id", courseIds)
      .eq("is_published", true)
      .limit(2000)
      .overrideTypes<
        {
          id: string;
          slug: string;
          title: string;
          course_id: string;
          position: number;
          estimated_minutes: number;
          module: { position: number } | null;
        }[],
        { merge: false }
      >(),
    supabase
      .from("student_progress")
      .select("lesson_id, status, last_viewed_at")
      .eq("user_id", userId)
      .limit(5000)
      .overrideTypes<{ lesson_id: string; status: string; last_viewed_at: string }[], { merge: false }>(),
  ]);

  const progress = new Map((progressRes.data ?? []).map((p) => [p.lesson_id, p]));
  const byCourse = new Map<string, NonNullable<typeof lessonsRes.data>>();
  for (const l of lessonsRes.data ?? []) {
    const arr = byCourse.get(l.course_id) ?? [];
    arr.push(l);
    byCourse.set(l.course_id, arr);
  }

  const items: ContinueItem[] = [];
  for (const course of courses) {
    const lessons = (byCourse.get(course.id) ?? []).sort(
      (a, b) => (a.module?.position ?? 0) - (b.module?.position ?? 0) || a.position - b.position,
    );
    if (!lessons.length) continue;
    let completed = 0;
    let lastViewedAt: string | null = null;
    let next: (typeof lessons)[number] | null = null;
    for (const l of lessons) {
      const p = progress.get(l.id);
      if (p?.status === "completed") completed++;
      else if (!next) next = l;
      if (p && (!lastViewedAt || p.last_viewed_at > lastViewedAt)) lastViewedAt = p.last_viewed_at;
    }
    if (!next) continue; // course finished
    items.push({
      course: { id: course.id, slug: course.slug, title: course.title, icon: course.icon },
      lesson: { id: next.id, slug: next.slug, title: next.title, estimated_minutes: next.estimated_minutes },
      completed,
      total: lessons.length,
      percent: Math.round((completed / lessons.length) * 100),
      lastViewedAt,
      started: completed > 0 || !!lastViewedAt,
    });
  }

  // Most recently touched course first; untouched courses keep catalog order.
  items.sort((a, b) => {
    if (a.lastViewedAt && b.lastViewedAt) return b.lastViewedAt.localeCompare(a.lastViewedAt);
    if (a.lastViewedAt) return -1;
    if (b.lastViewedAt) return 1;
    return 0;
  });
  return items.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Classes, announcements, activity, assignments
// ---------------------------------------------------------------------------

export interface UpcomingClass {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  status: ClassStatus;
  meeting_url: string | null;
  course: { title: string; slug: string } | null;
  instructor: { full_name: string } | null;
  /** live now (status or within its time window) */
  isLive: boolean;
  /** live, or starting within 15 minutes */
  joinable: boolean;
}

/** Next class that hasn't ended yet (live classes first). */
export async function getUpcomingClass(): Promise<UpcomingClass | null> {
  const supabase = await createClient();
  const now = Date.now();
  const { data } = await supabase
    .from("classes")
    .select(
      "id, title, starts_at, duration_minutes, status, meeting_url, course:courses(title, slug), instructor:profiles(full_name)",
    )
    .in("status", ["scheduled", "live"])
    .gte("starts_at", new Date(now - 12 * 3_600_000).toISOString())
    .order("starts_at")
    .limit(10)
    .overrideTypes<Omit<UpcomingClass, "isLive" | "joinable">[], { merge: false }>();
  const open = (data ?? []).filter(
    (c) => new Date(c.starts_at).getTime() + c.duration_minutes * 60_000 > now,
  );
  const next = open.find((c) => c.status === "live") ?? open[0];
  if (!next) return null;
  const start = new Date(next.starts_at).getTime();
  const isLive = next.status === "live" || start <= now;
  return { ...next, isLive, joinable: isLive || start - now <= 15 * 60_000 };
}

export type AnnouncementRow = Pick<Announcement, "id" | "title" | "body" | "pinned" | "created_at"> & {
  course: { title: string } | null;
  author: { full_name: string } | null;
};

export async function getAnnouncements(limit = 3): Promise<AnnouncementRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, created_at, course:courses(title), author:profiles(full_name)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<AnnouncementRow[], { merge: false }>();
  return data ?? [];
}

export async function getRecentActivity(userId: string, limit = 6): Promise<ActivityLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(limit)
    .overrideTypes<ActivityLog[], { merge: false }>();
  return data ?? [];
}

export interface DueAssignment {
  id: string;
  title: string;
  due_at: string;
  points: number;
  course: { title: string } | null;
  status: SubmissionStatus | null;
}

/** Assignments due in the next 7 days that haven't been submitted. */
export async function getDueSoon(userId: string, limit = 3): Promise<DueAssignment[]> {
  const supabase = await createClient();
  const now = new Date();
  const { data } = await supabase
    .from("assignments")
    .select("id, title, due_at, points, course:courses(title), assignment_submissions(status)")
    .eq("is_published", true)
    .eq("assignment_submissions.user_id", userId)
    .gte("due_at", now.toISOString())
    .lte("due_at", new Date(now.getTime() + 7 * 86_400_000).toISOString())
    .order("due_at")
    .limit(25)
    .overrideTypes<
      (Omit<DueAssignment, "status"> & { assignment_submissions: { status: SubmissionStatus }[] })[],
      { merge: false }
    >();
  return (data ?? [])
    .map(({ assignment_submissions, ...a }) => ({ ...a, status: assignment_submissions?.[0]?.status ?? null }))
    .filter((a) => a.status !== "submitted" && a.status !== "reviewed")
    .slice(0, limit);
}

export function firstName(profile: Pick<Profile, "full_name" | "username" | "email">) {
  return (
    profile.full_name?.trim().split(/\s+/)[0] ||
    profile.username ||
    profile.email?.split("@")[0] ||
    "there"
  );
}
