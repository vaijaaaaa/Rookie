"use client";

import { useState } from "react";
import { Eye, History, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatDate, timeAgo } from "@/lib/utils/format";
import type { SubmissionSummary } from "@/services/practice";
import { LANGUAGE_LABEL } from "./lib";
import { PanelTab } from "./panel-tab";

export type ProblemTab = "description" | "solution" | "submissions" | "notes";

function SubmissionsList({
  submissions,
  onLoad,
}: {
  submissions: SubmissionSummary[];
  onLoad: (s: SubmissionSummary) => void;
}) {
  if (submissions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No submissions yet"
        description="Submit your solution (Ctrl/⌘ + Shift + Enter) and it will show up here."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b bg-muted/30 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground sm:grid-cols-[1fr_auto_auto_auto]">
        <span>Verdict</span>
        <span>Language</span>
        <span className="hidden sm:block">Tests</span>
        <span className="text-right">Runtime</span>
      </div>
      <ul className="divide-y">
        {submissions.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onLoad(s)}
              title="Load this code into the editor"
              className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-x-4 px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/60 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <span className="min-w-0">
                <StatusBadge status={s.verdict} />
                <span
                  className="mt-1 block truncate text-xs text-muted-foreground"
                  title={formatDate(s.created_at, "MMM d, yyyy · h:mm a")}
                  suppressHydrationWarning
                >
                  {timeAgo(s.created_at)}
                </span>
              </span>
              <span className="font-mono text-xs">{LANGUAGE_LABEL[s.language]}</span>
              <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:block">
                {s.verdict === "pending" ? "—" : `${s.passed_count}/${s.total_count}`}
              </span>
              <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                {s.runtime_ms != null ? `${s.runtime_ms} ms` : "—"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProblemPanel({
  tab,
  onTabChange,
  description,
  solution,
  notes,
  submissions,
  onLoadSubmission,
  className,
}: {
  tab: ProblemTab;
  onTabChange: (t: ProblemTab) => void;
  description: React.ReactNode;
  solution: React.ReactNode | null;
  notes: React.ReactNode;
  submissions: SubmissionSummary[];
  onLoadSubmission: (s: SubmissionSummary) => void;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  const tabs: { value: ProblemTab; label: React.ReactNode }[] = [
    { value: "description", label: "Description" },
    { value: "solution", label: "Solution" },
    {
      value: "submissions",
      label: (
        <>
          Submissions
          {submissions.length > 0 ? (
            <span className="rounded bg-muted px-1 font-mono text-[10px] tabular-nums text-muted-foreground">
              {submissions.length}
            </span>
          ) : null}
        </>
      ),
    },
    { value: "notes", label: "Notes" },
  ];

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex shrink-0 items-center gap-4 overflow-x-auto border-b px-4" role="tablist" aria-label="Problem">
        {tabs.map((t) => (
          <PanelTab
            key={t.value}
            id={`problem-tab-${t.value}`}
            controls={`problem-panel-${t.value}`}
            active={tab === t.value}
            onSelect={() => onTabChange(t.value)}
          >
            {t.label}
          </PanelTab>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Panels stay mounted so scroll position and note drafts persist. */}
        <div
          id="problem-panel-description"
          role="tabpanel"
          aria-labelledby="problem-tab-description"
          className={cn("p-4 sm:p-5", tab !== "description" && "hidden")}
        >
          {description}
        </div>

        <div
          id="problem-panel-solution"
          role="tabpanel"
          aria-labelledby="problem-tab-solution"
          className={cn("p-4 sm:p-5", tab !== "solution" && "hidden")}
        >
          {!solution ? (
            <EmptyState icon={Lightbulb} title="No editorial yet" description="The author hasn't published a solution for this problem." />
          ) : revealed ? (
            solution
          ) : (
            <EmptyState
              icon={Lightbulb}
              title="Try it yourself first"
              description="Struggling productively is where the learning happens. Reveal the explanation when you're ready."
              action={
                <Button variant="outline" size="sm" onClick={() => setRevealed(true)}>
                  <Eye /> Reveal solution
                </Button>
              }
            />
          )}
        </div>

        <div
          id="problem-panel-submissions"
          role="tabpanel"
          aria-labelledby="problem-tab-submissions"
          className={cn("p-4 sm:p-5", tab !== "submissions" && "hidden")}
        >
          <SubmissionsList submissions={submissions} onLoad={onLoadSubmission} />
          {submissions.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Click a submission to load its code into the editor.</p>
          ) : null}
        </div>

        <div
          id="problem-panel-notes"
          role="tabpanel"
          aria-labelledby="problem-tab-notes"
          className={cn("p-4 sm:p-5", tab !== "notes" && "hidden")}
        >
          {notes}
        </div>
      </div>
    </div>
  );
}
