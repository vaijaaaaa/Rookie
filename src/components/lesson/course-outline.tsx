import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OutlineModule, ProgressMap } from "@/services/courses";
import { LessonStatusIcon } from "./lesson-status-icon";

/**
 * Course → modules → lessons tree for the lesson reader. Modules are native
 * <details> (collapsible without JS); the module holding the current lesson
 * starts open.
 */
export function CourseOutline({
  courseSlug,
  modules,
  progress,
  currentLessonId,
}: {
  courseSlug: string;
  modules: OutlineModule[];
  progress: ProgressMap;
  currentLessonId: string;
}) {
  return (
    <nav aria-label="Course contents" className="space-y-1">
      {modules.map((m, mi) => {
        const containsCurrent = m.lessons.some((l) => l.id === currentLessonId);
        const done = m.lessons.filter((l) => progress[l.id] === "completed").length;
        return (
          <details key={m.id} open={containsCurrent || undefined} className="group/module">
            <summary className="flex cursor-pointer list-none items-start gap-2 rounded-md px-2 py-1.5 text-left select-none hover:bg-accent/50 [&::-webkit-details-marker]:hidden">
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-open/module:rotate-90" />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Module {mi + 1}
                </span>
                <span className="block text-[13px] font-medium leading-snug">{m.title}</span>
              </span>
              <span className="mt-0.5 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                {done}/{m.lessons.length}
              </span>
            </summary>
            <ol className="mt-0.5 mb-2 ml-[15px] space-y-px border-l pl-2">
              {m.lessons.map((l) => {
                const current = l.id === currentLessonId;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/courses/${courseSlug}/lessons/${l.slug}`}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "relative flex items-start gap-2 rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors",
                        current
                          ? "bg-brand/10 font-medium text-foreground before:absolute before:top-1.5 before:bottom-1.5 before:-left-[9px] before:w-0.5 before:rounded-full before:bg-brand"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <LessonStatusIcon status={progress[l.id]} className="mt-px size-3.5" />
                      <span className="min-w-0 flex-1">{l.title}</span>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                        {l.estimated_minutes}m
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </details>
        );
      })}
    </nav>
  );
}
