import Link from "next/link";
import { CheckCircle2, Clock, FileText, User } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { CatalogCourse } from "@/services/courses";
import { formatCategory } from "./catalog-filters";
import { CourseIcon } from "./course-icon";

export function CourseCard({ course, signedIn }: { course: CatalogCourse; signedIn: boolean }) {
  const done = signedIn && course.lessonCount > 0 && course.completedLessons >= course.lessonCount;
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      <div className="flex items-start gap-3">
        <CourseIcon icon={course.icon} />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{formatCategory(course.category)}</p>
          <h3 className="mt-0.5 truncate font-semibold tracking-tight group-hover:text-brand">{course.title}</h3>
        </div>
        {done ? (
          <Badge variant="success">
            <CheckCircle2 /> Done
          </Badge>
        ) : course.enrolled ? (
          <Badge variant="outline" className="border-brand/40 text-brand">
            Enrolled
          </Badge>
        ) : null}
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{course.summary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <DifficultyBadge value={course.difficulty} />
        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
          <FileText className="size-3" />
          {course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}
        </span>
        {course.estimated_hours > 0 ? (
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <Clock className="size-3" />
            {course.estimated_hours}h
          </span>
        ) : null}
        {course.instructor ? (
          <span className="inline-flex min-w-0 items-center gap-1">
            <User className="size-3 shrink-0" />
            <span className="truncate">{course.instructor.full_name}</span>
          </span>
        ) : null}
      </div>

      {signedIn && (course.enrolled || course.completedLessons > 0) ? (
        <div className="mt-4 flex items-center gap-3">
          <Progress value={course.percent} className="flex-1" />
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{course.percent}%</span>
        </div>
      ) : null}
    </Link>
  );
}
