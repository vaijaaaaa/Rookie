"use client";

import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { saveClass } from "@/app/admin/classes/actions";
import { classSchema } from "@/services/instructor/schemas";
import { isoToLocalInput, localInputToIso } from "@/services/instructor/time";
import { CLASS_STATUSES, titleCase } from "@/services/instructor/utils";
import type { ClassSession } from "@/types";
import { Field, FormSection } from "./field";
import { FormFooter } from "./form-footer";
import { MarkdownEditor } from "./markdown-editor";
import { submitOnModEnter, toastResult } from "./form-utils";

const formSchema = classSchema.omit({ starts_at: true }).extend({
  starts_at_local: z.string().min(1, "Pick a date and time"),
});
type FormValues = z.infer<typeof formSchema>;

export function ClassForm({
  initial,
  courses,
  modules,
  staff,
  isAdmin,
  defaultCourseId,
}: {
  initial: ClassSession | null;
  courses: { id: string; title: string }[];
  modules: { id: string; title: string; course_id: string }[];
  staff: { id: string; full_name: string; email: string | null }[];
  isAdmin: boolean;
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      agenda: initial?.agenda ?? "",
      course_id: initial?.course_id ?? defaultCourseId ?? "",
      module_id: initial?.module_id ?? "",
      instructor_id: initial?.instructor_id ?? "",
      starts_at_local: isoToLocalInput(initial?.starts_at),
      duration_minutes: initial?.duration_minutes ?? 60,
      meeting_url: initial?.meeting_url ?? "",
      recording_url: initial?.recording_url ?? "",
      resources: initial?.resources ?? [],
      status: initial?.status ?? "scheduled",
    },
  });
  const { register, control, handleSubmit, formState, setValue } = form;
  const { errors, isSubmitting } = formState;
  const resources = useFieldArray({ control, name: "resources" });
  const courseId = useWatch({ control, name: "course_id" });
  const courseModules = modules.filter((m) => m.course_id === courseId);

  async function onSubmit({ starts_at_local, ...values }: FormValues) {
    const res = await saveClass(initial?.id ?? null, { ...values, starts_at: localInputToIso(starts_at_local) });
    if (!toastResult(res, initial ? "Class updated" : "Class scheduled")) return;
    if (!initial && res.data) router.push(`/admin/classes/${res.data.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={submitOnModEnter} className="grid gap-4" noValidate>
      <FormSection title="Details">
        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" autoFocus={!initial} {...register("title")} aria-invalid={!!errors.title} />
        </Field>
        <Field label="Description" htmlFor="description" error={errors.description?.message}>
          <Textarea id="description" rows={3} {...register("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Course" htmlFor="course_id" hint="No course = open session for every student">
            <NativeSelect
              id="course_id"
              {...register("course_id", {
                onChange: () => setValue("module_id", ""),
              })}
            >
              <option value="">— Open session —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Module" htmlFor="module_id">
            <NativeSelect id="module_id" disabled={!courseModules.length} {...register("module_id")}>
              <option value="">{courseModules.length ? "— None —" : "No modules"}</option>
              {courseModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </NativeSelect>
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
      </FormSection>

      <FormSection title="Schedule">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Starts at (IST)" htmlFor="starts_at_local" error={errors.starts_at_local?.message}>
            <Input id="starts_at_local" type="datetime-local" className="font-mono" {...register("starts_at_local")} />
          </Field>
          <Field label="Duration (min)" htmlFor="duration_minutes" error={errors.duration_minutes?.message}>
            <Input
              id="duration_minutes"
              type="number"
              min={5}
              step={5}
              className="font-mono"
              {...register("duration_minutes", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Status" htmlFor="status">
            <NativeSelect id="status" {...register("status")}>
              {CLASS_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meeting URL" htmlFor="meeting_url" error={errors.meeting_url?.message}>
            <Input id="meeting_url" type="url" placeholder="https://meet…" {...register("meeting_url")} />
          </Field>
          <Field label="Recording URL" htmlFor="recording_url" error={errors.recording_url?.message}>
            <Input id="recording_url" type="url" placeholder="https://…" {...register("recording_url")} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Agenda" description="Shown to students on the class page.">
        <Controller
          control={control}
          name="agenda"
          render={({ field }) => (
            <MarkdownEditor value={field.value} onChange={field.onChange} onBlur={field.onBlur} rows={8} placeholder="## Plan…" />
          )}
        />
      </FormSection>

      <FormSection
        title="Resources"
        action={
          <Button type="button" size="sm" variant="outline" onClick={() => resources.append({ title: "", url: "" })}>
            <Plus /> Add
          </Button>
        }
      >
        {resources.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resources. Add slides, repos or reading links.</p>
        ) : (
          <ul className="grid gap-2">
            {resources.fields.map((f, i) => (
              <li key={f.id} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <div>
                  <Input placeholder="Title" aria-label="Resource title" {...register(`resources.${i}.title`)} />
                  {errors.resources?.[i]?.title ? (
                    <p className="mt-1 text-xs text-destructive">{errors.resources[i]?.title?.message}</p>
                  ) : null}
                </div>
                <div>
                  <Input placeholder="https://…" aria-label="Resource URL" className="font-mono text-xs" {...register(`resources.${i}.url`)} />
                  {errors.resources?.[i]?.url ? (
                    <p className="mt-1 text-xs text-destructive">{errors.resources[i]?.url?.message}</p>
                  ) : null}
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove resource" onClick={() => resources.remove(i)}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <FormFooter pending={isSubmitting} label={initial ? "Save changes" : "Schedule class"} />
    </form>
  );
}
