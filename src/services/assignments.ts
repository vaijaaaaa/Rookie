import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  assignmentDisplayStatus,
  isSubmittedLate,
} from "@/components/assignments/assignment-status";
import type { Assignment, AssignmentDisplayStatus, AssignmentSubmission } from "@/types";

export {
  ASSIGNMENT_FILTERS,
  assignmentDisplayStatus,
  dueCountdown,
  isSubmittedLate,
  matchesFilter,
  parseAssignmentFilter,
  type AssignmentFilter,
} from "@/components/assignments/assignment-status";

export type SubmissionSummary = Pick<
  AssignmentSubmission,
  "id" | "assignment_id" | "status" | "submitted_at" | "grade" | "updated_at"
>;

export type AssignmentListItem = Pick<
  Assignment,
  "id" | "title" | "due_at" | "points" | "submission_type" | "course_id" | "lesson_id"
> & {
  course: { id: string; slug: string; title: string } | null;
  submission: SubmissionSummary | null;
  displayStatus: AssignmentDisplayStatus;
  submittedLate: boolean;
};

export type AssignmentDetail = Assignment & {
  course: { id: string; slug: string; title: string } | null;
  lesson: { id: string; slug: string; title: string } | null;
};

/**
 * Assignments visible to the current user (RLS: published + enrolled, or staff-managed courses),
 * each joined with the user's own submission and a derived display status. Due date ascending.
 */
export async function listMyAssignments(userId: string): Promise<{ items: AssignmentListItem[]; now: number }> {
  const supabase = await createClient();
  const now = Date.now();
  const [{ data: assignments }, { data: submissions }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id,title,due_at,points,submission_type,course_id,lesson_id,course:courses!assignments_course_id_fkey(id,slug,title)")
      .eq("is_published", true)
      .order("due_at", { ascending: true })
      .overrideTypes<Omit<AssignmentListItem, "submission" | "displayStatus" | "submittedLate">[], { merge: false }>(),
    supabase
      .from("assignment_submissions")
      .select("id,assignment_id,status,submitted_at,grade,updated_at")
      .eq("user_id", userId)
      .overrideTypes<SubmissionSummary[], { merge: false }>(),
  ]);
  const byAssignment = new Map((submissions ?? []).map((s) => [s.assignment_id, s]));
  const items = (assignments ?? []).map((a) => {
    const submission = byAssignment.get(a.id) ?? null;
    return {
      ...a,
      submission,
      displayStatus: assignmentDisplayStatus(a, submission, now),
      submittedLate: isSubmittedLate(a, submission),
    };
  });
  return { items, now };
}

/** One assignment with course/lesson, or null when missing / hidden by RLS. */
export const getAssignment = cache(async (id: string): Promise<AssignmentDetail | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("*,course:courses!assignments_course_id_fkey(id,slug,title),lesson:lessons!assignments_lesson_id_fkey(id,slug,title)")
    .eq("id", id)
    .maybeSingle<AssignmentDetail>();
  return data ?? null;
});

/** The user's own submission for an assignment (never someone else's, even for staff). */
export async function getMySubmission(assignmentId: string, userId: string): Promise<AssignmentSubmission | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("user_id", userId)
    .maybeSingle<AssignmentSubmission>();
  return data ?? null;
}
