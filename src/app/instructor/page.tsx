import Link from "next/link";
import {
  BookOpen, CalendarCheck, CalendarPlus, ClipboardCheck, ClipboardList, Megaphone, Users, Video,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { SimpleBarChart } from "@/components/instructor/bar-chart";
import { LocalTime } from "@/components/instructor/local-time";
import { requireStaff } from "@/services/instructor/context";
import { classScopeFilter, getManagedCourseIds } from "@/services/instructor/scope";
import { dayBoundsInTz, nowIso, DAY } from "@/services/instructor/time";
import type { ClassStatus } from "@/types";

export const metadata = { title: "Instructor" };

interface InstructorStats {
  courses: number;
  students: number;
  classes_upcoming: number;
  attendance_rate: number;
  pending_reviews: number;
  assignment_completion: number;
  active_students_7d: number;
  daily_activity: { day: string; count: number }[];
}

interface ClassRow {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  status: ClassStatus;
  meeting_url: string | null;
  courses: { title: string } | null;
}

interface ReviewRow {
  id: string;
  submitted_at: string | null;
  assignment_id: string;
  assignments: { title: string; due_at: string } | null;
  profiles: { full_name: string } | null;
}

export default async function InstructorDashboard() {
  const ctx = await requireStaff();
  const courseIds = await getManagedCourseIds(ctx);
  const scope = classScopeFilter(ctx, courseIds);
  const today = dayBoundsInTz(ctx.profile.timezone || "UTC", new Date());

  const classQuery = () => {
    const q = ctx.supabase
      .from("classes")
      .select("id, title, starts_at, duration_minutes, status, meeting_url, courses(title)")
      .neq("status", "cancelled");
    return scope ? q.or(scope) : q;
  };

  const [statsRes, todayRes, upcomingRes, reviewsRes, annRes] = await Promise.all([
    ctx.supabase.rpc("get_instructor_stats"),
    classQuery().gte("starts_at", today.start).lt("starts_at", today.end).order("starts_at")
      .overrideTypes<ClassRow[], { merge: false }>(),
    classQuery().gte("starts_at", today.end).lt("starts_at", nowIso(7 * DAY)).order("starts_at").limit(6)
      .overrideTypes<ClassRow[], { merge: false }>(),
    courseIds.length
      ? ctx.supabase
          .from("assignment_submissions")
          .select("id, submitted_at, assignment_id, assignments!inner(title, due_at, course_id), profiles!assignment_submissions_user_id_fkey(full_name)")
          .eq("status", "submitted")
          .in("assignments.course_id", courseIds)
          .order("submitted_at")
          .limit(6)
          .overrideTypes<ReviewRow[], { merge: false }>()
      : Promise.resolve({ data: [] as ReviewRow[] }),
    ctx.supabase.from("announcements").select("id, title, created_at").order("created_at", { ascending: false }).limit(3)
      .overrideTypes<{ id: string; title: string; created_at: string }[], { merge: false }>(),
  ]);

  const stats = (statsRes.data ?? null) as InstructorStats | null;
  const todayClasses = todayRes.data ?? [];
  const upcoming = upcomingRes.data ?? [];
  const reviews = reviewsRes.data ?? [];
  const activity = (stats?.daily_activity ?? []).map((d) => ({ label: d.day.slice(5), value: d.count, full: d.day }));
  const firstName = ctx.profile.full_name.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={ctx.isAdmin ? "Admin · teaching" : "Instructor"}
        title={`Welcome back, ${firstName}`}
        description={
          todayClasses.length
            ? `You teach ${todayClasses.length} class${todayClasses.length > 1 ? "es" : ""} today.`
            : "No classes today — a good day to prepare content."
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/instructor/announcements"><Megaphone /> Announce</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/instructor/assignments/new"><ClipboardList /> New assignment</Link>
            </Button>
            <Button asChild variant="brand" size="sm">
              <Link href="/instructor/classes/new"><CalendarPlus /> Schedule class</Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={stats?.students ?? 0} hint={`${stats?.active_students_7d ?? 0} active this week`} icon={Users} />
        <StatCard label="Attendance" value={`${stats?.attendance_rate ?? 0}%`} hint="present + late" icon={CalendarCheck} />
        <StatCard label="Courses" value={stats?.courses ?? 0} hint={`${stats?.classes_upcoming ?? 0} upcoming classes`} icon={BookOpen} />
        <StatCard label="To review" value={stats?.pending_reviews ?? 0} hint={`${stats?.assignment_completion ?? 0}% assignment completion`} icon={ClipboardCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Today's classes" href="/instructor/classes">
          {todayClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>
          ) : (
            <ul className="space-y-3">
              {todayClasses.map((k) => (
                <li key={k.id} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                    <LocalTime value={k.starts_at} format="time" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/instructor/classes/${k.id}`} className="block truncate text-sm font-medium hover:underline">{k.title}</Link>
                    <p className="truncate text-xs text-muted-foreground">{k.courses?.title ?? "Open session"} · {k.duration_minutes} min</p>
                  </div>
                  <StatusBadge status={k.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/instructor/attendance/${k.id}`}>Attendance</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Waiting for review" href="/instructor/assignments">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul className="space-y-2.5">
              {reviews.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/instructor/assignments/${r.assignment_id}`} className="block truncate font-medium hover:underline">
                      {r.assignments?.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{r.profiles?.full_name}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    <LocalTime value={r.submitted_at} format="relative" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Student activity · 14 days" href="/instructor/analytics" hrefLabel="Analytics">
          <SimpleBarChart data={activity} valueLabel="Learning events" height={170} />
        </Section>

        <Section title="Upcoming this week" href="/instructor/classes">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No more classes this week.</p>
          ) : (
            <ul className="space-y-2.5">
              {upcoming.map((k) => (
                <li key={k.id} className="flex items-center gap-3 text-sm">
                  <Video className="size-4 shrink-0 text-muted-foreground" />
                  <Link href={`/instructor/classes/${k.id}`} className="min-w-0 flex-1 truncate hover:underline">{k.title}</Link>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    <LocalTime value={k.starts_at} format="short" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Recent announcements" href="/instructor/announcements" className="lg:col-span-2">
          {(annRes.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-3">
              {(annRes.data ?? []).map((a) => (
                <li key={a.id} className="rounded-md border p-3">
                  <p className="line-clamp-2 text-sm font-medium">{a.title}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground"><LocalTime value={a.created_at} format="relative" /></p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
