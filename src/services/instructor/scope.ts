import "server-only";
import type { StaffContext } from "./context";

/** Course ids the current staff member manages (admins: every course). */
export async function getManagedCourseIds(ctx: StaffContext): Promise<string[]> {
  let q = ctx.supabase.from("courses").select("id");
  if (!ctx.isAdmin) q = q.eq("instructor_id", ctx.profile.id);
  const { data } = await q.overrideTypes<{ id: string }[], { merge: false }>();
  return (data ?? []).map((c) => c.id);
}

/** PostgREST `or` filter for classes the instructor manages; null for admins (no filter). */
export function classScopeFilter(ctx: StaffContext, courseIds: string[]): string | null {
  if (ctx.isAdmin) return null;
  const parts = [`instructor_id.eq.${ctx.profile.id}`];
  if (courseIds.length) parts.push(`course_id.in.(${courseIds.join(",")})`);
  return parts.join(",");
}

export interface CourseOption {
  id: string;
  title: string;
}

export async function getCourseOptions(ctx: StaffContext): Promise<CourseOption[]> {
  let q = ctx.supabase.from("courses").select("id, title").order("title");
  if (!ctx.isAdmin) q = q.eq("instructor_id", ctx.profile.id);
  const { data } = await q.overrideTypes<CourseOption[], { merge: false }>();
  return data ?? [];
}

export interface ModuleOption {
  id: string;
  title: string;
  course_id: string;
}

export async function getModuleOptions(ctx: StaffContext, courseIds: string[]): Promise<ModuleOption[]> {
  if (!courseIds.length) return [];
  const { data } = await ctx.supabase
    .from("course_modules")
    .select("id, title, course_id")
    .in("course_id", courseIds)
    .order("position")
    .overrideTypes<ModuleOption[], { merge: false }>();
  return data ?? [];
}

export interface LessonOption {
  id: string;
  title: string;
  course_id: string;
}

export async function getLessonOptions(ctx: StaffContext, courseIds?: string[]): Promise<LessonOption[]> {
  let q = ctx.supabase.from("lessons").select("id, title, course_id").order("position").limit(2000);
  if (courseIds) {
    if (!courseIds.length) return [];
    q = q.in("course_id", courseIds);
  }
  const { data } = await q.overrideTypes<LessonOption[], { merge: false }>();
  return data ?? [];
}

export interface PersonOption {
  id: string;
  full_name: string;
  email: string | null;
}

/** Admins — for assigning which admin teaches a course or class. */
export async function getStaffOptions(ctx: StaffContext): Promise<PersonOption[]> {
  if (!ctx.isAdmin) return [];
  const { data } = await ctx.supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "admin")
    .order("full_name")
    .overrideTypes<PersonOption[], { merge: false }>();
  return data ?? [];
}
