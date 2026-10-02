import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading assignment…</span>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-7 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <div className="space-y-2 rounded-lg border bg-card p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-3" style={{ width: `${95 - i * 10}%` }} />
            ))}
          </div>
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-48 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
        <div className="space-y-2 rounded-lg border bg-card p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
