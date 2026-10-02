import "server-only";
import type { StaffContext } from "@/services/instructor/context";

/** Distinct topics already used, for the topic suggestions list. */
export async function getProblemTopics(ctx: StaffContext): Promise<string[]> {
  const { data } = await ctx.supabase
    .from("coding_problems")
    .select("topic")
    .limit(1000)
    .overrideTypes<{ topic: string }[], { merge: false }>();
  return [...new Set((data ?? []).map((r) => r.topic))].sort();
}
