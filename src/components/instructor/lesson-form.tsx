"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveLesson } from "@/app/instructor/courses/actions";
import { lessonSchema, type LessonInput } from "@/services/instructor/schemas";
import type { Lesson } from "@/types";
import { Field, FormSection } from "./field";
import { FormFooter } from "./form-footer";
import { MarkdownEditor } from "./markdown-editor";
import { SwitchField } from "./publish-switch";
import { submitOnModEnter, toastResult } from "./form-utils";

export function LessonForm({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const { register, control, handleSubmit, formState } = useForm<LessonInput>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: lesson.title,
      slug: lesson.slug,
      summary: lesson.summary,
      content: lesson.content,
      exercise: lesson.exercise ?? "",
      video_url: lesson.video_url ?? "",
      estimated_minutes: lesson.estimated_minutes,
      is_published: lesson.is_published,
    },
  });
  const { errors, isSubmitting } = formState;

  async function onSubmit(values: LessonInput) {
    const res = await saveLesson(lesson.id, values);
    if (toastResult(res, "Lesson saved")) router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={submitOnModEnter} className="grid gap-4" noValidate>
      <FormSection title="Lesson">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
          </Field>
          <Field label="Slug" htmlFor="slug" error={errors.slug?.message}>
            <Input id="slug" className="font-mono" aria-invalid={!!errors.slug} {...register("slug")} />
          </Field>
        </div>
        <Field label="Summary" htmlFor="summary" error={errors.summary?.message}>
          <Textarea id="summary" rows={2} {...register("summary")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Video URL" htmlFor="video_url" error={errors.video_url?.message}>
            <Input id="video_url" type="url" placeholder="https://youtube.com/…" className="font-mono text-xs" {...register("video_url")} />
          </Field>
          <Field label="Est. minutes" htmlFor="estimated_minutes" error={errors.estimated_minutes?.message}>
            <Input id="estimated_minutes" type="number" min={0} className="font-mono" {...register("estimated_minutes", { valueAsNumber: true })} />
          </Field>
        </div>
        <SwitchField control={control} name="is_published" label="Published" description="Students only see published lessons of published courses." />
      </FormSection>

      <FormSection title="Content" description="Markdown with GFM: tables, task lists, fenced code.">
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <MarkdownEditor value={field.value} onChange={field.onChange} onBlur={field.onBlur} rows={24} invalid={!!errors.content} />
          )}
        />
        {errors.content ? <p className="text-xs text-destructive">{errors.content.message}</p> : null}
      </FormSection>

      <FormSection title="Exercise" description="Optional practice task shown after the lesson.">
        <Controller
          control={control}
          name="exercise"
          render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} onBlur={field.onBlur} rows={8} />}
        />
      </FormSection>

      <FormFooter pending={isSubmitting} label="Save lesson" />
    </form>
  );
}
