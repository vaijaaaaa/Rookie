import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Inbox, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Markdown } from "@/components/shared/markdown";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { GradeForm } from "@/components/instructor/grade-form";
import { LinkTabs } from "@/components/instructor/link-tabs";
import { LocalTime } from "@/components/instructor/local-time";
import { requireStaff } from "@/services/instructor/context";
import { getEnrollmentCounts, getManagedAssignment } from "@/services/instructor/assignments";
import { cn } from "@/lib/utils";
import type { AssignmentSubmission } from "@/types";
import { deleteAssignment } from "../actions";

export const metadata = { title: "Review assignment" };

type Sub = AssignmentSubmission & {
  profiles: { full_name: string; email: string | null; avatar_url: string | null } | null;
};

const FILTERS = ["all", "submitted", "reviewed", "in_progress"] as const;

export default async function AssignmentReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submission?: string; status?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await requireStaff();
  const assignment = await getManagedAssignment(ctx, id);
  if (!assignment) notFound();

  const [{ data }, enrolled] = await Promise.all([
    ctx.supabase
      .from("assignment_submissions")
      .select("*, profiles!assignment_submissions_user_id_fkey(full_name, email, avatar_url)")
      .eq("assignment_id", assignment.id)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .overrideTypes<Sub[], { merge: false }>(),
    getEnrollmentCounts(ctx, [assignment.course_id]),
  ]);
  const all = data ?? [];
  const filter = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof FILTERS)[number]) : "all";
  const subs = filter === "all" ? all : all.filter((s) => s.status === filter);
  const selected = all.find((s) => s.id === sp.submission) ?? subs.find((s) => s.status === "submitted") ?? subs[0] ?? null;
  const count = (st: string) => all.filter((s) => s.status === st).length;
  const isLate = (s: Sub) => !!s.submitted_at && s.submitted_at > assignment.due_at;
  const href = (params: { status?: string; submission?: string }) => {
    const q = new URLSearchParams();
    const st = params.status ?? filter;
    if (st !== "all") q.set("status", st);
    if (params.submission) q.set("submission", params.submission);
    const s = q.toString();
    return `/admin/assignments/${assignment.id}${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/assignments">
          <ArrowLeft /> Assignments
        </Link>
      </Button>
      <PageHeader
        eyebrow={
          <>
            {assignment.courses?.title} · due <LocalTime value={assignment.due_at} format="short" />
          </>
        }
        title={
          <span className="flex items-center gap-2">
            {assignment.title}
            {!assignment.is_published ? <Badge variant="outline">Draft</Badge> : null}
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {assignment.points} pts · {assignment.submission_type} · {count("submitted") + count("reviewed")}/{enrolled.get(assignment.course_id) ?? 0}{" "}
            turned in · {count("reviewed")} reviewed
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/assignments/${assignment.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <ConfirmAction
              action={deleteAssignment.bind(null, assignment.id)}
              title="Delete this assignment?"
              description="All student submissions and grades for it are deleted."
              successMessage="Assignment deleted"
              redirectTo="/admin/assignments"
              trigger={
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 /> Delete
                </Button>
              }
            />
          </>
        }
      />

      <LinkTabs
        className="mb-4"
        active={filter}
        tabs={FILTERS.map((f) => ({
          value: f,
          label: f === "all" ? "All" : f === "in_progress" ? "Drafts" : f === "submitted" ? "To review" : "Reviewed",
          href: href({ status: f }),
          count: f === "all" ? all.length : count(f),
        }))}
      />

      {all.length === 0 ? (
        <EmptyState icon={Inbox} title="No submissions yet" description="Submissions appear here as students turn them in." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <ul className="divide-y self-start rounded-lg border bg-card">
            {subs.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing here.</li> : null}
            {subs.map((s) => (
              <li key={s.id}>
                <Link
                  href={href({ submission: s.id })}
                  scroll={false}
                  aria-current={selected?.id === s.id ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 outline-none hover:bg-muted/40 focus-visible:bg-muted/40",
                    selected?.id === s.id && "bg-muted/60",
                  )}
                >
                  <UserAvatar name={s.profiles?.full_name ?? null} src={s.profiles?.avatar_url} className="size-7" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.profiles?.full_name || s.profiles?.email || "Student"}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {s.submitted_at ? <LocalTime value={s.submitted_at} format="short" /> : "not submitted"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={s.status} />
                    {isLate(s) ? <Badge variant="danger">Late</Badge> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {selected ? (
            <div className="grid gap-4 self-start">
              <section className="rounded-lg border bg-card">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/students/${selected.user_id}`} className="text-sm font-medium hover:underline">
                      {selected.profiles?.full_name || "Student"}
                    </Link>
                    <StatusBadge status={selected.status} />
                    {isLate(selected) ? <Badge variant="danger">Late</Badge> : null}
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {selected.submitted_at ? (
                      <>
                        submitted <LocalTime value={selected.submitted_at} format="short" />
                      </>
                    ) : (
                      "draft"
                    )}
                  </span>
                </header>
                <div className="grid gap-3 p-4">
                  {selected.url ? (
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 break-all font-mono text-sm text-brand hover:underline"
                    >
                      <ExternalLink className="size-3.5 shrink-0" /> {selected.url}
                    </a>
                  ) : null}
                  {selected.content.trim() ? (
                    assignment.submission_type === "code" ? (
                      <pre className="max-h-[480px] overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                        <code>{selected.content}</code>
                      </pre>
                    ) : (
                      <Markdown className="max-h-[480px] overflow-auto">{selected.content}</Markdown>
                    )
                  ) : !selected.url ? (
                    <p className="text-sm text-muted-foreground">No content.</p>
                  ) : null}
                </div>
              </section>
              <section className="rounded-lg border bg-card">
                <header className="flex items-center justify-between border-b px-4 py-2.5">
                  <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Review</h2>
                  {selected.reviewed_at ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      reviewed <LocalTime value={selected.reviewed_at} format="relative" />
                    </span>
                  ) : null}
                </header>
                <div className="p-4">
                  {selected.status === "in_progress" ? (
                    <p className="text-sm text-muted-foreground">The student hasn&apos;t submitted yet — grading opens once they do.</p>
                  ) : (
                    <GradeForm
                      key={selected.id}
                      submissionId={selected.id}
                      points={assignment.points}
                      grade={selected.grade}
                      feedback={selected.feedback}
                      reviewed={selected.status === "reviewed"}
                    />
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
