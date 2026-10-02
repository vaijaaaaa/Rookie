"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { saveCourse } from "@/app/instructor/courses/actions";
import { courseSchema, type CourseInput } from "@/services/instructor/schemas";
import { DIFFICULTIES, slugify, titleCase } from "@/services/instructor/utils";
import type { Course } from "@/types";
import { Field, FormSection } from "./field";
import { FormFooter } from "./form-footer";
import { MarkdownEditor } from "./markdown-editor";
import { SwitchField } from "./publish-switch";
import { submitOnModEnter, toastResult } from "./form-utils";

export function CourseForm({
  initial,
  categories,
  staff,
  isAdmin,
}: {
  initial: Course | null;
  categories: string[];
  staff: { id: string; full_name: string; email: string | null }[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const { register, control, handleSubmit, setValue, formState } = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      summary: initial?.summary ?? "",
      description: initial?.description ?? "",
      category: initial?.category ?? "fundamentals",
      difficulty: initial?.difficulty ?? "beginner",
      estimated_hours: initial?.estimated_hours ?? 10,
      icon: initial?.icon ?? "",
      is_published: initial?.is_published ?? false,
      instructor_id: initial?.instructor_id ?? "",
    },
  });
  const { errors, isSubmitting } = formState;

  async function onSubmit(values: CourseInput) {
    const res = await saveCourse(initial?.id ?? null, values);
    if (!toastResult(res, "Saved")) return;
    if (!initial && res.data) router.push(`/instructor/courses/${res.data.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={submitOnModEnter} className="grid gap-4" noValidate>
      <FormSection title="Course">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input
              id="title"
              autoFocus={!initial}
              aria-invalid={!!errors.title}
              {...register("title", {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (!slugTouched) setValue("slug", slugify(e.target.value), { shouldValidate: !!errors.slug });
                },
              })}
            />
          </Field>
          <Field label="Slug" htmlFor="slug" error={errors.slug?.message} hint="Used in the URL: /courses/slug">
            <Input
              id="slug"
              className="font-mono"
              aria-invalid={!!errors.slug}
              {...register("slug", { onChange: () => setSlugTouched(true) })}
            />
          </Field>
        </div>
        <Field label="Summary" htmlFor="summary" error={errors.summary?.message} hint="One or two sentences shown on cards.">
          <Textarea id="summary" rows={2} {...register("summary")} />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <Controller
            control={control}
            name="description"
            render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} onBlur={field.onBlur} rows={8} />}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Category" htmlFor="category" error={errors.category?.message}>
            <Input id="category" list="course-categories" {...register("category")} />
            <datalist id="course-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Difficulty" htmlFor="difficulty">
            <NativeSelect id="difficulty" {...register("difficulty")}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {titleCase(d)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Est. hours" htmlFor="estimated_hours" error={errors.estimated_hours?.message}>
            <Input id="estimated_hours" type="number" min={0} className="font-mono" {...register("estimated_hours", { valueAsNumber: true })} />
          </Field>
          <Field label="Icon" htmlFor="icon" hint="Emoji or icon name">
            <Input id="icon" placeholder="🐍" {...register("icon")} />
          </Field>
        </div>
        {isAdmin ? (
          <Field label="Instructor" htmlFor="instructor_id">
            <NativeSelect id="instructor_id" {...register("instructor_id")}>
              <option value="">{initial ? "— Keep current —" : "— Me —"}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <SwitchField control={control} name="is_published" label="Published" description="Visible in the course catalog." />
      </FormSection>
      <FormFooter pending={isSubmitting} label={initial ? "Save course" : "Create course"} />
    </form>
  );
}
