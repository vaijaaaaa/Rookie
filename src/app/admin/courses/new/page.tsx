import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CourseForm } from "@/components/instructor/course-form";
import { requireStaff } from "@/services/instructor/context";
import { getStaffOptions } from "@/services/instructor/scope";
import { getCourseCategories } from "@/services/instructor/categories";

export const metadata = { title: "New course" };

export default async function NewCoursePage() {
  const ctx = await requireStaff();
  const [categories, staff] = await Promise.all([getCourseCategories(ctx), getStaffOptions(ctx)]);
  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/courses">
          <ArrowLeft /> Courses
        </Link>
      </Button>
      <PageHeader eyebrow="New" title="Create a course" description="Start with the basics — you'll add modules and lessons next." />
      <CourseForm initial={null} categories={categories} staff={staff} isAdmin={ctx.isAdmin} />
    </div>
  );
}
