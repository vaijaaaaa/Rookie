import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  ClassSession,
  Course,
  CourseProgressRow,
  Difficulty,
  Lesson,
  LessonResource,
  ProgressStatus,
} from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CourseCard = Pick<
  Course,
  "id" | "slug" | "title" | "summary" | "category" | "difficulty" | "estimated_hours" | "icon"
> & {
  instructor: { full_name: string } | null;
};

export type CatalogCourse = CourseCard & {
  lessonCount: number;
  completedLessons: number;
  percent: number;
  enrolled: boolean;
};

export type OutlineLesson = Pick<
  Lesson,
  "id" | "slug" | "title" | "position" | "estimated_minutes" | "is_published"
>;

export interface OutlineModule {
  id: string;
  title: string;
  description: string;
  position: number;
  lessons: OutlineLesson[];
}

export type CourseDetail = Pick<
  Course,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "description"
  | "category"
  | "difficulty"
  | "estimated_hours"
  | "icon"
  | "instructor_id"
> & {
  instructor: { full_name: string; avatar_url: string | null; username: string | null } | null;
  modules: OutlineModule[];
};

export type LessonDetail = Pick<
  Lesson,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "content"
  | "exercise"
  | "video_url"
  | "estimated_minutes"
  | "module_id"
  | "course_id"
>;

export type ProgressMap = Record<string, ProgressStatus>;

export interface CatalogFilters {
  q?: string;
  category?: string;
  difficulty?: Difficulty;
}

const CARD_COLUMNS =
  "id,slug,title,summary,category,difficulty,estimated_hours,icon,instructor:profiles!courses_instructor_id_fkey(full_name)";

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/** Published courses (filtered) merged with lesson counts, progress and enrollment. */
export async function listCatalog(filters: CatalogFilters, userId: string | null): Promise<CatalogCourse[]> {
  const supabase = await createClient();

  let query = supabase
    .from("courses")
    .select(CARD_COLUMNS)
    .eq("is_published", true)
    .order("position", { ascending: true })
    .order("title", { ascending: true });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  const q = filters.q?.replace(/[%_,()]/g, " ").trim();
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);

  const [{ data: courses }, progress, enrolled] = await Promise.all([
    query.overrideTypes<CourseCard[], { merge: false }>(),
    getCourseProgress(),
    userId ? getEnrolledCourseIds(userId) : Promise.resolve(new Set<string>()),
  ]);

  return (courses ?? []).map((c) => {
    const p = progress.get(c.id);
    return {
      ...c,
      lessonCount: p?.total_lessons ?? 0,
      completedLessons: userId ? (p?.completed_lessons ?? 0) : 0,
      percent: userId ? (p?.percent ?? 0) : 0,
      enrolled: enrolled.has(c.id),
    };
  });
}

/** Distinct categories across published courses. */
export async function listCourseCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("category")
    .eq("is_published", true)
    .overrideTypes<{ category: string }[], { merge: false }>();
  return Array.from(new Set((data ?? []).map((r) => r.category))).sort();
}

/**
 * Per-course lesson totals and the current user's completion (RPC). For visitors
 * completion is zero, totals still apply. Memoized per request.
 */
export const getCourseProgress = cache(async (): Promise<Map<string, CourseProgressRow>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_course_progress");
  const rows = (data ?? []) as CourseProgressRow[];
  return new Map(rows.map((r) => [r.course_id, r]));
});

export async function getEnrolledCourseIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_enrollments")
    .select("course_id")
    .eq("user_id", userId)
    .overrideTypes<{ course_id: string }[], { merge: false }>();
  return new Set((data ?? []).map((r) => r.course_id));
}

export async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("course_enrollments")
    .select("course_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("course_id", courseId);
  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Course detail + outline
// ---------------------------------------------------------------------------

type RawCourseDetail = Omit<CourseDetail, "modules"> & {
  course_modules: OutlineModule[] | null;
};

/** Course with its ordered modules → published lessons in a single query. Memoized per request. */
export const getCourseBySlug = cache(async (slug: string): Promise<CourseDetail | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(
      "id,slug,title,summary,description,category,difficulty,estimated_hours,icon,instructor_id," +
        "instructor:profiles!courses_instructor_id_fkey(full_name,avatar_url,username)," +
        "course_modules(id,title,description,position,lessons(id,slug,title,position,estimated_minutes,is_published))",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle<RawCourseDetail>();
  if (!data) return null;

  const { course_modules, ...course } = data;
  const modules = (course_modules ?? [])
    .map((m) => ({
      ...m,
      lessons: (m.lessons ?? [])
        .filter((l) => l.is_published)
        .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
  return { ...course, modules };
});

/** Lessons of a course in reading order. */
export function flattenLessons(modules: OutlineModule[]): OutlineLesson[] {
  return modules.flatMap((m) => m.lessons);
}

/** The current user's lesson statuses for the given lessons. */
export async function getLessonProgress(userId: string, lessonIds: string[]): Promise<ProgressMap> {
  if (lessonIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_progress")
    .select("lesson_id,status")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds)
    .overrideTypes<{ lesson_id: string; status: ProgressStatus }[], { merge: false }>();
  const map: ProgressMap = {};
  for (const r of data ?? []) map[r.lesson_id] = r.status;
  return map;
}

/** First lesson not completed (or the first lesson if all are complete / none started). */
export function nextLesson(lessons: OutlineLesson[], progress: ProgressMap): OutlineLesson | null {
  return lessons.find((l) => progress[l.id] !== "completed") ?? lessons[0] ?? null;
}

export type UpcomingClass = Pick<
  ClassSession,
  "id" | "title" | "starts_at" | "duration_minutes" | "status" | "meeting_url"
>;

export async function getUpcomingClassesForCourse(courseId: string, limit = 5): Promise<UpcomingClass[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("classes")
    .select("id,title,starts_at,duration_minutes,status,meeting_url")
    .eq("course_id", courseId)
    .in("status", ["scheduled", "live"])
    .gte("starts_at", since)
    .order("starts_at", { ascending: true })
    .limit(limit)
    .overrideTypes<UpcomingClass[], { merge: false }>();
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Lesson
// ---------------------------------------------------------------------------

export const getLesson = cache(async (courseId: string, lessonSlug: string): Promise<LessonDetail | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id,slug,title,summary,content,exercise,video_url,estimated_minutes,module_id,course_id")
    .eq("course_id", courseId)
    .eq("slug", lessonSlug)
    .eq("is_published", true)
    .maybeSingle<LessonDetail>();
  return data ?? null;
});

export type LessonResourceItem = Pick<LessonResource, "id" | "title" | "url" | "kind">;

export async function getLessonResources(lessonId: string): Promise<LessonResourceItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_resources")
    .select("id,title,url,kind")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: true })
    .overrideTypes<LessonResourceItem[], { merge: false }>();
  return data ?? [];
}
