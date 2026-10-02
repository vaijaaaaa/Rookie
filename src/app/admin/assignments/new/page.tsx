import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { AssignmentForm } from "@/components/instructor/assignment-form";
import { requireStaff } from "@/services/instructor/context";
import { getCourseOptions, getLessonOptions } from "@/services/instructor/scope";

export const metadata = { title: "New assignment" };

export default async function NewAssignmentPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const ctx = await requireStaff();
  const courses = await getCourseOptions(ctx);
  const lessons = await getLessonOptions(ctx, courses.map((c) => c.id));
  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/assignments">
          <ArrowLeft /> Assignments
        </Link>
      </Button>
      <PageHeader eyebrow="New" title="Create an assignment" />
      {courses.length ? (
        <AssignmentForm
          initial={null}
          courses={courses}
          lessons={lessons}
          defaultCourseId={courses.some((c) => c.id === course) ? course : undefined}
        />
      ) : (
        <EmptyState title="You need a course first" action={<Button asChild variant="brand" size="sm"><Link href="/admin/courses/new">New course</Link></Button>} />
      )}
    </div>
  );
}
