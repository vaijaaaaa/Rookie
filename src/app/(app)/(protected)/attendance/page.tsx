import type { Metadata } from "next";
import Link from "next/link";
import { addMonths, format } from "date-fns";
import { CalendarCheck, CalendarX2, Clock, ShieldCheck, Sigma } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AttendanceCalendar,
  monthKey,
  parseMonth,
  type CalendarEntry,
} from "@/components/attendance/attendance-calendar";
import { requireProfile } from "@/lib/auth/session";
import { formatDate, formatTime, toISODate } from "@/lib/utils/format";
import { getMyAttendance, summarizeAttendance } from "@/services/attendance";
import { getClassesBetween, isClassPast } from "@/services/classes";

export const metadata: Metadata = {
  title: "Attendance",
  description: "Your class attendance record.",
};

function currentTime() {
  return Date.now();
}

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const [profile, sp] = await Promise.all([requireProfile(), searchParams]);
  const now = currentTime();
  const today = new Date(now);
  const month = parseMonth(sp.month, today);

  const [records, monthClasses] = await Promise.all([
    getMyAttendance(profile.id),
    getClassesBetween(month, addMonths(month, 1)),
  ]);
  const summary = summarizeAttendance(records);

  // Calendar: every visible class in the month, coloured by my attendance (or scheduled / not marked).
  const recordByClass = new Map(records.filter((r) => r.class).map((r) => [r.class!.id, r]));
  const entriesByDay = new Map<string, CalendarEntry[]>();
  const push = (e: CalendarEntry) => {
    const key = toISODate(new Date(e.startsAt));
    const list = entriesByDay.get(key);
    if (list) list.push(e);
    else entriesByDay.set(key, [e]);
  };
  const seen = new Set<string>();
  for (const c of monthClasses) {
    seen.add(c.id);
    const rec = recordByClass.get(c.id);
    if (!rec && c.status === "cancelled") continue; // cancelled without a record isn't attendance
    push({
      classId: c.id,
      title: c.title,
      startsAt: c.starts_at,
      status: rec ? rec.status : isClassPast(c, now) ? "unmarked" : "scheduled",
    });
  }
  const monthStart = month.getTime();
  const monthEnd = addMonths(month, 1).getTime();
  for (const r of records) {
    if (!r.class || seen.has(r.class.id)) continue;
    const t = new Date(r.class.starts_at).getTime();
    if (t >= monthStart && t < monthEnd) push({ classId: r.class.id, title: r.class.title, startsAt: r.class.starts_at, status: r.status });
  }
  const hrefFor = (d: Date) => (monthKey(d) === monthKey(today) ? "/attendance" : `/attendance?month=${monthKey(d)}`);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="My attendance"
        description="Marked by your instructors after each class. Read only."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/classes?tab=previous">Past classes</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section aria-labelledby="attendance-rate" className="flex flex-col justify-between rounded-lg border bg-card p-5">
          <div>
            <h2 id="attendance-rate" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Attendance rate
            </h2>
            <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight">
              {summary.rate === null ? <span className="text-muted-foreground">—</span> : `${summary.rate}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.counted > 0
                ? `${summary.present + summary.late} of ${summary.counted} classes attended (present + late; excused not counted)`
                : "No marked classes yet"}
            </p>
          </div>
          <Progress value={summary.rate ?? 0} className="mt-4 h-2" aria-label="Attendance rate" />
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          <StatCard label="Present" value={summary.present} icon={CalendarCheck} />
          <StatCard label="Late" value={summary.late} icon={Clock} />
          <StatCard label="Absent" value={summary.absent} icon={CalendarX2} />
          <StatCard label="Excused" value={summary.excused} icon={ShieldCheck} />
          <StatCard label="Total" value={summary.total} icon={Sigma} hint="Marked classes" className="col-span-2 sm:col-span-1" />
        </div>
      </div>

      <Section title={`Calendar · ${format(month, "MMM yyyy")}`}>
        <AttendanceCalendar month={month} today={today} entriesByDay={entriesByDay} hrefFor={hrefFor} />
      </Section>

      <Section title={`Records${records.length ? ` · ${records.length}` : ""}`} contentClassName="p-0">
        {records.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={CalendarCheck}
              title="No attendance records yet"
              description="After you attend a class, your instructor marks your attendance and it shows up here."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/classes">See upcoming classes</Link>
                </Button>
              }
              className="border-0"
            />
          </div>
        ) : (
          <Table>
            <caption className="sr-only">Attendance records, newest first</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Class</TableHead>
                <TableHead scope="col">Date</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="hidden md:table-cell">
                  Instructor note
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-64">
                    {r.class ? (
                      <Link href={`/class/${r.class.id}`} className="block truncate font-medium hover:underline">
                        {r.class.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Class unavailable</span>
                    )}
                    {r.class?.instructor ? (
                      <span className="block truncate text-xs text-muted-foreground">{r.class.instructor.full_name}</span>
                    ) : null}
                    {r.note ? <span className="mt-1 block text-xs text-muted-foreground md:hidden">{r.note}</span> : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {r.class ? (
                      <time dateTime={r.class.starts_at}>
                        {formatDate(r.class.starts_at)}
                        <span className="text-muted-foreground"> · {formatTime(r.class.starts_at)}</span>
                      </time>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="hidden max-w-80 text-xs text-muted-foreground md:table-cell">
                    {r.note ? r.note : <span aria-label="No note">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
