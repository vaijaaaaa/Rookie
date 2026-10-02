"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { saveProblem } from "@/app/instructor/problems/actions";
import { problemSchema, type ProblemInput } from "@/services/instructor/schemas";
import { CODE_LANGUAGES, PROBLEM_DIFFICULTIES, slugify, titleCase } from "@/services/instructor/utils";
import { cn } from "@/lib/utils";
import type { CodeLanguage, CodingProblem } from "@/types";
import { Field, FormSection } from "./field";
import { FormFooter } from "./form-footer";
import { MarkdownEditor } from "./markdown-editor";
import { SwitchField } from "./publish-switch";
import { submitOnModEnter, toastResult } from "./form-utils";

const LANG_LABEL: Record<CodeLanguage, string> = { java: "Java", javascript: "JavaScript", python: "Python" };

export function ProblemForm({ initial, topics }: { initial: CodingProblem | null; topics: string[] }) {
  const router = useRouter();
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [lang, setLang] = useState<CodeLanguage>("python");
  const { register, control, handleSubmit, setValue, formState } = useForm<ProblemInput>({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      difficulty: initial?.difficulty ?? "easy",
      topic: initial?.topic ?? "",
      tags: initial?.tags.join(", ") ?? "",
      description: initial?.description ?? "",
      input_format: initial?.input_format ?? "",
      output_format: initial?.output_format ?? "",
      constraints: initial?.constraints.join("\n") ?? "",
      examples: (initial?.examples ?? []).map((e) => ({ input: e.input, output: e.output, explanation: e.explanation ?? "" })),
      function_name: initial?.function_name ?? "",
      starter_java: initial?.starter_code.java ?? "",
      starter_javascript: initial?.starter_code.javascript ?? "",
      starter_python: initial?.starter_code.python ?? "",
      solution_explanation: initial?.solution_explanation ?? "",
      is_published: initial?.is_published ?? false,
    },
  });
  const { errors, isSubmitting } = formState;
  const examples = useFieldArray({ control, name: "examples" });

  async function onSubmit(values: ProblemInput) {
    const res = await saveProblem(initial?.id ?? null, values);
    if (!toastResult(res, "Saved")) return;
    if (!initial && res.data) router.push(`/instructor/problems/${res.data.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={submitOnModEnter} className="grid gap-4" noValidate>
      <FormSection title="Problem">
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Difficulty" htmlFor="difficulty">
            <NativeSelect id="difficulty" {...register("difficulty")}>
              {PROBLEM_DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {titleCase(d)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Topic" htmlFor="topic" error={errors.topic?.message}>
            <Input id="topic" list="problem-topics" placeholder="arrays" {...register("topic")} />
            <datalist id="problem-topics">
              {topics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Function name" htmlFor="function_name" error={errors.function_name?.message} hint="Tests call fn(...input)">
            <Input id="function_name" className="font-mono" placeholder="twoSum" {...register("function_name")} />
          </Field>
        </div>
        <Field label="Tags" htmlFor="tags" hint="Comma separated">
          <Input id="tags" placeholder="hash-map, two-pointers" {...register("tags")} />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <Controller
            control={control}
            name="description"
            render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} onBlur={field.onBlur} rows={10} />}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Input format" htmlFor="input_format">
            <Textarea id="input_format" rows={3} {...register("input_format")} />
          </Field>
          <Field label="Output format" htmlFor="output_format">
            <Textarea id="output_format" rows={3} {...register("output_format")} />
          </Field>
        </div>
        <Field label="Constraints" htmlFor="constraints" hint="One per line">
          <Textarea id="constraints" rows={3} className="font-mono text-xs" placeholder={"1 <= n <= 10^5\n-10^9 <= nums[i] <= 10^9"} {...register("constraints")} />
        </Field>
        <SwitchField control={control} name="is_published" label="Published" description="Visible on the practice page." />
      </FormSection>

      <FormSection
        title={`Examples · ${examples.fields.length}`}
        description="Shown in the problem statement."
        action={
          <Button type="button" size="sm" variant="outline" onClick={() => examples.append({ input: "", output: "", explanation: "" })}>
            <Plus /> Add
          </Button>
        }
      >
        {examples.fields.length === 0 ? <p className="text-sm text-muted-foreground">No examples yet.</p> : null}
        {examples.fields.map((f, i) => (
          <div key={f.id} className="grid gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Example {i + 1}</span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove example" onClick={() => examples.remove(i)}>
                <X />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Input" error={errors.examples?.[i]?.input?.message}>
                <Textarea rows={2} className="font-mono text-xs" {...register(`examples.${i}.input`)} />
              </Field>
              <Field label="Output" error={errors.examples?.[i]?.output?.message}>
                <Textarea rows={2} className="font-mono text-xs" {...register(`examples.${i}.output`)} />
              </Field>
            </div>
            <Field label="Explanation (optional)">
              <Textarea rows={2} {...register(`examples.${i}.explanation`)} />
            </Field>
          </div>
        ))}
      </FormSection>

      <FormSection title="Starter code" description="Leave a language empty to hide it.">
        <div className="inline-flex w-fit rounded-md border p-0.5" role="tablist">
          {CODE_LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={lang === l}
              onClick={() => setLang(l)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                lang === l && "bg-muted text-foreground",
              )}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
        {CODE_LANGUAGES.map((l) => (
          <Textarea
            key={l}
            rows={12}
            spellCheck={false}
            aria-label={`${LANG_LABEL[l]} starter code`}
            className={cn("font-mono text-xs leading-relaxed", lang !== l && "hidden")}
            {...register(`starter_${l}`)}
          />
        ))}
      </FormSection>

      <FormSection title="Solution explanation" description="Shown to students after they solve it.">
        <Controller
          control={control}
          name="solution_explanation"
          render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} onBlur={field.onBlur} rows={8} />}
        />
      </FormSection>

      <FormFooter pending={isSubmitting} label={initial ? "Save problem" : "Create problem"} />
    </form>
  );
}
