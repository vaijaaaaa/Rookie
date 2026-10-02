"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/instructor/field";
import { toastResult } from "@/components/instructor/form-utils";
import { MarkdownField } from "@/components/notes/markdown-field";
import { saveDailyQuestion } from "@/app/admin/daily/actions";

/** Post or edit a daily question. Paste the question into the body (markdown supported). */
export function DailyQuestionForm({
  initial,
  defaultDate,
}: {
  initial?: { id: string; question_date: string; title: string; body: string };
  defaultDate: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initial?.question_date ?? defaultDate);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const res = await saveDailyQuestion(initial?.id ?? null, { question_date: date, title, body });
      if (!toastResult(res, initial ? "Question updated" : "Question posted")) return;
      if (!initial) {
        setTitle("");
        setBody("");
      }
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }
      }}
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label="Date (IST)" htmlFor="dq-date">
          <Input id="dq-date" type="date" className="font-mono" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Title" htmlFor="dq-title">
          <Input
            id="dq-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            placeholder="Reverse a linked list in place"
          />
        </Field>
      </div>
      <Field label="Question" htmlFor="dq-body" hint="Paste the full question. Markdown and ``` code blocks are supported.">
        <MarkdownField id="dq-body" value={body} onChange={setBody} minHeight="min-h-64" placeholder="Paste the question here…" />
      </Field>
      <div className="flex items-center justify-end gap-2">
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">⌘/Ctrl + Enter</span>
        <Button type="submit" variant="brand" disabled={pending || !title.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {initial ? "Save changes" : "Post question"}
        </Button>
      </div>
    </form>
  );
}
