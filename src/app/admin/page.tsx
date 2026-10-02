import Link from "next/link";
import {
  Activity, ArrowUpRight, BookOpen, CalendarCheck, ClipboardCheck, Code2, GraduationCap, Map,
  Megaphone, UserPlus, Users, Video,
} from "lucide-react";
import { AreaChartCard, BarChartCard } from "@/components/charts";
import { RoleBadge } from "@/components/admin/role-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { UserAvatar } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/utils/format";
import {
  attendanceSeries, currentWeekRange, fillDays, fillWeeks, getPlatformStats, getRecentSignups,
} from "@/services/admin";

export const metadata = { title: "Admin" };

const QUICK_LINKS = [
  { title: "Courses", href: "/admin/courses", icon: BookOpen, hint: "Lessons, modules, publishing" },
  { title: "Roadmaps", href: "/admin/roadmaps", icon: Map, hint: "Learning paths & topics" },
  { title: "Classes", href: "/admin/classes", icon: Video, hint: "Live sessions & recordings" },
  { title: "Problems", href: "/admin/problems", icon: Code2, hint: "Coding practice & tests" },
  { title: "Announcements", href: "/admin/announcements", icon: Megaphone, hint: "Platform-wide updates" },
];

export default async function AdminDashboardPage() {
  const [stats, recent] = await Promise.all([getPlatformStats(), getRecentSignups(5)]);

  const growth = fillWeeks(stats.student_growth, 12);
  const signups12w = growth.reduce((s, r) => s + r.signups, 0);
  const daily = fillDays(stats.daily_activity, 30);
  const events30d = daily.reduce((s, r) => s + r.events, 0);
  const peakDay = daily.reduce((best, r) => (r.events > best.events ? r : best), daily[0]!);
  const attendance = attendanceSeries(stats.attendance_by_week);
  const lastAttendance = attendance.at(-1)?.rate;
  const courseProgress = [...stats.course_progress]
    .sort((a, b) => b.completion - a.completion)
    .map((c) => ({ course: c.course, completion: Number(c.completion) }));
  const topCourse = courseProgress[0];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Platform overview" description="Health of the platform at a glance." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Students" value={stats.total_students.toLocaleString()} icon={GraduationCap} />
        <StatCard label="Admins" value={stats.total_instructors.toLocaleString()} icon={Users} />
        <StatCard label="Active courses" value={stats.active_courses.toLocaleString()} hint="Published" icon={BookOpen} />
        <StatCard
          label="Classes this week"
          value={stats.classes_this_week.toLocaleString()}
          hint={currentWeekRange()}
          icon={Video}
        />
        <StatCard label="Avg attendance" value={`${stats.avg_attendance}%`} hint="Present or late, all time" icon={CalendarCheck} />
        <StatCard
          label="Assignments done"
          value={stats.assignments_completed.toLocaleString()}
          hint="Submitted or reviewed"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Active users (7d)"
          value={stats.active_users_7d.toLocaleString()}
          hint="Logged any learning activity"
          icon={Activity}
        />
        <StatCard
          label="New students (12w)"
          value={signups12w.toLocaleString()}
          hint="Weekly additions below"
          icon={UserPlus}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={
            signups12w > 0
              ? `${signups12w.toLocaleString()} new students in the last 12 weeks`
              : "No new students in the last 12 weeks"
          }
          description="Students added per week"
          data={growth}
          xKey="week"
          yKey="signups"
          valueLabel="New students"
        />
        <AreaChartCard
          title={
            lastAttendance !== undefined
              ? `Attendance was ${lastAttendance}% in the latest week`
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
            topCourse
              ? `${topCourse.course} leads completion at ${topCourse.completion}%`
              : "No published courses yet"
          }
          description="Average lesson completion per published course, among enrolled students"
          data={courseProgress}
          xKey="course"
          yKey="completion"
          valueSuffix="%"
          valueLabel="Avg completion"
          yMax={100}
          horizontal
          secondary
          emptyMessage="No published courses yet"
        />
        <BarChartCard
          title={
            events30d > 0
              ? `${events30d.toLocaleString()} learning events in 30 days, peak ${peakDay.events} on ${peakDay.day}`
              : "No learning activity in the last 30 days"
          }
          description="Lessons, problems, classes, assignments and roadmap topics per day"
          data={daily}
          xKey="day"
          yKey="events"
          valueLabel="Events"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Recently added users" href="/admin/users" hrefLabel="All users" contentClassName="p-0">
          {recent.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={UserPlus} title="No users yet" description="Users you add will appear here." />
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <UserAvatar name={u.full_name} src={u.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.full_name || "Unnamed"}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <RoleBadge role={u.role} />
                    <span className="hidden w-24 text-right font-mono text-[11px] text-muted-foreground sm:block">
                      {timeAgo(u.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Manage content" contentClassName="p-2">
          <ul className="grid gap-1 sm:grid-cols-2">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <span className="flex size-8 items-center justify-center rounded-md border bg-muted/40">
                    <l.icon className="size-4 text-muted-foreground group-hover:text-brand" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{l.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{l.hint}</span>
                  </span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
