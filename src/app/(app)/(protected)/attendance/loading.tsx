import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading attendance…</span>
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-3 rounded-lg border bg-card p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-12 w-28" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="mt-4 h-2 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-3 rounded-lg border bg-card p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="h-12 sm:h-16" />
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-lg border bg-card p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
