import "server-only";
import type { Assignment } from "@/types";
import type { StaffContext } from "./context";

export async function getManagedAssignment(ctx: StaffContext, id: string): Promise<(Assignment & { courses: { title: string; instructor_id: string | null } | null }) | null> {
  const { data } = await ctx.supabase
    .from("assignments")
    .select("*, courses(title, instructor_id)")
    .eq("id", id)
    .maybeSingle<Assignment & { courses: { title: string; instructor_id: string | null } | null }>();
  if (!data) return null;
  if (!ctx.isAdmin && data.courses?.instructor_id !== ctx.profile.id) return null;
  return data;
}

/** Enrolled student count per course. */
export async function getEnrollmentCounts(ctx: StaffContext, courseIds: string[]): Promise<Map<string, number>> {
  const entries = await Promise.all(
    courseIds.map(async (id) => {
      const { count } = await ctx.supabase.from("course_enrollments").select("user_id", { count: "exact", head: true }).eq("course_id", id);
      return [id, count ?? 0] as const;
    }),
  );
  return new Map(entries);
}
