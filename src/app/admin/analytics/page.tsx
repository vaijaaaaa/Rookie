import { Activity, BookCheck, ClipboardCheck, Users } from "lucide-react";
import { AreaChartCard, BarChartCard } from "@/components/charts";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { percent } from "@/lib/utils";
import {
  attendanceSeries, fillDays, fillWeeks, getPlatformAnalytics, getPlatformStats,
} from "@/services/admin";

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const [stats, a] = await Promise.all([getPlatformStats(), getPlatformAnalytics()]);

  const activeRate7 = percent(a.active7d, a.totalUsers);
  const activeRate30 = percent(a.active30d, a.totalUsers);
  const assignmentRate = percent(a.assignmentsSubmitted, a.assignmentsExpected);

  const courses = [...stats.course_progress]
    .map((c) => ({ course: c.course, enrolled: Number(c.enrolled), completion: Number(c.completion) }))
    .sort((x, y) => y.enrolled - x.enrolled);
  const totalEnrollments = courses.reduce((s, c) => s + c.enrolled, 0);
  const mostEnrolled = courses[0];

  const attendance = attendanceSeries(stats.attendance_by_week);
  const attendanceAvg = attendance.length
    ? Math.round(attendance.reduce((s, r) => s + r.rate, 0) / attendance.length)
    : null;

  const daily = fillDays(stats.daily_activity, 30);
  const growth = fillWeeks(stats.student_growth, 12);
  const byType = a.activityByType.map((t) => ({ type: t.label, count: t.count }));
  const events30 = byType.reduce((s, t) => s + t.count, 0);
  const topType = a.activityByType[0];
  const bound = a.activeTruncated ? "≥ " : "";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Analytics" description="Engagement, completion and attendance across the platform." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total users" value={a.totalUsers.toLocaleString()} icon={Users} />
        <StatCard
          label="Active (7d)"
          value={`${bound}${a.active7d.toLocaleString()}`}
          hint={`${activeRate7}% of users`}
          icon={Activity}
        />
        <StatCard
          label="Active (30d)"
          value={`${bound}${a.active30d.toLocaleString()}`}
          hint={`${activeRate30}% of users`}
          icon={Activity}
        />
        <StatCard label="Courses completed" value={a.coursesCompleted.toLocaleString()} hint="All time" icon={BookCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={
            mostEnrolled && mostEnrolled.enrolled > 0
              ? `${mostEnrolled.course} has the most learners (${mostEnrolled.enrolled})`
              : "No course enrollments yet"
          }
          description={`Enrollments per published course · ${totalEnrollments.toLocaleString()} total`}
          data={courses}
          xKey="course"
          yKey="enrolled"
          valueLabel="Enrolled"
          horizontal
          emptyMessage="No published courses yet"
        />
        <AreaChartCard
          title={
            attendanceAvg !== null
              ? `Attendance averaged ${attendanceAvg}% over the last ${attendance.length} weeks`
              : "No attendance recorded in the last 10 weeks"
          }
          description="Weekly attendance rate (present or late, excused excluded)"
          data={attendance}
          xKey="week"
          yKey="rate"
          valueSuffix="%"
          valueLabel="Attendance"
          yMax={100}
          emptyMessage="No attendance recorded yet"
        />
        <BarChartCard
          title={
            topType && topType.count > 0
              ? `${topType.label} drive most activity (${percent(topType.count, events30)}%)`
              : "No activity in the last 30 days"
          }
          description="Activity events by type, last 30 days"
          data={byType}
          xKey="type"
          yKey="count"
          valueLabel="Events"
          horizontal
          secondary
          categoryWidth={150}
        />
        <AreaChartCard
          title={`${daily.reduce((s, d) => s + d.events, 0).toLocaleString()} learning events in the last 30 days`}
          description="Daily activity (excludes achievements)"
          data={daily}
          xKey="day"
          yKey="events"
          valueLabel="Events"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section title="Course engagement" contentClassName="p-0">
          {courses.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No published courses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Enrolled</TableHead>
                  <TableHead className="w-[40%]">Avg completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.course}>
                    <TableCell className="max-w-56 truncate font-medium">{c.course}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{c.enrolled}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={c.completion} className="flex-1" />
                        <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
                          {c.completion}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <div className="space-y-4">
          <Section title="Completion rates">
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm">Assignments submitted</p>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {a.assignmentsSubmitted.toLocaleString()} / {a.assignmentsExpected.toLocaleString()}
                  </p>
                </div>
                <Progress value={assignmentRate} className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.assignmentsExpected > 0
                    ? `${assignmentRate}% of expected submissions for past-due assignments`
                    : "No past-due assignments yet"}
                </p>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm">Average attendance</p>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">{stats.avg_attendance}%</p>
                </div>
                <Progress value={stats.avg_attendance} className="mt-2" />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="inline-flex items-center gap-2 text-sm">
                  <ClipboardCheck className="size-4 text-muted-foreground" /> Assignments done (all time)
                </span>
                <span className="font-mono text-sm tabular-nums">{stats.assignments_completed.toLocaleString()}</span>
              </div>
            </div>
          </Section>

          <BarChartCard
            title={`${growth.reduce((s, g) => s + g.signups, 0).toLocaleString()} student signups in 12 weeks`}
            description="New students per week"
            data={growth}
            xKey="week"
            yKey="signups"
            valueLabel="Signups"
            height={160}
          />
        </div>
      </div>

      {a.activeTruncated ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          Active-user counts are lower bounds: the 30-day activity scan is capped for performance.
        </p>
      ) : null}
    </div>
  );
}
