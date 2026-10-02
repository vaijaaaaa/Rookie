import "server-only";
import type { ActionResult } from "@/types";
import { dbError, NOT_PERMITTED, type Supabase } from "./context";

/**
 * Moves row `id` one step up/down among its siblings (rows of `table` matching
 * `scope`) and rewrites `position` as 0..n-1. Siblings are loaded ordered by
 * position, then created_at, so legacy rows sharing a position get normalized.
 */
export async function moveRow(
  supabase: Supabase,
  table: string,
  id: string,
  scope: Record<string, string | null>,
  direction: "up" | "down",
): Promise<ActionResult> {
  let q = supabase.from(table).select("id, position");
  for (const [col, val] of Object.entries(scope)) q = val === null ? q.is(col, null) : q.eq(col, val);
  const { data, error } = await q
    .order("position")
    .order("created_at")
    .overrideTypes<{ id: string; position: number }[], { merge: false }>();
  if (error) return dbError(error);
  const rows = data ?? [];
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return NOT_PERMITTED;
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= rows.length) return { ok: true };
  const ordered = [...rows];
  [ordered[idx], ordered[target]] = [ordered[target]!, ordered[idx]!];
  const updates = ordered
    .map((r, i) => ({ id: r.id, position: i, changed: r.position !== i }))
    .filter((r) => r.changed);
  const results = await Promise.all(
    updates.map((u) => supabase.from(table).update({ position: u.position }).eq("id", u.id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return dbError(failed.error);
  return { ok: true };
}

/** Next position (max + 1) among siblings. */
export async function nextPosition(
  supabase: Supabase,
  table: string,
  scope: Record<string, string | null>,
): Promise<number> {
  let q = supabase.from(table).select("position");
  for (const [col, val] of Object.entries(scope)) q = val === null ? q.is(col, null) : q.eq(col, val);
  const { data } = await q
    .order("position", { ascending: false })
    .limit(1)
    .overrideTypes<{ position: number }[], { merge: false }>();
  return data?.[0] ? data[0].position + 1 : 0;
}
