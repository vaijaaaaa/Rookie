"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createNote, deleteNote, updateNote, type NoteAttach, type NoteAttachOptions } from "@/services/notes";
import type { Note } from "@/types";
import { MarkdownField } from "./markdown-field";

const schema = z
  .object({
    title: z.string().trim().max(200, "Keep the title under 200 characters"),
    content: z.string().max(50_000, "This note is too long"),
    course_id: z.string(),
    lesson_id: z.string(),
    problem_id: z.string(),
    class_id: z.string(),
  })
  .refine((v) => v.title.length > 0 || v.content.trim().length > 0, {
    message: "Add a title or some content",
    path: ["content"],
  });

type Values = z.infer<typeof schema>;

export function NoteEditor({
  note,
  options,
  timeZone = "UTC",
  initialAttach,
}: {
  note?: Note | null;
  /** prefill attachments for a new note (e.g. /notes/new?lesson_id=…) */
  initialAttach?: NoteAttach;
  options: NoteAttachOptions;
  /** user's timezone, so class dates match on server and client */
  timeZone?: string;
}) {
  const router = useRouter();
  const dateFmt = React.useMemo(
    () => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }),
    [timeZone],
  );
  const [deleting, startDelete] = React.useTransition();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: note?.title ?? "",
      content: note?.content ?? "",
      course_id: note?.course_id ?? initialAttach?.course_id ?? "",
      lesson_id: note?.lesson_id ?? initialAttach?.lesson_id ?? "",
      problem_id: note?.problem_id ?? initialAttach?.problem_id ?? "",
      class_id: note?.class_id ?? initialAttach?.class_id ?? "",
    },
  });
  const { register, handleSubmit, control, formState, setValue, reset } = form;
  const courseId = useWatch({ control, name: "course_id" });
  const lessons = React.useMemo(
    () => (courseId ? options.lessons.filter((l) => l.course_id === courseId) : []),
    [courseId, options.lessons],
  );

  // Make sure an attached course/lesson that's no longer in the enrolled list still shows.
  const courseMissing = !!note?.course_id && !options.courses.some((c) => c.id === note.course_id);
  const lessonMissing = !!note?.lesson_id && !options.lessons.some((l) => l.id === note.lesson_id);
  const problemMissing = !!note?.problem_id && !options.problems.some((p) => p.id === note.problem_id);
  const classMissing = !!note?.class_id && !options.classes.some((c) => c.id === note.class_id);

  async function onSubmit(values: Values) {
    const payload = { ...values, title: values.title.trim() };
    if (note) {
      const res = await updateNote(note.id, payload);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Note saved");
      if (res.data) reset({ ...values, title: res.data.title });
      router.refresh();
    } else {
      const res = await createNote(payload);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Note created");
      router.replace(res.data ? `/notes/${res.data.id}` : "/notes");
    }
  }

  function onDelete() {
    if (!note) return;
    startDelete(async () => {
      const res = await deleteNote(note.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Note deleted");
      router.replace("/notes");
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          void handleSubmit(onSubmit)();
        }
      }}
      className="grid gap-4 lg:grid-cols-[1fr_17rem]"
      noValidate
    >
      <div className="min-w-0 space-y-3">
        <div>
          <Label htmlFor="note-title" className="sr-only">
            Title
          </Label>
          <Input
            id="note-title"
            placeholder="Untitled note"
            className="h-11 border-transparent bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
            autoFocus={!note}
            aria-invalid={!!formState.errors.title}
            {...register("title")}
          />
          {formState.errors.title ? (
            <p className="text-xs text-destructive" role="alert">
              {formState.errors.title.message}
            </p>
          ) : null}
        </div>
        <Controller
          control={control}
          name="content"
          render={({ field, fieldState }) => (
            <div>
              <MarkdownField
                id="note-content"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                minHeight="min-h-[22rem]"
                placeholder={"# Big idea\n\nWrite what you learned, in your own words.\n\n```java\n// code snippets welcome\n```"}
                aria-invalid={!!fieldState.error}
              />
              {fieldState.error ? (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          )}
        />
      </div>

      <aside className="space-y-4">
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Attach to</p>

          <div className="grid gap-1.5">
            <Label htmlFor="note-course" className="text-xs">
              Course
            </Label>
            <NativeSelect id="note-course" {...register("course_id", { onChange: () => setValue("lesson_id", "") })}>
              <option value="">None</option>
              {courseMissing ? <option value={note!.course_id!}>Current course</option> : null}
              {options.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="note-lesson" className="text-xs">
              Lesson
            </Label>
            <NativeSelect id="note-lesson" disabled={!courseId && !lessonMissing} {...register("lesson_id")}>
              <option value="">{courseId ? "None" : "Pick a course first"}</option>
              {lessonMissing ? <option value={note!.lesson_id!}>Current lesson</option> : null}
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="note-problem" className="text-xs">
              Problem
            </Label>
            <NativeSelect id="note-problem" {...register("problem_id")}>
              <option value="">None</option>
              {problemMissing ? <option value={note!.problem_id!}>Current problem</option> : null}
              {options.problems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="note-class" className="text-xs">
              Class
            </Label>
            <NativeSelect id="note-class" {...register("class_id")}>
              <option value="">None</option>
              {classMissing ? <option value={note!.class_id!}>Current class</option> : null}
              {options.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {dateFmt.format(new Date(c.starts_at))} · {c.title}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="brand" disabled={formState.isSubmitting || (!!note && !formState.isDirty)}>
            {formState.isSubmitting ? "Saving…" : note ? (formState.isDirty ? "Save changes" : "Saved") : "Create note"}
          </Button>
          <p className="text-center font-mono text-[11px] text-muted-foreground">⌘/Ctrl + S to save</p>
          {note ? (
            confirmDelete ? (
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" size="sm" className="flex-1" onClick={onDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Confirm delete"}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 /> Delete note
              </Button>
            )
          ) : null}
        </div>
      </aside>
    </form>
  );
}
