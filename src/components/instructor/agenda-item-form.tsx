"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { APP_TIME_ZONE, dateInTz } from "@/components/agenda/tz";
import { addCohortAgendaItem } from "@/app/admin/agendas/actions";
import { AGENDA_ITEM_TYPES, PRIORITIES } from "@/services/instructor/utils";
import type { AgendaItemType, Priority } from "@/types";
import { toastResult } from "./form-utils";

export interface AgendaFormOptions {
  courses: { id: string; title: string }[];
  lessons: { id: string; title: string; course_id: string }[];
  classes: { id: string; title: string; course_id: string | null; starts_at: string }[];
  assignments: { id: string; title: string; course_id: string }[];
  problems: { id: string; title: string }[];
}

const TYPE_LABEL: Record<AgendaItemType, string> = {
  task: "Task", class: "Class", assignment: "Assignment", problem: "Coding problem", study: "Study session", revision: "Revision",
};

export function AgendaItemForm({ options, defaultDate }: { options: AgendaFormOptions; defaultDate: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const empty = {
    course_id: options.courses[0]?.id ?? "",
    date: defaultDate,
    agenda_title: "",
    title: "",
    description: "",
    type: "task" as AgendaItemType,
    start_time: "",
    end_time: "",
    priority: "medium" as Priority,
    lesson_id: "",
    class_id: "",
    assignment_id: "",
    problem_id: "",
  };
  const [v, setV] = useState(empty);
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((prev) => ({ ...prev, [k]: value }));

  const lessons = useMemo(() => options.lessons.filter((l) => l.course_id === v.course_id), [options.lessons, v.course_id]);
  const classes = useMemo(
    () => options.classes.filter((c) => c.course_id === v.course_id && dateInTz(c.starts_at, APP_TIME_ZONE) === v.date),
    [options.classes, v.course_id, v.date],
  );
  const assignments = useMemo(() => options.assignments.filter((a) => a.course_id === v.course_id), [options.assignments, v.course_id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addCohortAgendaItem(v);
      if (toastResult(res, "Added to the cohort agenda")) {
        setV({ ...empty, course_id: v.course_id, date: v.date, agenda_title: v.agenda_title });
        router.refresh();
      }
    });
  }

  if (!options.courses.length) {
    return <p className="text-sm text-muted-foreground">You need a course before you can plan a cohort agenda.</p>;
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ag-course">Course</Label>
          <NativeSelect id="ag-course" value={v.course_id} onChange={(e) => setV({ ...v, course_id: e.target.value, lesson_id: "", class_id: "", assignment_id: "" })}>
            {options.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ag-date">Date</Label>
          <Input id="ag-date" type="date" value={v.date} onChange={(e) => set("date", e.target.value)} required />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ag-title">Item</Label>
        <Input id="ag-title" value={v.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} placeholder="Solve 3 array problems" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ag-desc">Description</Label>
        <Textarea id="ag-desc" rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="ag-type">Type</Label>
          <NativeSelect id="ag-type" value={v.type} onChange={(e) => set("type", e.target.value as AgendaItemType)}>
            {AGENDA_ITEM_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ag-prio">Priority</Label>
          <NativeSelect id="ag-prio" value={v.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
            {PRIORITIES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ag-start">Start</Label>
          <Input id="ag-start" type="time" value={v.start_time} onChange={(e) => set("start_time", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ag-end">End</Label>
          <Input id="ag-end" type="time" value={v.end_time} onChange={(e) => set("end_time", e.target.value)} />
        </div>
      </div>
      <details className="rounded-md border px-3 py-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Link to a lesson, class, assignment or problem</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <NativeSelect aria-label="Lesson" value={v.lesson_id} onChange={(e) => set("lesson_id", e.target.value)}>
            <option value="">No lesson</option>
            {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="Class" value={v.class_id} onChange={(e) => set("class_id", e.target.value)}>
            <option value="">{classes.length ? "No class" : "No classes that day"}</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="Assignment" value={v.assignment_id} onChange={(e) => set("assignment_id", e.target.value)}>
            <option value="">No assignment</option>
            {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="Coding problem" value={v.problem_id} onChange={(e) => set("problem_id", e.target.value)}>
            <option value="">No problem</option>
            {options.problems.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </NativeSelect>
        </div>
      </details>
      <Button type="submit" variant="brand" disabled={pending} className="justify-self-start">
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add item
      </Button>
    </form>
  );
}
