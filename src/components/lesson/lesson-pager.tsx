import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { OutlineLesson } from "@/services/courses";

/** Previous / next lesson navigation. */
export function LessonPager({
  courseSlug,
  prev,
  next,
}: {
  courseSlug: string;
  prev: OutlineLesson | null;
  next: OutlineLesson | null;
}) {
  return (
    <nav aria-label="Lesson navigation" className="grid gap-3 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/courses/${courseSlug}/lessons/${prev.slug}`}
          className="group flex flex-col rounded-lg border bg-card px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-accent/30"
        >
          <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" /> Previous
          </span>
          <span className="mt-1 truncate text-sm font-medium">{prev.title}</span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
      {next ? (
        <Link
          href={`/courses/${courseSlug}/lessons/${next.slug}`}
          className="group flex flex-col items-end rounded-lg border bg-card px-4 py-3 text-right transition-colors hover:border-brand/40 hover:bg-accent/30"
        >
          <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Next <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1 max-w-full truncate text-sm font-medium group-hover:text-brand">{next.title}</span>
        </Link>
      ) : (
        <Link
          href={`/courses/${courseSlug}`}
          className="group flex flex-col items-end rounded-lg border border-dashed px-4 py-3 text-right transition-colors hover:bg-accent/30"
        >
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">End of course</span>
          <span className="mt-1 text-sm font-medium">Back to course overview</span>
        </Link>
      )}
    </nav>
  );
}
