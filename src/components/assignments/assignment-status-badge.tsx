import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import type { AssignmentDisplayStatus } from "@/types";
import { displayStatusBadgeKey } from "./assignment-status";

export function AssignmentStatusBadge({
  status,
  submittedLate = false,
}: {
  status: AssignmentDisplayStatus;
  submittedLate?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <StatusBadge status={displayStatusBadgeKey(status)} />
      {submittedLate ? (
        <Badge variant="warning" title="Turned in after the deadline">
          Submitted late
        </Badge>
      ) : null}
    </span>
  );
}
