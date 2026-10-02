import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { AttendanceRoster, type RosterStudent } from "@/components/instructor/attendance-roster";
import { LocalTime } from "@/components/instructor/local-time";
import { requireStaff } from "@/services/instructor/context";
import { getManagedClass } from "@/services/instructor/classes";
import type { Attendance } from "@/types";

export const metadata = { title: "Take attendance" };

type Person = { id: string; full_name: string; email: string | null; avatar_url: string | null };

export default async function ClassAttendancePage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const ctx = await requireStaff();
  const cls = await getManagedClass(ctx, classId);
  if (!cls) notFound();

  const [rosterRes, attendanceRes, courseRes] = await Promise.all([
    cls.course_id
      ? ctx.supabase
          .from("course_enrollments")
          .select("profiles(id, full_name, email, avatar_url)")
          .eq("course_id", cls.course_id)
          .overrideTypes<{ profiles: Person | null }[], { merge: false }>()
      : ctx.supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .eq("role", "student")
          .overrideTypes<Person[], { merge: false }>(),
    ctx.supabase
      .from("attendance")
      .select("user_id, status, note, profiles!attendance_user_id_fkey(id, full_name, email, avatar_url)")
      .eq("class_id", cls.id)
      .overrideTypes<(Pick<Attendance, "user_id" | "status" | "note"> & { profiles: Person | null })[], { merge: false }>(),
    cls.course_id
      ? ctx.supabase.from("courses").select("title").eq("id", cls.course_id).maybeSingle<{ title: string }>()
      : Promise.resolve({ data: null }),
  ]);

  const people = new Map<string, Person>();
  for (const r of rosterRes.data ?? []) {
    const p = "profiles" in r ? r.profiles : (r as Person);
    if (p) people.set(p.id, p);
  }
  const marks = new Map((attendanceRes.data ?? []).map((a) => [a.user_id, a]));
  // Keep students who were marked but later left the course.
  for (const a of attendanceRes.data ?? []) if (a.profiles && !people.has(a.user_id)) people.set(a.user_id, a.profiles);

  const students: RosterStudent[] = [...people.values()]
    .sort((a, b) => (a.full_name || a.email || "").localeCompare(b.full_name || b.email || ""))
    .map((p) => ({
      ...p,
      status: marks.get(p.id)?.status ?? null,
      note: marks.get(p.id)?.note ?? "",
    }));

  return (
    <div className="mx-auto max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/attendance">
          <ArrowLeft /> Attendance
        </Link>
      </Button>
      <PageHeader
        eyebrow={
          <>
            <LocalTime value={cls.starts_at} /> · {cls.duration_minutes}m
          </>
        }
        title={
          <span className="flex items-center gap-2">
            {cls.title} <StatusBadge status={cls.status} />
          </span>
        }
        description={courseRes.data?.title ?? "Open session · all students"}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/classes/${cls.id}`}>
              <Pencil /> Edit class
            </Link>
          </Button>
        }
      />
      <AttendanceRoster key={students.map((s) => `${s.id}:${s.status}:${s.note}`).join("|")} classId={cls.id} students={students} />
    </div>
  );
}
