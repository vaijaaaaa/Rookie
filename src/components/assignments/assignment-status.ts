import { formatDistanceStrict } from "date-fns";
import type { Assignment, AssignmentDisplayStatus, AssignmentSubmission, SubmissionType } from "@/types";

type DueLike = Pick<Assignment, "due_at">;
type SubLike = Pick<AssignmentSubmission, "status" | "submitted_at">;

/**
 * Student-facing status:
 * reviewed → "reviewed"; submitted → "submitted"; otherwise overdue → "late";
 * otherwise draft → "in_progress"; no row → "not_started".
 */
export function assignmentDisplayStatus(
  assignment: DueLike,
  submission: SubLike | null,
  now: Date | number = Date.now(),
): AssignmentDisplayStatus {
  if (submission?.status === "reviewed") return "reviewed";
  if (submission?.status === "submitted") return "submitted";
  const t = typeof now === "number" ? now : now.getTime();
  if (new Date(assignment.due_at).getTime() < t) return "late";
  return submission ? "in_progress" : "not_started";
}

/** Turned in after the deadline (only meaningful once submitted/reviewed). */
export function isSubmittedLate(assignment: DueLike, submission: SubLike | null): boolean {
  if (!submission?.submitted_at || submission.status === "in_progress") return false;
  return new Date(submission.submitted_at).getTime() > new Date(assignment.due_at).getTime();
}

export type AssignmentFilter = "all" | "todo" | "submitted" | "reviewed" | "late";

export const ASSIGNMENT_FILTERS: { value: AssignmentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "submitted", label: "Submitted" },
  { value: "reviewed", label: "Reviewed" },
  { value: "late", label: "Late" },
];

export function parseAssignmentFilter(v: string | string[] | undefined): AssignmentFilter {
  const s = Array.isArray(v) ? v[0] : v;
  return ASSIGNMENT_FILTERS.some((f) => f.value === s) ? (s as AssignmentFilter) : "all";
}

export function matchesFilter(status: AssignmentDisplayStatus, filter: AssignmentFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "todo":
      return status === "not_started" || status === "in_progress";
    default:
      return status === filter;
  }
}

/** Badge key for StatusBadge ("late" maps to the derived late_assignment entry). */
export function displayStatusBadgeKey(status: AssignmentDisplayStatus): string {
  return status === "late" ? "late_assignment" : status;
}

/** "due in 2 days" / "overdue by 3 hours" relative to `now`. */
export function dueCountdown(dueAt: string, now: number): { label: string; overdue: boolean; soon: boolean } {
  const due = new Date(dueAt).getTime();
  const distance = formatDistanceStrict(due, now);
  if (due < now) return { label: `overdue by ${distance}`, overdue: true, soon: false };
  return { label: `due in ${distance}`, overdue: false, soon: due - now < SOON_MS };
}

/** Deadlines closer than this are highlighted. */
const SOON_MS = 48 * 3_600_000;

export const SUBMISSION_TYPE_LABEL: Record<SubmissionType, string> = {
  text: "Text answer",
  url: "Link",
  code: "Code",
};
