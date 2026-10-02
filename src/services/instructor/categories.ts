import "server-only";
import type { StaffContext } from "./context";

/** Distinct course categories (for autocomplete). */
export async function getCourseCategories(ctx: StaffContext): Promise<string[]> {
  const { data } = await ctx.supabase.from("courses").select("category").limit(500).overrideTypes<{ category: string }[], { merge: false }>();
  return [...new Set((data ?? []).map((c) => c.category))].sort();
}
