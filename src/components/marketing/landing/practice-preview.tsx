import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProblemDifficulty } from "@/types";
import { LandingSection, SectionHeading } from "./section-heading";

const FEATURES = [
  "Write solutions in Java, Python or JavaScript in the browser",
  "Run against sample tests, submit against hidden ones",
  "Problems grouped by topic so practice follows your roadmap",
  "Every accepted solution counts toward your streak",
];

const DIFF: { key: ProblemDifficulty; label: string; className: string }[] = [
  { key: "easy", label: "easy", className: "bg-success" },
  { key: "medium", label: "medium", className: "bg-warning" },
  { key: "hard", label: "hard", className: "bg-destructive" },
];

export function PracticePreview({
  total,
  byDifficulty,
}: {
  total: number;
  byDifficulty: Record<ProblemDifficulty, number>;
}) {
  return (
    <LandingSection labelledBy="practice-title">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading
            id="practice-title"
            eyebrow="Coding practice"
            title="Theory, then reps."
            description="Every topic comes with problems to cement it. Solve them in an in-browser editor with real test cases."
            className="mb-6"
          />
          <ul className="space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/login">
              Start practicing <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Problem set</p>
            <p className="font-mono text-[11px] text-muted-foreground">published</p>
          </div>
          <div className="p-5">
            <p className="text-5xl font-semibold tracking-tight tabular-nums">{total}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {total === 0
                ? "The problem set is being written — new problems land here as soon as they're published."
                : `coding problem${total === 1 ? "" : "s"} ready to solve, with sample and hidden tests.`}
            </p>
            {total > 0 ? (
              <>
                <div className="mt-6 flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                  {DIFF.map((d) =>
                    byDifficulty[d.key] > 0 ? (
                      <div
                        key={d.key}
                        className={cn("h-full", d.className)}
                        style={{ width: `${(byDifficulty[d.key] / total) * 100}%` }}
                      />
                    ) : null,
                  )}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 font-mono text-xs">
                  {DIFF.map((d) => (
                    <div key={d.key} className="rounded-md border px-3 py-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground">
                        <span className={cn("size-1.5 rounded-full", d.className)} aria-hidden />
                        {d.label}
                      </dt>
                      <dd className="mt-1 text-base tabular-nums text-foreground">{byDifficulty[d.key]}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
