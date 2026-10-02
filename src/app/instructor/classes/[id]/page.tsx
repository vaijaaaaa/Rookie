import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, ExternalLink, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ClassForm } from "@/components/instructor/class-form";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { LocalTime } from "@/components/instructor/local-time";
import { requireStaff } from "@/services/instructor/context";
import { getManagedClass } from "@/services/instructor/classes";
import { getCourseOptions, getModuleOptions, getStaffOptions } from "@/services/instructor/scope";
import { deleteClass } from "../actions";

export const metadata = { title: "Edit class" };

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const cls = await getManagedClass(ctx, id);
  if (!cls) notFound();
  const courses = await getCourseOptions(ctx);
  // Keep the class's current course selectable even if owned by someone else.
  if (cls.course_id && !courses.some((c) => c.id === cls.course_id)) {
    const { data } = await ctx.supabase.from("courses").select("id, title").eq("id", cls.course_id).maybeSingle<{ id: string; title: string }>();
    if (data) courses.push(data);
  }
  const [modules, staff] = await Promise.all([
    getModuleOptions(ctx, courses.map((c) => c.id)),
    getStaffOptions(ctx),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/instructor/classes">
          <ArrowLeft /> Classes
        </Link>
      </Button>
      <PageHeader
        eyebrow={<LocalTime value={cls.starts_at} />}
        title={
          <span className="flex items-center gap-2">
            {cls.title} <StatusBadge status={cls.status} />
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/class/${cls.id}`}>
                <ExternalLink /> Student view
              </Link>
            </Button>
            <Button asChild variant="brand" size="sm">
              <Link href={`/instructor/attendance/${cls.id}`}>
                <CalendarCheck /> Take attendance
              </Link>
            </Button>
            <ConfirmAction
              action={deleteClass.bind(null, cls.id)}
              title="Delete this class?"
              description="Attendance records for this class are deleted too."
              successMessage="Class deleted"
              redirectTo="/instructor/classes"
              trigger={
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 /> Delete
                </Button>
              }
            />
          </>
        }
      />
      <ClassForm initial={cls} courses={courses} modules={modules} staff={staff} isAdmin={ctx.isAdmin} />
    </div>
  );
}
