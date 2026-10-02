"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownField } from "@/components/notes/markdown-field";
import { LocalTime } from "@/components/instructor/local-time";
import { toastResult } from "@/components/instructor/form-utils";
import { deleteDailyAnswer, saveDailyAnswer } from "@/app/(app)/(protected)/daily/actions";

/** Write / edit your answer to a daily question, notes-style (markdown + preview). */
export function AnswerEditor({
  questionId,
  initialContent,
  initialUpdatedAt,
}: {
  questionId: string;
  initialContent: string;
  initialUpdatedAt: string | null;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(initialContent);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const dirty = content !== saved;
  const empty = !content.trim();

  function save() {
    if (saving || empty || !dirty) return;
    startSave(async () => {
      const res = await saveDailyAnswer(questionId, content);
      if (toastResult(res, "Answer saved")) {
        setSaved(content);
        setUpdatedAt(res.data?.updatedAt ?? new Date().toISOString());
        router.refresh();
      }
    });
  }

  function remove() {
    startDelete(async () => {
      const res = await deleteDailyAnswer(questionId);
      if (toastResult(res, "Answer deleted")) {
        setContent("");
        setSaved("");
        setUpdatedAt(null);
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-3"
    >
      <MarkdownField
        id="daily-answer"
        value={content}
        onChange={setContent}
        placeholder="Write your answer — explain your reasoning, paste code in ``` blocks…"
        minHeight="min-h-56"
        aria-label="Your answer"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          }
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] text-muted-foreground">
          {dirty ? (
            "Unsaved changes · ⌘/Ctrl + Enter to save"
          ) : updatedAt ? (
            <span className="inline-flex items-center gap-1">
              <Check className="size-3 text-success" /> Saved <LocalTime value={updatedAt} format="relative" />
            </span>
          ) : (
            "Not answered yet"
          )}
        </p>
        <div className="flex gap-2">
          {saved ? (
            <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={deleting || saving}>
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
            </Button>
          ) : null}
          <Button type="submit" variant="brand" size="sm" disabled={saving || empty || !dirty}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saved ? "Update answer" : "Save answer"}
          </Button>
        </div>
      </div>
    </form>
  );
}
