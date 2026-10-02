"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { saveRoadmap } from "@/app/instructor/roadmaps/actions";
import { roadmapSchema, type RoadmapInput } from "@/services/instructor/schemas";
import { DIFFICULTIES, LEARNING_GOALS, slugify, titleCase } from "@/services/instructor/utils";
import { LABELS } from "@/lib/utils/format";
import type { Roadmap } from "@/types";
import { Field, FormSection } from "./field";
import { FormFooter } from "./form-footer";
import { MarkdownEditor } from "./markdown-editor";
import { SwitchField } from "./publish-switch";
import { submitOnModEnter, toastResult } from "./form-utils";

export function RoadmapForm({ initial }: { initial: Roadmap | null }) {
  const router = useRouter();
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const { register, control, handleSubmit, setValue, formState } = useForm<RoadmapInput>({
    resolver: zodResolver(roadmapSchema),
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      summary: initial?.summary ?? "",
      description: initial?.description ?? "",
      difficulty: initial?.difficulty ?? "beginner",
      estimated_weeks: initial?.estimated_weeks ?? 12,
      goal: initial?.goal ?? "",
      prerequisites: initial?.prerequisites.join(", ") ?? "",
      is_published: initial?.is_published ?? false,
    },
  });
  const { errors, isSubmitting } = formState;

  async function onSubmit(values: RoadmapInput) {
    const res = await saveRoadmap(initial?.id ?? null, values);
    if (!toastResult(res, "Saved")) return;
    if (!initial && res.data) router.push(`/instructor/roadmaps/${res.data.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={submitOnModEnter} className="grid gap-4" noValidate>
      <FormSection title="Roadmap">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input
              id="title"
              autoFocus={!initial}
              aria-invalid={!!errors.title}
              {...register("title", {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (!slugTouched) setValue("slug", slugify(e.target.value));
                },
              })}
            />
          </Field>
          <Field label="Slug" htmlFor="slug" error={errors.slug?.message}>
            <Input id="slug" className="font-mono" {...register("slug", { onChange: () => setSlugTouched(true) })} />
          </Field>
        </div>
        <Field label="Summary" htmlFor="summary" error={errors.summary?.message}>
          <Textarea id="summary" rows={2} {...register("summary")} />
        </Field>
        <Field label="Description">
          <Controller
            control={control}
            name="description"
            render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} onBlur={field.onBlur} rows={6} />}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Difficulty" htmlFor="difficulty">
            <NativeSelect id="difficulty" {...register("difficulty")}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {titleCase(d)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Est. weeks" htmlFor="estimated_weeks" error={errors.estimated_weeks?.message}>
            <Input id="estimated_weeks" type="number" min={1} className="font-mono" {...register("estimated_weeks", { valueAsNumber: true })} />
          </Field>
          <Field label="Learning goal" htmlFor="goal" hint="Recommended to students with this goal">
            <NativeSelect id="goal" {...register("goal")}>
              <option value="">— None —</option>
              {LEARNING_GOALS.map((g) => (
                <option key={g} value={g}>
                  {LABELS.learning_goal[g]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Prerequisites" htmlFor="prerequisites" hint="Comma separated, e.g. Basic HTML, Git" error={errors.prerequisites?.message}>
          <Input id="prerequisites" {...register("prerequisites")} />
        </Field>
        <SwitchField control={control} name="is_published" label="Published" description="Visible to students in the roadmap catalog." />
      </FormSection>
      <FormFooter pending={isSubmitting} label={initial ? "Save roadmap" : "Create roadmap"} />
    </form>
  );
}
