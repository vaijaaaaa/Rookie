import type { UserRole } from "@/types";

// UI-level helpers only. Real enforcement is Postgres RLS (supabase/migrations).
export const isStaff = (role: UserRole) => role === "admin";
export const isAdmin = (role: UserRole) => role === "admin";
