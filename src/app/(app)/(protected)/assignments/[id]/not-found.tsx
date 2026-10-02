import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function AssignmentNotFound() {
  return (
    <EmptyState
      icon={ClipboardList}
      title="Assignment not found"
      description="It may have been unpublished, or it belongs to a course you're not enrolled in."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/assignments">Back to assignments</Link>
        </Button>
      }
    />
  );
}
