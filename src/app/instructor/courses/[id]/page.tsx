import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseForm } from "@/components/instructor/course-form";
import { CurriculumEditor } from "@/components/instructor/curriculum-editor";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { requireStaff } from "@/services/instructor/context";
import { getCurriculum, getManagedCourse } from "@/services/instructor/courses";
import { getStaffOptions } from "@/services/instructor/scope";
import { getCourseCategories } from "@/services/instructor/categories";
import { deleteCourse } from "../actions";

export const metadata = { title: "Edit course" };

export default async function CourseEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const course = await getManagedCourse(ctx, id);
  if (!course) notFound();
  const [modules, categories, staff] = await Promise.all([
    getCurriculum(ctx, course.id),
    getCourseCategories(ctx),
    getStaffOptions(ctx),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/instructor/courses">
          <ArrowLeft /> Courses
        </Link>
      </Button>
      <PageHeader
        eyebrow={<span className="font-mono">/courses/{course.slug}</span>}
        title={
          <span className="flex items-center gap-2">
            {course.title}
            {course.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="outline">Draft</Badge>}
          </span>
        }
        actions={
          <>
            {course.is_published ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/courses/${course.slug}`}>
                  <ExternalLink /> View
                </Link>
              </Button>
            ) : null}
            <ConfirmAction
              action={deleteCourse.bind(null, course.id)}
              title="Delete this course?"
              description="All modules, lessons, assignments, enrollments and progress for this course are permanently deleted."
              successMessage="Course deleted"
              redirectTo="/instructor/courses"
              trigger={
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 /> Delete
                </Button>
              }
            />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CourseForm initial={course} categories={categories} staff={staff} isAdmin={ctx.isAdmin} />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <CurriculumEditor courseId={course.id} modules={modules} />
        </div>
      </div>
    </div>
  );
}
