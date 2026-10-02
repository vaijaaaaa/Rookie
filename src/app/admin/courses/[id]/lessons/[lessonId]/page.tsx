import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonForm } from "@/components/instructor/lesson-form";
import { LessonResources } from "@/components/instructor/lesson-resources";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { requireStaff } from "@/services/instructor/context";
import { getManagedLesson } from "@/services/instructor/courses";
import type { LessonResource } from "@/types";
import { deleteLesson } from "../../../actions";

export const metadata = { title: "Edit lesson" };

export default async function LessonEditorPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const ctx = await requireStaff();
  const found = await getManagedLesson(ctx, id, lessonId);
  if (!found) notFound();
  const { course, lesson } = found;
  const [{ data: resources }, { data: mod }] = await Promise.all([
    ctx.supabase
      .from("lesson_resources")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("position")
      .order("created_at")
      .overrideTypes<LessonResource[], { merge: false }>(),
    ctx.supabase.from("course_modules").select("title").eq("id", lesson.module_id).maybeSingle<{ title: string }>(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href={`/admin/courses/${course.id}`}>
          <ArrowLeft /> {course.title}
        </Link>
      </Button>
      <PageHeader
        eyebrow={mod?.title ?? "Lesson"}
        title={
          <span className="flex items-center gap-2">
            {lesson.title}
            {lesson.is_published ? null : <Badge variant="outline">Draft</Badge>}
          </span>
        }
        actions={
          <ConfirmAction
            action={deleteLesson.bind(null, lesson.id)}
            title="Delete this lesson?"
            description="Student progress on this lesson is deleted too."
            successMessage="Lesson deleted"
            redirectTo={`/admin/courses/${course.id}`}
            trigger={
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 /> Delete
              </Button>
            }
          />
        }
      />
      <div className="grid gap-4">
        <LessonForm lesson={lesson} />
        <LessonResources lessonId={lesson.id} resources={resources ?? []} />
      </div>
    </div>
  );
}
