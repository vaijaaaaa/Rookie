"use client";

import { useId, useState, useTransition } from "react";
import { AlertTriangle, ExternalLink, Loader2, Pencil, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ActionResult, AssignmentSubmission, SubmissionType } from "@/types";

type Action<T = unknown> = (formData: FormData) => Promise<ActionResult<T>>;

export interface SubmissionPanelProps {
  assignmentId: string;
  submissionType: SubmissionType;
  /** Only in_progress / submitted submissions — reviewed ones are rendered read-only by the page. */
  submission: Pick<AssignmentSubmission, "status" | "content" | "url" | "submitted_at"> | null;
  overdue: boolean;
  saveAction: Action;
  unsubmitAction: Action;
  /** Pre-formatted (server) submitted-at label, e.g. "Oct 2, 2026 · 4:12 PM". */
  submittedAtLabel?: string | null;
  submittedLate?: boolean;
}

export function SubmissionPanel({
  assignmentId,
  submissionType,
  submission,
  overdue,
  saveAction,
  unsubmitAction,
  submittedAtLabel,
  submittedLate,
}: SubmissionPanelProps) {
  const ids = useId();
  const [content, setContent] = useState(submission?.content ?? "");
  const [url, setUrl] = useState(submission?.url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<"draft" | "submit" | "unsubmit" | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitted = submission?.status === "submitted";
  const dirty = (submission?.content ?? "") !== content || (submission?.url ?? "") !== url;

  function run(intent: "draft" | "submit" | "unsubmit") {
    const fd = new FormData();
    fd.set("assignmentId", assignmentId);
    if (intent !== "unsubmit") {
      fd.set("intent", intent);
      fd.set("content", content);
      fd.set("url", url);
    }
    setError(null);
    setPendingIntent(intent);
    startTransition(async () => {
      const res = await (intent === "unsubmit" ? unsubmitAction(fd) : saveAction(fd));
      setPendingIntent(null);
      if (res.ok) {
        toast.success(res.message ?? "Saved");
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  const spinner = (i: typeof pendingIntent) =>
    isPending && pendingIntent === i ? <Loader2 className="animate-spin" aria-hidden /> : null;

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Submitted</span>
          {submittedAtLabel ? (
            <span className="font-mono text-xs text-muted-foreground">{submittedAtLabel}</span>
          ) : null}
          {submittedLate ? (
            <span className="inline-flex items-center gap-1 text-xs text-warning">
              <AlertTriangle className="size-3" aria-hidden /> after the deadline
            </span>
          ) : null}
        </div>
        <SubmittedContent type={submissionType} content={submission.content} url={submission.url} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => run("unsubmit")} disabled={isPending}>
            {spinner("unsubmit") ?? <Pencil aria-hidden />}
            Unsubmit &amp; edit
          </Button>
          <p className="text-xs text-muted-foreground">You can edit until your instructor reviews it.</p>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const contentId = `${ids}-content`;
  const urlId = `${ids}-url`;
  const errorId = `${ids}-error`;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run("submit");
      }}
      aria-describedby={error ? errorId : undefined}
    >
      {submissionType === "url" ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={urlId}>Link to your work</Label>
            <Input
              id={urlId}
              type="url"
              inputMode="url"
              placeholder="https://github.com/you/project"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-invalid={!!error || undefined}
              autoComplete="url"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={contentId}>
              Notes for your reviewer <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id={contentId}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Anything the reviewer should know…"
            />
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={contentId}>{submissionType === "code" ? "Your code" : "Your answer"}</Label>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground" aria-live="off">
              {content.length.toLocaleString()} chars
            </span>
          </div>
          <Textarea
            id={contentId}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={submissionType === "code" ? 18 : 12}
            spellCheck={submissionType !== "code"}
            aria-invalid={!!error || undefined}
            placeholder={submissionType === "code" ? "// paste or write your solution here" : "Write your answer (Markdown supported)…"}
            className={cn(submissionType === "code" && "font-mono text-[13px] leading-relaxed [tab-size:2]")}
            onKeyDown={
              submissionType === "code"
                ? (e) => {
                    if (e.key !== "Tab" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
                    e.preventDefault();
                    const el = e.currentTarget;
                    const { selectionStart: s, selectionEnd: end } = el;
                    const next = content.slice(0, s) + "  " + content.slice(end);
                    setContent(next);
                    requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
                  }
                : undefined
            }
          />
          {submissionType === "code" ? (
            <p className="text-[11px] text-muted-foreground">Tab inserts two spaces · Esc then Tab to leave the editor.</p>
          ) : null}
        </div>
      )}

      {overdue ? (
        <p className="flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle className="size-3.5" aria-hidden />
          The deadline has passed — you can still submit, but it will be marked late.
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="brand" disabled={isPending}>
          {spinner("submit") ?? <Send aria-hidden />}
          Submit
        </Button>
        <Button type="button" variant="outline" onClick={() => run("draft")} disabled={isPending || !dirty}>
          {spinner("draft") ?? <Save aria-hidden />}
          Save draft
        </Button>
        <span className="font-mono text-[11px] text-muted-foreground">
          {dirty ? "Unsaved changes" : submission ? "Draft saved" : "Not started"}
        </span>
      </div>
    </form>
  );
}

function SubmittedContent({ type, content, url }: { type: SubmissionType; content: string; url: string | null }) {
  return (
    <div className="space-y-3">
      {type === "url" && url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 break-all font-mono text-sm text-brand hover:underline"
        >
          {url}
          <ExternalLink className="size-3 shrink-0" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : null}
      {content ? (
        <pre
          className={cn(
            "max-h-96 overflow-auto rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap",
            type === "code" ? "font-mono text-[13px]" : "font-sans",
          )}
        >
          {content}
        </pre>
      ) : null}
    </div>
  );
}

export { SubmittedContent };
