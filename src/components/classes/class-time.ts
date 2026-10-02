import type { ClassSession } from "@/types";

/** Minutes before start when the "Join" button unlocks. */
export const JOIN_WINDOW_MINUTES = 15;

/** A class marked "live" stays live this long past its scheduled end (overruns), then counts as ended. */
export const LIVE_GRACE_MINUTES = 60;

type Timed = Pick<ClassSession, "starts_at" | "duration_minutes" | "status">;

export function classStart(c: Pick<ClassSession, "starts_at">): number {
  return new Date(c.starts_at).getTime();
}

export function classEnd(c: Pick<ClassSession, "starts_at" | "duration_minutes">): number {
  return classStart(c) + c.duration_minutes * 60_000;
}

/** Whether a class marked "live" is still within its scheduled end + grace (a forgotten "live" flag expires). */
function liveFlagActive(c: Timed, now: number): boolean {
  return c.status === "live" && now <= classEnd(c) + LIVE_GRACE_MINUTES * 60_000;
}

/** Live = marked live (until end + grace), or now is within [starts_at, starts_at + duration]. */
export function isClassLive(c: Timed, now: number): boolean {
  if (c.status === "cancelled" || c.status === "completed") return false;
  if (liveFlagActive(c, now)) return true;
  return now >= classStart(c) && now <= classEnd(c);
}

/** Past = ended (or marked completed) and not currently live. */
export function isClassPast(c: Timed, now: number): boolean {
  if (isClassLive(c, now)) return false;
  return c.status === "completed" || classEnd(c) < now;
}

export type JoinState =
  | { kind: "open" }
  | { kind: "early"; opensAt: number }
  | { kind: "ended" }
  | { kind: "cancelled" }
  | { kind: "no_link" };

/** Join is allowed from JOIN_WINDOW_MINUTES before start until the scheduled end (or while marked live, within grace). */
export function joinState(c: Timed & Pick<ClassSession, "meeting_url">, now: number): JoinState {
  if (c.status === "cancelled") return { kind: "cancelled" };
  if (!c.meeting_url) return { kind: "no_link" };
  const opensAt = classStart(c) - JOIN_WINDOW_MINUTES * 60_000;
  if (liveFlagActive(c, now)) return { kind: "open" };
  if (c.status === "completed" || now > classEnd(c)) return { kind: "ended" };
  if (now < opensAt) return { kind: "early", opensAt };
  return { kind: "open" };
}
