import "server-only";
import type { Course, Lesson } from "@/types";
import type { StaffContext } from "./context";

export async function getManagedCourse(ctx: StaffContext, id: string): Promise<Course | null> {
  const { data } = await ctx.supabase.from("courses").select("*").eq("id", id).maybeSingle<Course>();
  if (!data) return null;
  if (!ctx.isAdmin && data.instructor_id !== ctx.profile.id) return null;
  return data;
}

export async function getManagedLesson(
  ctx: StaffContext,
  courseId: string,
  lessonId: string,
): Promise<{ course: Course; lesson: Lesson } | null> {
  const course = await getManagedCourse(ctx, courseId);
  if (!course) return null;
  const { data } = await ctx.supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle<Lesson>();
  return data ? { course, lesson: data } : null;
}

export interface CurriculumModule {
  id: string;
  title: string;
  description: string;
  position: number;
  lessons: { id: string; title: string; slug: string; is_published: boolean; estimated_minutes: number; position: number }[];
}

export async function getCurriculum(ctx: StaffContext, courseId: string): Promise<CurriculumModule[]> {
  const { data } = await ctx.supabase
    .from("course_modules")
    .select("id, title, description, position, created_at, lessons(id, title, slug, is_published, estimated_minutes, position, created_at)")
    .eq("course_id", courseId)
    .order("position")
    .order("created_at")
    .overrideTypes<(CurriculumModule & { lessons: (CurriculumModule["lessons"][number] & { created_at: string })[] })[], { merge: false }>();
  return (data ?? []).map((m) => ({
    ...m,
    lessons: [...m.lessons].sort((a, b) => a.position - b.position || Date.parse(a.created_at) - Date.parse(b.created_at)),
  }));
}
