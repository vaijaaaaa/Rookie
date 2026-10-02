import { Skeleton } from "@/components/ui/skeleton";

function PanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="space-y-2 p-4">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${90 - i * 15}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading class…</span>
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <PanelSkeleton lines={5} />
          <PanelSkeleton lines={4} />
          <PanelSkeleton lines={2} />
        </div>
        <div className="space-y-6">
          <PanelSkeleton lines={4} />
          <PanelSkeleton lines={2} />
          <PanelSkeleton lines={3} />
        </div>
      </div>
    </div>
  );
}
