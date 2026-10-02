import Link from "next/link";
import { Video } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ClassNotFound() {
  return (
    <EmptyState
      icon={Video}
      title="Class not found"
      description="This class doesn't exist, or it belongs to a course you're not enrolled in."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/classes">Back to classes</Link>
        </Button>
      }
    />
  );
}
