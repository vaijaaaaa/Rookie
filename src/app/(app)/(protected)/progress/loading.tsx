import { Skeleton } from "@/components/ui/skeleton";
import { PanelSkeleton } from "@/components/dashboard/skeletons";

export default function ProgressLoading() {
  return (
    <div className="mx-auto max-w-6xl" aria-busy="true" aria-label="Loading progress">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-lg" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <PanelSkeleton rows={1} rowClassName="h-28" className="lg:col-span-2" />
        <PanelSkeleton rows={3} rowClassName="h-8" />
        <PanelSkeleton rows={1} rowClassName="h-44" className="lg:col-span-2" />
        <PanelSkeleton rows={3} rowClassName="h-8" />
      </div>
    </div>
  );
}
