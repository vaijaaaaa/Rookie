import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import { SimpleBarChart } from "@/components/instructor/bar-chart";
import { requireStaff } from "@/services/instructor/context";
import { classScopeFilter, getCourseOptions } from "@/services/instructor/scope";
import { DAY, nowIso } from "@/services/instructor/time";
import { percent } from "@/lib/utils";

export const metadata = { title: "Analytics" };

interface InstructorStats {
  students: number;
  attendance_rate: number;
  assignment_completion: number;
  active_students_7d: number;
  daily_activity: { day: string; count: number }[];
}

/** Monday of the week containing `iso`, as yyyy-MM-dd (UTC). */
function weekKey(iso: string) {
  const d = new Date(iso);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export default async function InstructorAnalyticsPage() {
  const ctx = await requireStaff();
  const courses = await getCourseOptions(ctx);
  const courseIds = courses.map((c) => c.id);
  const scope = classScopeFilter(ctx, courseIds);

  const attendanceQuery = ctx.supabase
    .from("attendance")
    .select("status, classes!inner(starts_at, instructor_id, course_id)")
    .gte("classes.starts_at", nowIso(-70 * DAY))
    .limit(5000);
  const scopedAttendance = scope
    ? attendanceQuery.or(scope, { referencedTable: "classes" })
    : attendanceQuery;

  const [statsRes, lessonsRes, enrollRes, progressRes, attendanceRes, assignmentsRes] = await Promise.all([
    ctx.supabase.rpc("get_instructor_stats"),
    courseIds.length
      ? ctx.supabase.from("lessons").select("course_id").in("course_id", courseIds).eq("is_published", true)
          .overrideTypes<{ course_id: string }[], { merge: false }>()
      : Promise.resolve({ data: [] as { course_id: string }[] }),
    courseIds.length
      ? ctx.supabase.from("course_enrollments").select("course_id, user_id").in("course_id", courseIds).limit(10000)
          .overrideTypes<{ course_id: string; user_id: string }[], { merge: false }>()
      : Promise.resolve({ data: [] as { course_id: string; user_id: string }[] }),
    courseIds.length
      ? ctx.supabase.from("student_progress").select("user_id, lessons!inner(course_id)").eq("status", "completed")
          .in("lessons.course_id", courseIds).limit(20000)
          .overrideTypes<{ user_id: string; lessons: { course_id: string } }[], { merge: false }>()
      : Promise.resolve({ data: [] as { user_id: string; lessons: { course_id: string } }[] }),
    scopedAttendance.overrideTypes<{ status: string; classes: { starts_at: string } }[], { merge: false }>(),
    courseIds.length
      ? ctx.supabase.from("assignments").select("id, title, course_id, due_at, assignment_submissions(status)")
          .in("course_id", courseIds).lt("due_at", nowIso()).order("due_at", { ascending: false }).limit(8)
          .overrideTypes<{ id: string; title: string; course_id: string; assignment_submissions: { status: string }[] }[], { merge: false }>()
      : Promise.resolve({ data: [] as { id: string; title: string; course_id: string; assignment_submissions: { status: string }[] }[] }),
  ]);

  const stats = (statsRes.data ?? null) as InstructorStats | null;

  // Course completion: completed lessons by enrolled students ÷ (lessons × enrolled)
  const lessonCount = new Map<string, number>();
  for (const l of lessonsRes.data ?? []) lessonCount.set(l.course_id, (lessonCount.get(l.course_id) ?? 0) + 1);
  const enrolled = new Map<string, Set<string>>();
  for (const e of enrollRes.data ?? []) {
    if (!enrolled.has(e.course_id)) enrolled.set(e.course_id, new Set());
    enrolled.get(e.course_id)!.add(e.user_id);
  }
  const completed = new Map<string, number>();
  for (const p of progressRes.data ?? []) {
    if (enrolled.get(p.lessons.course_id)?.has(p.user_id)) {
      completed.set(p.lessons.course_id, (completed.get(p.lessons.course_id) ?? 0) + 1);
    }
  }
  const courseRows = courses
    .map((c) => {
      const students = enrolled.get(c.id)?.size ?? 0;
      return { ...c, students, completion: percent(completed.get(c.id) ?? 0, (lessonCount.get(c.id) ?? 0) * students) };
    })
    .sort((a, b) => b.students - a.students);

  // Weekly attendance rate
  const weeks = new Map<string, { ok: number; total: number }>();
  for (const a of attendanceRes.data ?? []) {
    if (a.status === "excused") continue;
    const k = weekKey(a.classes.starts_at);
    const w = weeks.get(k) ?? { ok: 0, total: 0 };
    w.total += 1;
    if (a.status === "present" || a.status === "late") w.ok += 1;
    weeks.set(k, w);
  }
  const attendanceTrend = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, w]) => ({ label: week.slice(5), value: percent(w.ok, w.total), full: `Week of ${week}` }));

  const assignmentRows = (assignmentsRes.data ?? []).map((a) => {
    const students = enrolled.get(a.course_id)?.size ?? 0;
    const done = a.assignment_submissions.filter((s) => s.status !== "in_progress").length;
    return { label: a.title.length > 18 ? `${a.title.slice(0, 17)}…` : a.title, full: a.title, value: percent(done, students) };
  });

  const activity = (stats?.daily_activity ?? []).map((d) => ({ label: d.day.slice(5), value: d.count, full: d.day }));

  if (!courses.length) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader eyebrow="Teaching" title="Analytics" />
        <EmptyState icon={BarChart3} title="No courses yet" description="Analytics appear once you teach a course with enrolled students." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Teaching" title="Analytics" description="How your students are attending, progressing and submitting." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={stats?.students ?? 0} />
        <StatCard label="Active (7d)" value={stats?.active_students_7d ?? 0} hint={`${percent(stats?.active_students_7d ?? 0, stats?.students ?? 0)}% of students`} />
        <StatCard label="Attendance" value={`${stats?.attendance_rate ?? 0}%`} />
        <StatCard label="Assignments done" value={`${stats?.assignment_completion ?? 0}%`} hint="of past-due work" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Attendance rate by week">
          <SimpleBarChart data={attendanceTrend} unit="%" maxValue={100} valueLabel="Attendance" />
        </Section>
        <Section title="Student activity · 14 days">
          <SimpleBarChart data={activity} valueLabel="Learning events" color="var(--chart-2)" />
        </Section>
        <Section title="Course completion">
          <ul className="space-y-3">
            {courseRows.map((c) => (
              <li key={c.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{c.title}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {c.completion}% · {c.students} students
                  </span>
                </div>
                <Progress value={c.completion} />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Submission rate · recent assignments">
          <SimpleBarChart data={assignmentRows} unit="%" maxValue={100} valueLabel="Submitted" />
        </Section>
      </div>
    </div>
  );
}
