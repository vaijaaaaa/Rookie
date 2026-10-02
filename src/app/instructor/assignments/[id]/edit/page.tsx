import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { AssignmentForm } from "@/components/instructor/assignment-form";
import { requireStaff } from "@/services/instructor/context";
import { getManagedAssignment } from "@/services/instructor/assignments";
import { getCourseOptions, getLessonOptions } from "@/services/instructor/scope";

export const metadata = { title: "Edit assignment" };

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const assignment = await getManagedAssignment(ctx, id);
  if (!assignment) notFound();
  const courses = await getCourseOptions(ctx);
  const lessons = await getLessonOptions(ctx, courses.map((c) => c.id));
  const { courses: _course, ...initial } = assignment;
  void _course;
  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href={`/instructor/assignments/${assignment.id}`}>
          <ArrowLeft /> {assignment.title}
        </Link>
      </Button>
      <PageHeader eyebrow="Edit" title="Edit assignment" />
      <AssignmentForm initial={initial} courses={courses} lessons={lessons} />
    </div>
  );
}
