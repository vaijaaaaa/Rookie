import type { Profile, UserRole } from "@/types";

// UI-level helpers only. Real enforcement is Postgres RLS (supabase/migrations).
export const isStaff = (role: UserRole) => role === "instructor" || role === "admin";
export const isAdmin = (role: UserRole) => role === "admin";

export function canManageCourse(profile: Pick<Profile, "id" | "role">, instructorId: string | null) {
  return profile.role === "admin" || (profile.role === "instructor" && instructorId === profile.id);
}
