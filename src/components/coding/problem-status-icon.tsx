import { CircleCheck, Contrast } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProblemStatus } from "@/services/practice";

const LABEL: Record<ProblemStatus, string> = {
  solved: "Solved",
  attempted: "Attempted",
  todo: "To do",
};

/** ✓ solved (has an accepted submission) · ◐ attempted · empty for to-do. */
export function ProblemStatusIcon({ status, className }: { status: ProblemStatus; className?: string }) {
  return (
    <span className={cn("inline-flex size-4 items-center justify-center", className)} title={LABEL[status]}>
      {status === "solved" ? (
        <CircleCheck className="size-4 text-success" aria-hidden />
      ) : status === "attempted" ? (
        <Contrast className="size-4 text-warning" aria-hidden />
      ) : (
        <span className="size-1 rounded-full bg-muted-foreground/40" aria-hidden />
      )}
      <span className="sr-only">{LABEL[status]}</span>
    </span>
  );
}
