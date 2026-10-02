"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { saveAssignment } from "@/app/admin/assignments/actions";
import { assignmentSchema } from "@/services/instructor/schemas";
import { isoToLocalInput, localInputToIso } from "@/services/instructor/time";
import { SUBMISSION_TYPES, titleCase } from "@/services/instructor/utils";
import type { Assignment } from "@/types";
import { Field, FormSection } from "./field";
import { FormFooter } from "./form-footer";
import { MarkdownEditor } from "./markdown-editor";
import { SwitchField } from "./publish-switch";
import { submitOnModEnter, toastResult } from "./form-utils";

const formSchema = assignmentSchema.omit({ due_at: true }).extend({
  due_at_local: z.string().min(1, "Pick a due date"),
});
type FormValues = z.infer<typeof formSchema>;

export function AssignmentForm({
  initial,
  courses,
  lessons,
  defaultCourseId,
}: {
  initial: Assignment | null;
  courses: { id: string; title: string }[];
  lessons: { id: string; title: string; course_id: string }[];
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const { register, control, handleSubmit, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      course_id: initial?.course_id ?? defaultCourseId ?? courses[0]?.id ?? "",
      lesson_id: initial?.lesson_id ?? "",
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      due_at_local: isoToLocalInput(initial?.due_at),
      points: initial?.points ?? 100,
      submission_type: initial?.submission_type ?? "text",
      is_published: initial?.is_published ?? true,
    },
  });
  const { errors, isSubmitting } = formState;
  const courseId = useWatch({ control, name: "course_id" });
  const courseLessons = lessons.filter((l) => l.course_id === courseId);

  async function onSubmit({ due_at_local, ...values }: FormValues) {
    const res = await saveAssignment(initial?.id ?? null, { ...values, due_at: localInputToIso(due_at_local) });
    if (!toastResult(res, "Saved")) return;
    if (!initial && res.data) router.push(`/admin/assignments/${res.data.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={submitOnModEnter} className="grid gap-4" noValidate>
      <FormSection title="Assignment">
        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" autoFocus={!initial} aria-invalid={!!errors.title} {...register("title")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Course" htmlFor="course_id" error={errors.course_id?.message}>
            <NativeSelect id="course_id" {...register("course_id", { onChange: () => setValue("lesson_id", "") })}>
              <option value="">— Pick a course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Lesson (optional)" htmlFor="lesson_id">
            <NativeSelect id="lesson_id" disabled={!courseLessons.length} {...register("lesson_id")}>
              <option value="">{courseLessons.length ? "— None —" : "No lessons"}</option>
              {courseLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Due (IST)" htmlFor="due_at_local" error={errors.due_at_local?.message}>
            <Input id="due_at_local" type="datetime-local" className="font-mono" {...register("due_at_local")} />
          </Field>
          <Field label="Points" htmlFor="points" error={errors.points?.message}>
            <Input id="points" type="number" min={0} className="font-mono" {...register("points", { valueAsNumber: true })} />
          </Field>
          <Field label="Submission type" htmlFor="submission_type">
            <NativeSelect id="submission_type" {...register("submission_type")}>
              {SUBMISSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Instructions" error={errors.description?.message}>
          <Controller
            control={control}
            name="description"
            render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} onBlur={field.onBlur} rows={12} />}
          />
        </Field>
        <SwitchField
          control={control}
          name="is_published"
          label="Published"
          description="Enrolled students see published assignments (and are notified when it's created published)."
        />
      </FormSection>
      <FormFooter pending={isSubmitting} label={initial ? "Save assignment" : "Create assignment"} />
    </form>
  );
}
