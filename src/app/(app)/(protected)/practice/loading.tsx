import { Skeleton } from "@/components/ui/skeleton";

export default function PracticeLoading() {
  return (
    <div className="mx-auto max-w-6xl" aria-busy="true" aria-label="Loading problems">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-3 h-1.5 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-40 shrink-0" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2 lg:flex-row">
        <Skeleton className="h-9 flex-1" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9 lg:w-36" />
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-3 py-3">
          <Skeleton className="h-3 w-48" />
        </div>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-3 py-3 last:border-0">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-4 flex-1 max-w-72" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="hidden h-5 w-32 lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
