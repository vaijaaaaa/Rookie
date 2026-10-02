import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import { Markdown } from "@/components/shared/markdown";
import { Section } from "@/components/shared/section";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { SUBMISSION_TYPE_LABEL } from "@/components/assignments/assignment-status";
import { SubmissionPanel, SubmittedContent } from "@/components/assignments/submission-panel";
import { requireProfile } from "@/lib/auth/session";
import { formatDate, formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import {
  assignmentDisplayStatus,
  dueCountdown,
  getAssignment,
  getMySubmission,
  isSubmittedLate,
} from "@/services/assignments";
import { saveSubmission, unsubmitSubmission } from "./actions";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const a = await getAssignment(id);
  return a ? { title: a.title, description: a.description.slice(0, 160) || undefined } : { title: "Assignment not found" };
}

function stamp(d: string) {
  return `${formatDate(d)} · ${formatTime(d)}`;
}

function renderTime() {
  return Date.now();
}

export default async function AssignmentPage({ params }: Params) {
  const { id } = await params;
  const [profile, assignment] = await Promise.all([requireProfile(), getAssignment(id)]);
  if (!assignment) notFound();

  const submission = await getMySubmission(assignment.id, profile.id);
  const now = renderTime();
  const status = assignmentDisplayStatus(assignment, submission, now);
  const late = isSubmittedLate(assignment, submission);
  const due = dueCountdown(assignment.due_at, now);
  const reviewed = submission?.status === "reviewed";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/assignments"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" aria-hidden /> All assignments
        </Link>
        <p className="mb-1 flex flex-wrap items-center gap-x-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {assignment.course ? (
            <Link href={`/courses/${assignment.course.slug}`} className="hover:text-foreground">
              {assignment.course.title}
            </Link>
          ) : (
            <span>Assignment</span>
          )}
          {assignment.course && assignment.lesson ? (
            <>
              <span aria-hidden>/</span>
              <Link
                href={`/courses/${assignment.course.slug}/lessons/${assignment.lesson.slug}`}
                className="hover:text-foreground"
              >
                {assignment.lesson.title}
              </Link>
            </>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{assignment.title}</h1>
          <AssignmentStatusBadge status={status} submittedLate={late} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Section title="Instructions">
            {assignment.description.trim() ? (
              <Markdown>{assignment.description}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">No instructions provided.</p>
            )}
          </Section>

          <Section
            title={reviewed ? "Your submission · reviewed" : "Your submission"}
            action={
              reviewed ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Lock className="size-3" aria-hidden /> Locked
                </span>
              ) : undefined
            }
          >
            {reviewed && submission ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-end gap-6">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Grade</p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                      {submission.grade ?? "—"}
                      <span className="text-base font-normal text-muted-foreground">/{assignment.points}</span>
                    </p>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
                    {submission.submitted_at ? (
                      <>
                        <dt className="text-muted-foreground">Submitted</dt>
                        <dd>{stamp(submission.submitted_at)}</dd>
                      </>
                    ) : null}
                    {submission.reviewed_at ? (
                      <>
                        <dt className="text-muted-foreground">Reviewed</dt>
                        <dd>{stamp(submission.reviewed_at)}</dd>
                      </>
                    ) : null}
                  </dl>
                </div>
                <div>
                  <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Feedback</h3>
                  {submission.feedback?.trim() ? (
                    <div className="rounded-md border border-brand/30 bg-brand/5 p-3">
                      <Markdown>{submission.feedback}</Markdown>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No written feedback.</p>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">What you submitted</h3>
                  <SubmittedContent type={assignment.submission_type} content={submission.content} url={submission.url} />
                </div>
              </div>
            ) : (
              <SubmissionPanel
                key={submission?.updated_at ?? "new"}
                assignmentId={assignment.id}
                submissionType={assignment.submission_type}
                submission={submission}
                overdue={due.overdue}
                saveAction={saveSubmission}
                unsubmitAction={unsubmitSubmission}
                submittedAtLabel={submission?.submitted_at ? stamp(submission.submitted_at) : null}
                submittedLate={late}
              />
            )}
          </Section>
        </div>

        <aside aria-label="Assignment details" className="space-y-6">
          <Section title="Details">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-muted-foreground">Due</dt>
              <dd className="font-mono text-xs">
                <time dateTime={assignment.due_at} className="block">
                  {stamp(assignment.due_at)}
                </time>
                {status === "submitted" || status === "reviewed" ? null : (
                  <span className={cn(due.overdue ? "text-destructive" : due.soon ? "text-warning" : "text-muted-foreground")}>
                    {due.label}
                  </span>
                )}
              </dd>
              <dt className="text-muted-foreground">Points</dt>
              <dd className="font-mono text-xs">{assignment.points}</dd>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="text-xs">{SUBMISSION_TYPE_LABEL[assignment.submission_type]}</dd>
              {assignment.course ? (
                <>
                  <dt className="text-muted-foreground">Course</dt>
                  <dd className="text-xs">
                    <Link href={`/courses/${assignment.course.slug}`} className="hover:underline">
                      {assignment.course.title}
                    </Link>
                  </dd>
                </>
              ) : null}
              {assignment.course && assignment.lesson ? (
                <>
                  <dt className="text-muted-foreground">Lesson</dt>
                  <dd className="text-xs">
                    <Link
                      href={`/courses/${assignment.course.slug}/lessons/${assignment.lesson.slug}`}
                      className="hover:underline"
                    >
                      {assignment.lesson.title}
                    </Link>
                  </dd>
                </>
              ) : null}
            </dl>
          </Section>

          {late ? (
            <div role="note" className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              <p>Submitted after the deadline. Your instructor may apply a late penalty.</p>
            </div>
          ) : status === "late" ? (
            <div role="note" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              <p>This assignment is overdue. Submit as soon as you can — it will be marked late.</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
