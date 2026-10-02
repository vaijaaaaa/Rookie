import Link from "next/link";
import { BookOpen, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { requireStaff } from "@/services/instructor/context";
import type { Course } from "@/types";
import { deleteCourse } from "./actions";

export const metadata = { title: "Courses" };

type Row = Pick<Course, "id" | "title" | "slug" | "category" | "difficulty" | "is_published" | "estimated_hours" | "icon"> & {
  profiles: { full_name: string } | null;
  course_modules: { count: number }[];
  lessons: { count: number }[];
  course_enrollments: { count: number }[];
};

export default async function CoursesPage() {
  const ctx = await requireStaff();
  let q = ctx.supabase
    .from("courses")
    .select(
      "id, title, slug, category, difficulty, is_published, estimated_hours, icon, profiles(full_name), course_modules(count), lessons(count), course_enrollments(count)",
    )
    .order("position")
    .order("title");
  if (!ctx.isAdmin) q = q.eq("instructor_id", ctx.profile.id);
  const { data } = await q.overrideTypes<Row[], { merge: false }>();
  const courses = data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Content"
        title="Courses"
        description={ctx.isAdmin ? "All courses on the platform." : "Courses you teach."}
        actions={
          <Button asChild variant="brand">
            <Link href="/admin/courses/new">
              <Plus /> New course
            </Link>
          </Button>
        }
      />
      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create a course, then add modules and lessons."
          action={
            <Button asChild variant="brand" size="sm">
              <Link href="/admin/courses/new">
                <Plus /> New course
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="hidden md:table-cell">Level</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Modules</TableHead>
                <TableHead className="text-right">Lessons</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-80">
                    <Link href={`/admin/courses/${c.id}`} className="flex items-center gap-2 font-medium hover:underline">
                      {c.icon ? <span aria-hidden>{c.icon.length <= 4 ? c.icon : ""}</span> : null}
                      <span className="truncate">{c.title}</span>
                    </Link>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {c.category}
                      {ctx.isAdmin && c.profiles ? ` · ${c.profiles.full_name}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <DifficultyBadge value={c.difficulty} />
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">{c.course_modules[0]?.count ?? 0}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{c.lessons[0]?.count ?? 0}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{c.course_enrollments[0]?.count ?? 0}</TableCell>
                  <TableCell>{c.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="outline">Draft</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Edit course">
                        <Link href={`/admin/courses/${c.id}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <ConfirmAction
                        action={deleteCourse.bind(null, c.id)}
                        title={`Delete "${c.title}"?`}
                        description="All modules, lessons, assignments, enrollments and progress for this course are permanently deleted."
                        successMessage="Course deleted"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
