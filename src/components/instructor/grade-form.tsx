"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { gradeSubmission } from "@/app/admin/assignments/actions";
import { gradeSchema } from "@/services/instructor/schemas";
import { Field } from "./field";
import { FormFooter } from "./form-footer";
import { submitOnModEnter, toastResult } from "./form-utils";

export function GradeForm({
  submissionId,
  points,
  grade,
  feedback,
  reviewed,
}: {
  submissionId: string;
  points: number;
  grade: number | null;
  feedback: string | null;
  reviewed: boolean;
}) {
  const router = useRouter();
  const schema = gradeSchema.extend({
    grade: gradeSchema.shape.grade.max(points, `At most ${points} points`),
  });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { grade: grade ?? undefined, feedback: feedback ?? "" },
  });

  async function onSubmit(values: Values) {
    const res = await gradeSubmission(submissionId, values);
    if (toastResult(res, "Graded")) router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={submitOnModEnter} className="grid gap-3" noValidate>
      <Field label={`Grade (0–${points})`} htmlFor="grade" error={formState.errors.grade?.message}>
        <div className="flex items-center gap-2">
          <Input
            id="grade"
            type="number"
            min={0}
            max={points}
            className="w-28 font-mono"
            aria-invalid={!!formState.errors.grade}
            {...register("grade", { valueAsNumber: true })}
          />
          <span className="font-mono text-sm text-muted-foreground">/ {points}</span>
        </div>
      </Field>
      <Field label="Feedback" htmlFor="feedback" error={formState.errors.feedback?.message}>
        <Textarea id="feedback" rows={5} placeholder="What went well, what to improve…" {...register("feedback")} />
      </Field>
      <FormFooter pending={formState.isSubmitting} label={reviewed ? "Update grade" : "Submit review"} />
    </form>
  );
}
