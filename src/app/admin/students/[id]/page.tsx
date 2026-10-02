import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, BookOpen, CalendarCheck, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { LocalTime } from "@/components/instructor/local-time";
import { requireStaff } from "@/services/instructor/context";
import { titleCase } from "@/services/instructor/utils";
import { percent } from "@/lib/utils";
import type { ActivityLog, AttendanceStatus, Profile, SubmissionStatus } from "@/types";

export const metadata = { title: "Student" };

interface Overview {
  lessons_completed: number;
  problems_solved: number;
  attendance_rate: number;
  last_active: string | null;
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const sb = ctx.supabase;

  const [{ data: profile }, { data: overview }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", id).maybeSingle<Profile>(),
    sb.rpc("get_student_overview").eq("user_id", id).maybeSingle<Overview>(),
  ]);
  if (!profile || (!ctx.isAdmin && !overview)) notFound();

  const [enrollRes, activityRes, attendanceRes, submissionsRes] = await Promise.all([
    sb
      .from("course_enrollments")
      .select("course_id, enrolled_at, courses(id, title)")
      .eq("user_id", id)
      .order("enrolled_at", { ascending: false })
      .overrideTypes<{ course_id: string; enrolled_at: string; courses: { id: string; title: string } | null }[], { merge: false }>(),
    sb
      .from("activity_logs")
      .select("id, type, title, occurred_at")
      .eq("user_id", id)
      .order("occurred_at", { ascending: false })
      .limit(15)
      .overrideTypes<Pick<ActivityLog, "id" | "type" | "title" | "occurred_at">[], { merge: false }>(),
    sb
      .from("attendance")
      .select("id, status, note, classes(id, title, starts_at)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20)
      .overrideTypes<
        { id: string; status: AttendanceStatus; note: string | null; classes: { id: string; title: string; starts_at: string } | null }[],
        { merge: false }
      >(),
    sb
      .from("assignment_submissions")
      .select("id, status, submitted_at, grade, assignments(id, title, points, due_at)")
      .eq("user_id", id)
      .order("updated_at", { ascending: false })
      .limit(20)
      .overrideTypes<
        {
          id: string;
          status: SubmissionStatus;
          submitted_at: string | null;
          grade: number | null;
          assignments: { id: string; title: string; points: number; due_at: string } | null;
        }[],
        { merge: false }
      >(),
  ]);

  const enrollments = enrollRes.data ?? [];
  const courseIds = enrollments.map((e) => e.course_id);
  const [lessonsRes, progressRes] = courseIds.length
    ? await Promise.all([
        sb
          .from("lessons")
          .select("course_id")
          .in("course_id", courseIds)
          .eq("is_published", true)
          .overrideTypes<{ course_id: string }[], { merge: false }>(),
        sb
          .from("student_progress")
          .select("lesson_id, lessons!inner(course_id, is_published)")
          .eq("user_id", id)
          .eq("status", "completed")
          .eq("lessons.is_published", true)
          .in("lessons.course_id", courseIds)
          .overrideTypes<{ lesson_id: string; lessons: { course_id: string } }[], { merge: false }>(),
      ])
    : [{ data: [] }, { data: [] }];

  const totalBy = new Map<string, number>();
  for (const l of lessonsRes.data ?? []) totalBy.set(l.course_id, (totalBy.get(l.course_id) ?? 0) + 1);
  const doneBy = new Map<string, number>();
  for (const p of progressRes.data ?? []) doneBy.set(p.lessons.course_id, (doneBy.get(p.lessons.course_id) ?? 0) + 1);

  const activity = activityRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const submissions = submissionsRes.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/students">
          <ArrowLeft /> Students
        </Link>
      </Button>
      <PageHeader
        eyebrow={
          <>
            Joined <LocalTime value={profile.created_at} format="date" />
          </>
        }
        title={
          <span className="flex items-center gap-3">
            <UserAvatar name={profile.full_name} src={profile.avatar_url} className="size-9" />
            {profile.full_name || "Unnamed student"}
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {profile.email}
            {profile.learning_goal ? ` · ${titleCase(profile.learning_goal)}` : ""}
          </span>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lessons done" value={overview?.lessons_completed ?? 0} icon={BookOpen} />
        <StatCard label="Problems solved" value={overview?.problems_solved ?? 0} />
        <StatCard label="Attendance" value={`${overview?.attendance_rate ?? 0}%`} icon={CalendarCheck} />
        <StatCard
          label="Last active"
          value={<span className="text-base">{overview?.last_active ? <LocalTime value={overview.last_active} format="relative" /> : "Never"}</span>}
          icon={Activity}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Courses">
          {enrollments.length === 0 ? (
            <EmptyState title="Not enrolled in your courses" className="py-6" />
          ) : (
            <ul className="grid gap-3">
              {enrollments.map((e) => {
                const total = totalBy.get(e.course_id) ?? 0;
                const done = doneBy.get(e.course_id) ?? 0;
                const pct = percent(done, total);
                return (
                  <li key={e.course_id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <Link href={`/admin/courses/${e.course_id}`} className="truncate font-medium hover:underline">
                        {e.courses?.title ?? "Course"}
                      </Link>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                        {done}/{total} · {pct}%
                      </span>
                    </div>
                    <Progress value={pct} />
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Recent activity">
          {activity.length === 0 ? (
            <EmptyState title="No activity yet" className="py-6" />
          ) : (
            <ul className="grid gap-2 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 font-mono text-[11px] text-muted-foreground">{titleCase(a.type)}</span>
                    {a.title}
                  </span>
                  <LocalTime value={a.occurred_at} format="relative" className="shrink-0 font-mono text-xs text-muted-foreground" />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Attendance">
          {attendance.length === 0 ? (
            <EmptyState title="No attendance records" className="py-6" />
          ) : (
            <ul className="grid gap-2 text-sm">
              {attendance.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <Link href={`/admin/attendance/${a.classes?.id}`} className="block truncate hover:underline">
                      {a.classes?.title ?? "Class"}
                    </Link>
                    {a.note ? <span className="block truncate text-xs text-muted-foreground">{a.note}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <LocalTime value={a.classes?.starts_at} format="date" className="font-mono text-xs text-muted-foreground" />
                    <StatusBadge status={a.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Submissions">
          {submissions.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No submissions" className="py-6" />
          ) : (
            <ul className="grid gap-2 text-sm">
              {submissions.map((s) => {
                const late = !!(s.submitted_at && s.assignments && Date.parse(s.submitted_at) > Date.parse(s.assignments.due_at));
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/admin/assignments/${s.assignments?.id}?submission=${s.id}`}
                      className="min-w-0 truncate hover:underline"
                    >
                      {s.assignments?.title ?? "Assignment"}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      {late ? <Badge variant="danger">Late</Badge> : null}
                      {s.grade !== null ? (
                        <span className="font-mono text-xs tabular-nums">
                          {s.grade}/{s.assignments?.points}
                        </span>
                      ) : null}
                      <StatusBadge status={s.status} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
