import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LessonStatusIcon } from "@/components/lesson/lesson-status-icon";
import { cn } from "@/lib/utils";
import type { OutlineModule, ProgressMap } from "@/services/courses";

/** Modules → lessons with completion state, durations and links. */
export function CourseCurriculum({
  courseSlug,
  modules,
  progress,
  nextLessonId,
}: {
  courseSlug: string;
  modules: OutlineModule[];
  progress: ProgressMap;
  nextLessonId: string | null;
}) {
  // Global lesson numbering across modules.
  const offsets = modules.map((_, i) => modules.slice(0, i).reduce((n, m) => n + m.lessons.length, 0));
  return (
    <ol className="space-y-4">
      {modules.map((m, mi) => {
        const done = m.lessons.filter((l) => progress[l.id] === "completed").length;
        const minutes = m.lessons.reduce((sum, l) => sum + l.estimated_minutes, 0);
        return (
          <li key={m.id} className="overflow-hidden rounded-lg border bg-card">
            <div className="flex items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Module {String(mi + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-0.5 font-semibold tracking-tight">{m.title}</h3>
                {m.description ? <p className="mt-1 text-sm text-muted-foreground">{m.description}</p> : null}
              </div>
              <div className="shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                <p>
                  {done}/{m.lessons.length}
                </p>
                <p>{minutes} min</p>
              </div>
            </div>
            {m.lessons.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No lessons published yet.</p>
            ) : (
              <ol className="divide-y">
                {m.lessons.map((l, li) => {
                  const index = offsets[mi]! + li + 1;
                  const isNext = l.id === nextLessonId;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/courses/${courseSlug}/lessons/${l.slug}`}
                        className={cn(
                          "group flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent/40",
                          isNext && "bg-brand/5",
                        )}
                      >
                        <LessonStatusIcon status={progress[l.id]} />
                        <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {String(index).padStart(2, "0")}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate group-hover:text-foreground",
                            progress[l.id] === "completed" ? "text-muted-foreground" : "text-foreground/90",
                          )}
                        >
                          {l.title}
                        </span>
                        {isNext ? (
                          <span className="hidden items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-brand sm:inline-flex">
                            Up next <ArrowRight className="size-3" />
                          </span>
                        ) : null}
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {l.estimated_minutes}m
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );
}
