"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { saveAgendaItem } from "@/app/(app)/(protected)/agenda/actions";
import type { AgendaEntry } from "@/services/agenda";
import { AGENDA_TYPE_META, PERSONAL_AGENDA_TYPES, PRIORITY_META } from "./type-meta";
import { formatISODate } from "./tz";

export type AgendaFormOptions = {
  courses: { id: string; title: string }[];
  lessons: { id: string; title: string; course_id: string }[];
};

const formSchema = z
  .object({
    title: z.string().trim().min(1, "Give it a title").max(200, "Keep it under 200 characters"),
    description: z.string().max(2000, "Keep it under 2000 characters"),
    type: z.enum(PERSONAL_AGENDA_TYPES),
    priority: z.enum(["low", "medium", "high"]),
    start_time: z.string(),
    end_time: z.string(),
    course_id: z.string(),
    lesson_id: z.string(),
  })
  .refine((v) => !v.start_time || !v.end_time || v.end_time >= v.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  })
  .refine((v) => !v.end_time || !!v.start_time, {
    message: "Set a start time too",
    path: ["start_time"],
  });

type FormValues = z.infer<typeof formSchema>;

export function AgendaItemDialog({
  open,
  onOpenChange,
  date,
  options,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  options: AgendaFormOptions;
  /** When set, edits this personal item. */
  item?: AgendaEntry | null;
}) {
  const router = useRouter();
  const defaults = React.useMemo<FormValues>(
    () => ({
      title: item?.title ?? "",
      description: item?.description ?? "",
      type: item && (PERSONAL_AGENDA_TYPES as readonly string[]).includes(item.type) ? (item.type as FormValues["type"]) : "task",
      priority: item?.priority ?? "medium",
      start_time: item?.raw?.start_time?.slice(0, 5) ?? "",
      end_time: item?.raw?.end_time?.slice(0, 5) ?? "",
      course_id: item?.raw?.course_id ?? "",
      lesson_id: item?.raw?.lesson_id ?? "",
    }),
    [item],
  );

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });
  const { register, handleSubmit, formState, reset, setValue, control } = form;
  const errors = formState.errors;

  React.useEffect(() => {
    if (open) reset(defaults);
  }, [open, defaults, reset]);

  const courseId = useWatch({ control, name: "course_id" });
  const lessons = React.useMemo(
    () => (courseId ? options.lessons.filter((l) => l.course_id === courseId) : []),
    [courseId, options.lessons],
  );

  async function onSubmit(values: FormValues) {
    const res = await saveAgendaItem({ ...values, date }, item?.itemId ?? undefined);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Saved");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "Add to your agenda"}</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{formatISODate(date, { weekday: "long", month: "long", day: "numeric" })}</span>
            {" · "}Personal items are only visible to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <Field label="Title" htmlFor="agenda-title" error={errors.title?.message}>
            <Input
              id="agenda-title"
              placeholder="e.g. Revise recursion basics"
              autoFocus
              aria-invalid={!!errors.title}
              {...register("title")}
            />
          </Field>

          <Field label="Description" htmlFor="agenda-desc" error={errors.description?.message} optional>
            <Textarea id="agenda-desc" rows={2} placeholder="What does done look like?" {...register("description")} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" htmlFor="agenda-type">
              <NativeSelect id="agenda-type" {...register("type")}>
                {PERSONAL_AGENDA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {AGENDA_TYPE_META[t].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Priority" htmlFor="agenda-priority">
              <NativeSelect id="agenda-priority" {...register("priority")}>
                {(["low", "medium", "high"] as const).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Start" htmlFor="agenda-start" error={errors.start_time?.message} optional>
              <Input id="agenda-start" type="time" className="font-mono" aria-invalid={!!errors.start_time} {...register("start_time")} />
            </Field>
            <Field label="End" htmlFor="agenda-end" error={errors.end_time?.message} optional>
              <Input id="agenda-end" type="time" className="font-mono" aria-invalid={!!errors.end_time} {...register("end_time")} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Course" htmlFor="agenda-course" optional>
              <NativeSelect
                id="agenda-course"
                {...register("course_id", { onChange: () => setValue("lesson_id", "") })}
                disabled={options.courses.length === 0}
              >
                <option value="">{options.courses.length ? "None" : "No enrolled courses"}</option>
                {options.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Lesson" htmlFor="agenda-lesson" optional>
              <NativeSelect id="agenda-lesson" {...register("lesson_id")} disabled={!courseId || lessons.length === 0}>
                <option value="">{courseId ? "None" : "Pick a course first"}</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Saving…" : item ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
        {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
