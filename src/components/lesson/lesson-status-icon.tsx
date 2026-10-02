import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressStatus } from "@/types";

/** ✓ completed (brand) · ◉ in progress · ○ not started */
export function LessonStatusIcon({ status, className }: { status: ProgressStatus | undefined; className?: string }) {
  if (status === "completed") {
    return <CheckCircle2 aria-label="Completed" className={cn("size-4 shrink-0 text-brand", className)} />;
  }
  if (status === "in_progress") {
    return <CircleDot aria-label="In progress" className={cn("size-4 shrink-0 text-info", className)} />;
  }
  return <Circle aria-label="Not started" className={cn("size-4 shrink-0 text-muted-foreground/50", className)} />;
}
