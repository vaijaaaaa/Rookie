"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, FileText, ListTree, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createNode, deleteNode, moveNode, updateNode } from "@/app/instructor/roadmaps/actions";
import { roadmapNodeSchema, type RoadmapNodeInput } from "@/services/instructor/schemas";
import type { RoadmapNode } from "@/types";
import { Field } from "./field";
import { FormFooter } from "./form-footer";
import { ConfirmAction } from "./confirm-action";
import { MoveButtons } from "./move-buttons";
import { submitOnModEnter, toastResult } from "./form-utils";

type Option = { id: string; title: string };
type LessonOption = Option & { course_id: string };
type Section = RoadmapNode & { topics: RoadmapNode[] };

function NodeDialog({
  roadmapId,
  parent,
  initial,
  courses,
  lessons,
  trigger,
}: {
  roadmapId: string;
  /** section the topic belongs to; undefined when editing/creating a section */
  parent?: Section;
  initial?: RoadmapNode;
  courses: Option[];
  lessons: LessonOption[];
  trigger: React.ReactNode;
}) {
  const isTopic = !!parent;
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initialLessonCourse = initial?.lesson_id ? lessons.find((l) => l.id === initial.lesson_id)?.course_id : undefined;
  const { register, handleSubmit, formState, reset, control, setValue } = useForm<RoadmapNodeInput>({
    resolver: zodResolver(roadmapNodeSchema),
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      course_id: initial?.course_id ?? initialLessonCourse ?? parent?.course_id ?? "",
      lesson_id: initial?.lesson_id ?? "",
    },
  });
  const courseId = useWatch({ control, name: "course_id" });
  const lessonChoices = courseId ? lessons.filter((l) => l.course_id === courseId) : [];

  async function onSubmit(values: RoadmapNodeInput) {
    const res = initial ? await updateNode(initial.id, values) : await createNode(roadmapId, parent?.id ?? null, values);
    if (toastResult(res, "Saved")) {
      setOpen(false);
      if (!initial) reset();
      router.refresh();
    }
  }

  const kind = isTopic ? "topic" : "section";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit" : "New"} {kind}
          </DialogTitle>
          <DialogDescription>
            {isTopic
              ? "Link a lesson and the topic completes automatically when the student finishes it."
              : "Sections group topics. Optionally point a section at a course."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={submitOnModEnter} className="grid gap-4" noValidate>
          <Field label="Title" htmlFor={`${kind}-title`} error={formState.errors.title?.message}>
            <Input id={`${kind}-title`} autoFocus {...register("title")} />
          </Field>
          <Field label="Description" htmlFor={`${kind}-description`}>
            <Textarea id={`${kind}-description`} rows={3} {...register("description")} />
          </Field>
          <Field label={isTopic ? "Course (to pick a lesson)" : "Course (optional)"} htmlFor={`${kind}-course`}>
            <NativeSelect
              id={`${kind}-course`}
              {...register("course_id", { onChange: () => setValue("lesson_id", "") })}
            >
              <option value="">— None —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {isTopic ? (
            <Field label="Lesson (optional)" htmlFor="topic-lesson">
              <NativeSelect id="topic-lesson" disabled={!lessonChoices.length} {...register("lesson_id")}>
                <option value="">{courseId ? (lessonChoices.length ? "— None —" : "No lessons in course") : "Pick a course first"}</option>
                {lessonChoices.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          <FormFooter pending={formState.isSubmitting} label={initial ? "Save" : `Add ${kind}`} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RoadmapNodesEditor({
  roadmapId,
  sections,
  courses,
  lessons,
}: {
  roadmapId: string;
  sections: Section[];
  courses: Option[];
  lessons: LessonOption[];
}) {
  const courseTitle = new Map(courses.map((c) => [c.id, c.title]));
  const lessonTitle = new Map(lessons.map((l) => [l.id, l.title]));
  const topicCount = sections.reduce((n, s) => n + s.topics.length, 0);
  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Nodes · {sections.length} sections · {topicCount} topics
        </h2>
        <NodeDialog
          roadmapId={roadmapId}
          courses={courses}
          lessons={lessons}
          trigger={
            <Button size="sm" variant="outline">
              <Plus /> Section
            </Button>
          }
        />
      </header>
      <div className="grid gap-3 p-4">
        {sections.length === 0 ? (
          <EmptyState icon={ListTree} title="No sections yet" description="Add sections, then topics inside them." />
        ) : (
          sections.map((s, si) => (
            <div key={s.id} className="rounded-md border">
              <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{String(si + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  {s.course_id ? (
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <BookOpen className="size-3" /> {courseTitle.get(s.course_id) ?? "Linked course"}
                    </p>
                  ) : null}
                </div>
                <MoveButtons action={moveNode.bind(null, s.id)} isFirst={si === 0} isLast={si === sections.length - 1} label="section" />
                <NodeDialog
                  roadmapId={roadmapId}
                  initial={s}
                  courses={courses}
                  lessons={lessons}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Edit section">
                      <Pencil />
                    </Button>
                  }
                />
                <ConfirmAction
                  action={deleteNode.bind(null, s.id)}
                  title={`Delete section "${s.title}"?`}
                  description={`Its ${s.topics.length} topic(s) and student completion records are deleted.`}
                  successMessage="Section deleted"
                />
              </div>
              <ul className="divide-y">
                {s.topics.map((t, ti) => (
                  <li key={t.id} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{t.title}</p>
                      {t.lesson_id ? (
                        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                          <FileText className="size-3" /> {lessonTitle.get(t.lesson_id) ?? "Linked lesson"}
                        </p>
                      ) : null}
                    </div>
                    <MoveButtons action={moveNode.bind(null, t.id)} isFirst={ti === 0} isLast={ti === s.topics.length - 1} label="topic" />
                    <NodeDialog
                      roadmapId={roadmapId}
                      parent={s}
                      initial={t}
                      courses={courses}
                      lessons={lessons}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Edit topic">
                          <Pencil />
                        </Button>
                      }
                    />
                    <ConfirmAction action={deleteNode.bind(null, t.id)} title={`Delete topic "${t.title}"?`} successMessage="Topic deleted" />
                  </li>
                ))}
                <li className="px-1.5 py-1">
                  <NodeDialog
                    roadmapId={roadmapId}
                    parent={s}
                    courses={courses}
                    lessons={lessons}
                    trigger={
                      <Button variant="ghost" size="sm">
                        <Plus /> Topic
                      </Button>
                    }
                  />
                </li>
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
