import "server-only";
import type { ClassSession } from "@/types";
import type { StaffContext } from "./context";

/** Loads a class if the current staff member can manage it, else null. */
export async function getManagedClass(ctx: StaffContext, id: string): Promise<ClassSession | null> {
  const { data } = await ctx.supabase.from("classes").select("*").eq("id", id).maybeSingle<ClassSession>();
  if (!data) return null;
  if (ctx.isAdmin || data.instructor_id === ctx.profile.id) return data;
  if (data.course_id) {
    const { data: course } = await ctx.supabase
      .from("courses")
      .select("id")
      .eq("id", data.course_id)
      .eq("instructor_id", ctx.profile.id)
      .maybeSingle<{ id: string }>();
    if (course) return data;
  }
  return null;
}

export interface ClassListRow {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  status: ClassSession["status"];
  course_id: string | null;
  meeting_url: string | null;
  courses: { title: string } | null;
  attendance: { count: number }[];
}

export const CLASS_LIST_SELECT =
  "id, title, starts_at, duration_minutes, status, course_id, meeting_url, courses(title), attendance(count)";
