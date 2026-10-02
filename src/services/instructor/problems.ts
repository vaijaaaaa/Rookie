import "server-only";
import type { CodingProblem } from "@/types";
import type { StaffContext } from "./context";

export async function getManagedProblem(ctx: StaffContext, id: string): Promise<CodingProblem | null> {
  const { data } = await ctx.supabase.from("coding_problems").select("*").eq("id", id).maybeSingle<CodingProblem>();
  if (!data) return null;
  if (!ctx.isAdmin && data.created_by !== ctx.profile.id) return null;
  return data;
}
