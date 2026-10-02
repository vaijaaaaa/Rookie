import { ClassListSkeleton } from "@/components/classes/class-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading classes…</span>
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-9 w-80 max-w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <ClassListSkeleton />
      </div>
    </div>
  );
}
