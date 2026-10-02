import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function RoadmapNotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl py-10">
      <EmptyState
        icon={MapPinOff}
        title="Roadmap not found"
        description="It may have been unpublished or the link is wrong."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/roadmaps">Browse roadmaps</Link>
          </Button>
        }
      />
    </div>
  );
}
