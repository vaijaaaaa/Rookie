"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Layers, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  createLesson, createModule, deleteLesson, deleteModule, moveLesson, moveModule, updateModule,
} from "@/app/instructor/courses/actions";
import { moduleSchema, newLessonSchema, type ModuleInput, type NewLessonInput } from "@/services/instructor/schemas";
import { slugify } from "@/services/instructor/utils";
import { Field } from "./field";
import { FormFooter } from "./form-footer";
import { ConfirmAction } from "./confirm-action";
import { MoveButtons } from "./move-buttons";
import { submitOnModEnter, toastResult } from "./form-utils";

interface LessonRow {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  estimated_minutes: number;
}
interface ModuleRow {
  id: string;
  title: string;
  description: string;
  lessons: LessonRow[];
}

function ModuleDialog({ courseId, initial, trigger }: { courseId: string; initial?: ModuleRow; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState, reset } = useForm<ModuleInput>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: initial?.title ?? "", description: initial?.description ?? "" },
  });
  async function onSubmit(values: ModuleInput) {
    const res = initial ? await updateModule(initial.id, values) : await createModule(courseId, values);
    if (toastResult(res, initial ? "Module saved" : "Module added")) {
      setOpen(false);
      if (!initial) reset();
      router.refresh();
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit module" : "New module"}</DialogTitle>
          <DialogDescription>Modules group lessons into chapters.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={submitOnModEnter} className="grid gap-4" noValidate>
          <Field label="Title" htmlFor="module-title" error={formState.errors.title?.message}>
            <Input id="module-title" autoFocus {...register("title")} />
          </Field>
          <Field label="Description" htmlFor="module-description" error={formState.errors.description?.message}>
            <Textarea id="module-description" rows={3} {...register("description")} />
          </Field>
          <FormFooter pending={formState.isSubmitting} label={initial ? "Save" : "Add module"} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewLessonDialog({ moduleId }: { moduleId: string }) {
  const [open, setOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState, setValue } = useForm<NewLessonInput>({
    resolver: zodResolver(newLessonSchema),
    defaultValues: { title: "", slug: "" },
  });
  async function onSubmit(values: NewLessonInput) {
    const res = await createLesson(moduleId, values);
    if (toastResult(res, "Lesson created") && res.data) {
      setOpen(false);
      router.push(`/instructor/courses/${res.data.courseId}/lessons/${res.data.id}`);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus /> Lesson
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lesson</DialogTitle>
          <DialogDescription>Created as a draft — you&apos;ll write the content next.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={submitOnModEnter} className="grid gap-4" noValidate>
          <Field label="Title" htmlFor="lesson-title" error={formState.errors.title?.message}>
            <Input
              id="lesson-title"
              autoFocus
              {...register("title", {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (!slugTouched) setValue("slug", slugify(e.target.value));
                },
              })}
            />
          </Field>
          <Field label="Slug" htmlFor="lesson-slug" error={formState.errors.slug?.message} hint="Unique within the course">
            <Input id="lesson-slug" className="font-mono" {...register("slug", { onChange: () => setSlugTouched(true) })} />
          </Field>
          <FormFooter pending={formState.isSubmitting} label="Create lesson" pendingLabel="Creating…" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CurriculumEditor({ courseId, modules }: { courseId: string; modules: ModuleRow[] }) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Curriculum · {modules.length} module{modules.length === 1 ? "" : "s"} ·{" "}
          {modules.reduce((n, m) => n + m.lessons.length, 0)} lessons
        </h2>
        <ModuleDialog
          courseId={courseId}
          trigger={
            <Button size="sm" variant="outline">
              <Plus /> Module
            </Button>
          }
        />
      </header>
      <div className="grid gap-3 p-4">
        {modules.length === 0 ? (
          <EmptyState icon={Layers} title="No modules yet" description="Add a module, then lessons inside it." />
        ) : (
          modules.map((m, mi) => (
            <div key={m.id} className="rounded-md border">
              <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{String(mi + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  {m.description ? <p className="truncate text-xs text-muted-foreground">{m.description}</p> : null}
                </div>
                <MoveButtons action={moveModule.bind(null, m.id)} isFirst={mi === 0} isLast={mi === modules.length - 1} label="module" />
                <ModuleDialog
                  courseId={courseId}
                  initial={m}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Edit module">
                      <Pencil />
                    </Button>
                  }
                />
                <ConfirmAction
                  action={deleteModule.bind(null, m.id)}
                  title={`Delete module "${m.title}"?`}
                  description={`Its ${m.lessons.length} lesson(s) and all student progress on them are deleted.`}
                  successMessage="Module deleted"
                />
              </div>
              <ul className="divide-y">
                {m.lessons.map((l, li) => (
                  <li key={l.id} className="flex items-center gap-2 px-3 py-1.5">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <Link href={`/instructor/courses/${courseId}/lessons/${l.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                      {l.title}
                    </Link>
                    {!l.is_published ? <Badge variant="outline">Draft</Badge> : null}
                    <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{l.estimated_minutes}m</span>
                    <MoveButtons action={moveLesson.bind(null, l.id)} isFirst={li === 0} isLast={li === m.lessons.length - 1} label="lesson" />
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Edit lesson">
                      <Link href={`/instructor/courses/${courseId}/lessons/${l.id}`}>
                        <Pencil />
                      </Link>
                    </Button>
                    <ConfirmAction
                      action={deleteLesson.bind(null, l.id)}
                      title={`Delete lesson "${l.title}"?`}
                      description="Student progress on this lesson is deleted too."
                      successMessage="Lesson deleted"
                    />
                  </li>
                ))}
                <li className="px-1.5 py-1">
                  <NewLessonDialog moduleId={m.id} />
                </li>
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
