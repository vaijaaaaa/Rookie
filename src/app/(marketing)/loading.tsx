import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16" aria-busy="true" aria-label="Loading">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-14 w-full max-w-md" />
          <Skeleton className="h-14 w-3/4" />
          <Skeleton className="h-16 w-full max-w-lg" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
      <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
