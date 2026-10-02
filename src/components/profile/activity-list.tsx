import {
  Award, BookOpen, CalendarCheck, CheckCircle2, ClipboardCheck, Code2, GraduationCap, type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { timeAgo } from "@/lib/utils/format";
import type { ActivityLog, ActivityType } from "@/types";

const META: Record<ActivityType, { icon: LucideIcon; label: string }> = {
  lesson_completed: { icon: BookOpen, label: "Completed lesson" },
  problem_solved: { icon: Code2, label: "Solved problem" },
  class_attended: { icon: CalendarCheck, label: "Attended class" },
  assignment_submitted: { icon: ClipboardCheck, label: "Submitted assignment" },
  roadmap_node_completed: { icon: CheckCircle2, label: "Completed topic" },
  course_completed: { icon: GraduationCap, label: "Completed course" },
  achievement_unlocked: { icon: Award, label: "Unlocked achievement" },
};

export function ActivityList({ items }: { items: Pick<ActivityLog, "id" | "type" | "title" | "occurred_at">[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Complete a lesson, solve a problem or attend a class and it will show up here."
        className="border-0 py-6"
      />
    );
  }
  return (
    <ol className="space-y-3">
      {items.map((a) => {
        const m = META[a.type] ?? { icon: CheckCircle2, label: a.type };
        const Icon = m.icon;
        return (
          <li key={a.id} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
              <Icon className="size-3.5 text-muted-foreground" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="text-muted-foreground">{m.label}</span>{" "}
                <span className="font-medium">{a.title}</span>
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                <time dateTime={a.occurred_at}>{timeAgo(a.occurred_at)}</time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
