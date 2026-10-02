import Link from "next/link";
import { ClipboardList, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { LocalTime } from "@/components/instructor/local-time";
import { requireStaff } from "@/services/instructor/context";
import { getCourseOptions } from "@/services/instructor/scope";
import { getEnrollmentCounts } from "@/services/instructor/assignments";
import { nowIso } from "@/services/instructor/time";
import { percent } from "@/lib/utils";
import type { Assignment, SubmissionStatus } from "@/types";
import { deleteAssignment } from "./actions";

export const metadata = { title: "Assignments" };

type Row = Pick<Assignment, "id" | "title" | "course_id" | "due_at" | "points" | "submission_type" | "is_published">;

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const ctx = await requireStaff();
  const courses = await getCourseOptions(ctx);
  const selected = courses.filter((c) => !course || c.id === course);
  const courseIds = selected.map((c) => c.id);
  const now = nowIso();

  const { data } = courseIds.length
    ? await ctx.supabase
        .from("assignments")
        .select("id, title, course_id, due_at, points, submission_type, is_published")
        .in("course_id", courseIds)
        .order("due_at", { ascending: false })
        .limit(300)
        .overrideTypes<Row[], { merge: false }>()
    : { data: [] as Row[] };
  const assignments = data ?? [];
  const ids = assignments.map((a) => a.id);

  const [subsRes, enrolled] = await Promise.all([
    ids.length
      ? ctx.supabase
          .from("assignment_submissions")
          .select("assignment_id, status")
          .in("assignment_id", ids)
          .neq("status", "in_progress")
          .overrideTypes<{ assignment_id: string; status: SubmissionStatus }[], { merge: false }>()
      : Promise.resolve({ data: [] as { assignment_id: string; status: SubmissionStatus }[] }),
    getEnrollmentCounts(ctx, [...new Set(assignments.map((a) => a.course_id))]),
  ]);
  const counts = new Map<string, { submitted: number; reviewed: number }>();
  for (const s of subsRes.data ?? []) {
    const c = counts.get(s.assignment_id) ?? { submitted: 0, reviewed: 0 };
    if (s.status === "reviewed") c.reviewed += 1;
    else c.submitted += 1;
    counts.set(s.assignment_id, c);
  }

  const byCourse = selected
    .map((c) => ({ course: c, items: assignments.filter((a) => a.course_id === c.id) }))
    .filter((g) => g.items.length > 0);

  const newHref = course ? `/admin/assignments/new?course=${course}` : "/admin/assignments/new";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Teaching"
        title="Assignments"
        description="Create assignments and review student submissions."
        actions={
          <Button asChild variant="brand">
            <Link href={newHref}>
              <Plus /> New assignment
            </Link>
          </Button>
        }
      />
      {courses.length > 1 ? (
        <form className="mb-4 flex items-center gap-2">
          <div className="w-64">
            <NativeSelect name="course" defaultValue={course ?? ""} aria-label="Filter by course">
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
      ) : null}

      {!courses.length ? (
        <EmptyState icon={ClipboardList} title="No courses yet" description="Assignments belong to a course. Create a course first." />
      ) : byCourse.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments"
          description="Create an assignment and enrolled students get notified."
          action={
            <Button asChild variant="brand" size="sm">
              <Link href={newHref}>
                <Plus /> New assignment
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {byCourse.map(({ course: c, items }) => (
            <section key={c.id} className="rounded-lg border bg-card">
              <header className="flex items-center justify-between border-b px-4 py-2.5">
                <h2 className="truncate text-sm font-medium">{c.title}</h2>
                <span className="font-mono text-[11px] text-muted-foreground">{enrolled.get(c.id) ?? 0} enrolled</span>
              </header>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="hidden md:table-cell">Submitted</TableHead>
                    <TableHead className="text-right">To review</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((a) => {
                    const cnt = counts.get(a.id) ?? { submitted: 0, reviewed: 0 };
                    const total = enrolled.get(a.course_id) ?? 0;
                    const turnedIn = cnt.submitted + cnt.reviewed;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="max-w-80">
                          <Link href={`/admin/assignments/${a.id}`} className="block truncate font-medium hover:underline">
                            {a.title}
                          </Link>
                          <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                            {a.points} pts · {a.submission_type}
                            {!a.is_published ? <Badge variant="outline">Draft</Badge> : null}
                          </p>
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          <LocalTime value={a.due_at} format="short" />
                          {a.due_at < now ? <span className="ml-1.5 text-muted-foreground">· closed</span> : null}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Progress value={percent(turnedIn, total)} className="w-24" />
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                              {turnedIn}/{total} · {cnt.reviewed} reviewed
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {cnt.submitted ? <Badge variant="warning">{cnt.submitted}</Badge> : <span className="font-mono text-xs text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/admin/assignments/${a.id}`}>Review</Link>
                            </Button>
                            <Button asChild variant="ghost" size="icon-sm" aria-label="Edit assignment">
                              <Link href={`/admin/assignments/${a.id}/edit`}>
                                <Pencil />
                              </Link>
                            </Button>
                            <ConfirmAction
                              action={deleteAssignment.bind(null, a.id)}
                              title={`Delete "${a.title}"?`}
                              description="All student submissions and grades for it are deleted."
                              successMessage="Assignment deleted"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
