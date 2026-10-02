import { Badge } from "@/components/ui/badge";

type Variant = "success" | "warning" | "danger" | "info" | "outline" | "secondary";

const MAP: Record<string, { label: string; variant: Variant }> = {
  present: { label: "Present", variant: "success" },
  absent: { label: "Absent", variant: "danger" },
  late: { label: "Late", variant: "warning" },
  excused: { label: "Excused", variant: "info" },
  not_started: { label: "Not started", variant: "outline" },
  in_progress: { label: "In progress", variant: "info" },
  submitted: { label: "Submitted", variant: "secondary" },
  reviewed: { label: "Reviewed", variant: "success" },
  scheduled: { label: "Scheduled", variant: "outline" },
  live: { label: "Live", variant: "danger" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "outline" },
  accepted: { label: "Accepted", variant: "success" },
  wrong_answer: { label: "Wrong answer", variant: "danger" },
  runtime_error: { label: "Runtime error", variant: "danger" },
  compile_error: { label: "Compile error", variant: "danger" },
  time_limit: { label: "Time limit", variant: "warning" },
  pending: { label: "Pending judge", variant: "outline" },
  todo: { label: "To do", variant: "outline" },
  done: { label: "Done", variant: "success" },
  skipped: { label: "Skipped", variant: "outline" },
};

/** Late is a derived assignment status. */
MAP.late_assignment = { label: "Late", variant: "danger" };

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const m = MAP[status] ?? { label: status, variant: "outline" as const };
  return (
    <Badge variant={m.variant} className={className}>
      {status === "live" ? <span className="size-1.5 animate-pulse rounded-full bg-current" /> : null}
      {m.label}
    </Badge>
  );
}
