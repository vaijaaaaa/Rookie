import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ClassForm } from "@/components/instructor/class-form";
import { requireStaff } from "@/services/instructor/context";
import { getCourseOptions, getModuleOptions, getStaffOptions } from "@/services/instructor/scope";

export const metadata = { title: "Schedule class" };

export default async function NewClassPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const ctx = await requireStaff();
  const courses = await getCourseOptions(ctx);
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
      <PageHeader eyebrow="New" title="Schedule a class" description="Enrolled students are notified when you schedule a future class." />
      <ClassForm
        initial={null}
        courses={courses}
        modules={modules}
        staff={staff}
        isAdmin={ctx.isAdmin}
        defaultCourseId={courses.some((c) => c.id === course) ? course : undefined}
      />
    </div>
  );
}
