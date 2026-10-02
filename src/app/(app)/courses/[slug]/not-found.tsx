import Link from "next/link";
import { BookX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function CourseNotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl py-10">
      <EmptyState
        icon={BookX}
        title="Course or lesson not found"
        description="It may have been unpublished, renamed, or never existed."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/courses">Browse courses</Link>
          </Button>
        }
      />
    </div>
  );
}
