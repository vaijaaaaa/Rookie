import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function ProblemNotFound() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <EmptyState
        icon={SearchX}
        title="Problem not found"
        description="It may have been unpublished or the link is wrong."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/practice">Back to problems</Link>
          </Button>
        }
      />
    </div>
  );
}
