import Link from "next/link";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocalTime } from "@/components/instructor/local-time";
import { requireStaff } from "@/services/instructor/context";
import { classScopeFilter, getManagedCourseIds } from "@/services/instructor/scope";
import { CLASS_LIST_SELECT, type ClassListRow } from "@/services/instructor/classes";
import { DAY, dayBoundsInTz, nowIso } from "@/services/instructor/time";
import { APP_TIME_ZONE } from "@/components/agenda/tz";

export const metadata = { title: "Attendance" };

function pickDefault(classes: ClassListRow[], today: { start: string; end: string }, now: string) {
  const todays = classes
    .filter((c) => c.starts_at >= today.start && c.starts_at < today.end)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  if (todays.length) {
    // the latest of today's classes that has started, else the first one today
    return [...todays].reverse().find((c) => c.starts_at <= now) ?? todays[0];
  }
  return classes.find((c) => c.starts_at <= now) ?? null; // list is sorted desc
}

export default async function AttendancePage() {
  const ctx = await requireStaff();
  const courseIds = await getManagedCourseIds(ctx);
  const scope = classScopeFilter(ctx, courseIds);
  const now = nowIso();
  const today = dayBoundsInTz(APP_TIME_ZONE, new Date(now));

  let q = ctx.supabase
    .from("classes")
    .select(CLASS_LIST_SELECT)
    .gte("starts_at", nowIso(-45 * DAY))
    .lte("starts_at", nowIso(7 * DAY))
    .neq("status", "cancelled");
  if (scope) q = q.or(scope);
  const { data } = await q.order("starts_at", { ascending: false }).limit(100).overrideTypes<ClassListRow[], { merge: false }>();
  const classes = data ?? [];
  const suggested = pickDefault(classes, today, now);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Teaching" title="Attendance" description="Pick a class to take or correct attendance." />
      {classes.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No recent classes"
          description="Classes from the last 45 days and the next week show up here."
          action={
            <Button asChild variant="brand" size="sm">
              <Link href="/admin/classes/new">Schedule class</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {suggested ? (
            <Link
              href={`/admin/attendance/${suggested.id}`}
              className="group flex items-center justify-between gap-4 rounded-lg border border-brand/40 bg-brand/5 p-4 outline-none hover:bg-brand/10 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-wider text-brand">
                  {suggested.starts_at >= today.start && suggested.starts_at < today.end ? "Today" : "Most recent"}
                </p>
                <p className="truncate font-medium">{suggested.title}</p>
                <p className="text-xs text-muted-foreground">
                  <LocalTime value={suggested.starts_at} className="font-mono" /> · {suggested.courses?.title ?? "Open session"} ·{" "}
                  {suggested.attendance[0]?.count ?? 0} marked
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand">
                Take attendance <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ) : null}
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Marked</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-72">
                      <Link href={`/admin/attendance/${c.id}`} className="block truncate font-medium hover:underline">
                        {c.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{c.courses?.title ?? "Open session"}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      <LocalTime value={c.starts_at} format="short" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{c.attendance[0]?.count ?? 0}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/attendance/${c.id}`}>
                          Open <ChevronRight />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
