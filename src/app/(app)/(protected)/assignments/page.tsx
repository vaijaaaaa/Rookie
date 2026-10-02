import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Code2, FileText, Link2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LinkTabs } from "@/components/classes/class-tabs";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { SUBMISSION_TYPE_LABEL } from "@/components/assignments/assignment-status";
import { requireProfile } from "@/lib/auth/session";
import { formatDate, formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import {
  ASSIGNMENT_FILTERS,
  dueCountdown,
  listMyAssignments,
  matchesFilter,
  parseAssignmentFilter,
  type AssignmentFilter,
  type AssignmentListItem,
} from "@/services/assignments";
import type { SubmissionType } from "@/types";

export const metadata: Metadata = {
  title: "Assignments",
  description: "Your course assignments, deadlines and grades.",
};

const TYPE_ICON: Record<SubmissionType, typeof FileText> = { text: FileText, url: Link2, code: Code2 };

const EMPTY_COPY: Record<AssignmentFilter, { title: string; description: string }> = {
  all: { title: "No assignments yet", description: "Assignments from the courses you're enrolled in will appear here." },
  todo: { title: "Nothing to do", description: "You're all caught up. Nice." },
  submitted: { title: "Nothing awaiting review", description: "Submitted work waiting for a grade shows up here." },
  reviewed: { title: "No graded work yet", description: "Reviewed assignments with grades and feedback show up here." },
  late: { title: "Nothing overdue", description: "No missed deadlines — keep it that way." },
};

/** Open work first (soonest due), then the rest (most recent first). */
function sortForDisplay(items: AssignmentListItem[]) {
  const open = items.filter((i) => i.displayStatus === "not_started" || i.displayStatus === "in_progress");
  const rest = items
    .filter((i) => !open.includes(i))
    .sort((a, b) => new Date(b.due_at).getTime() - new Date(a.due_at).getTime());
  return [...open, ...rest];
}

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const [profile, sp] = await Promise.all([requireProfile(), searchParams]);
  const filter = parseAssignmentFilter(sp.status);
  const { items, now } = await listMyAssignments(profile.id);

  const counts = Object.fromEntries(
    ASSIGNMENT_FILTERS.map((f) => [f.value, items.filter((i) => matchesFilter(i.displayStatus, f.value)).length]),
  ) as Record<AssignmentFilter, number>;
  const visible = sortForDisplay(items.filter((i) => matchesFilter(i.displayStatus, filter)));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Assignments" title="Assignments" description="Deadlines, submissions and grades for your courses." />

      <LinkTabs
        label="Filter assignments"
        active={filter}
        tabs={ASSIGNMENT_FILTERS.map((f) => ({
          value: f.value,
          label: f.label,
          count: counts[f.value],
          href: f.value === "all" ? "/assignments" : `/assignments?status=${f.value}`,
        }))}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={EMPTY_COPY[filter].title}
          description={EMPTY_COPY[filter].description}
          action={
            items.length === 0 ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/courses">Browse courses</Link>
              </Button>
            ) : filter !== "all" ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/assignments">Show all</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card" aria-label="Assignments">
          {visible.map((a) => {
            const Icon = TYPE_ICON[a.submission_type];
            const done = a.displayStatus === "submitted" || a.displayStatus === "reviewed";
            const due = dueCountdown(a.due_at, now);
            return (
              <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/assignments/${a.id}`} className="truncate text-sm font-medium hover:underline">
                      {a.title}
                    </Link>
                    <AssignmentStatusBadge status={a.displayStatus} submittedLate={a.submittedLate} />
                  </div>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {a.course ? (
                      <>
                        <span className="truncate">{a.course.title}</span>
                        <span aria-hidden>·</span>
                      </>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <Icon className="size-3" aria-hidden />
                      {SUBMISSION_TYPE_LABEL[a.submission_type]}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                  <div className="text-left font-mono text-xs sm:text-right">
                    <time dateTime={a.due_at} className="block text-foreground">
                      {formatDate(a.due_at, "MMM d")} · {formatTime(a.due_at)}
                    </time>
                    {done ? (
                      <span className="text-muted-foreground">
                        {a.submission?.submitted_at ? `turned in ${formatDate(a.submission.submitted_at, "MMM d")}` : "turned in"}
                      </span>
                    ) : (
                      <span className={cn(due.overdue ? "text-destructive" : due.soon ? "text-warning" : "text-muted-foreground")}>
                        {due.label}
                      </span>
                    )}
                  </div>
                  <div className="w-20 text-right font-mono text-xs tabular-nums">
                    {a.displayStatus === "reviewed" && a.submission?.grade !== null && a.submission?.grade !== undefined ? (
                      <span>
                        <span className="text-sm font-semibold text-foreground">{a.submission.grade}</span>
                        <span className="text-muted-foreground">/{a.points}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{a.points} pts</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
