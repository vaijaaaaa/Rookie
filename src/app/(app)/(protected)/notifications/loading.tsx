import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Loading notifications">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="mt-2 h-7 w-44" />
      <Skeleton className="mt-2 mb-6 h-4 w-24" />
      <Skeleton className="mb-4 h-9 w-40" />
      <div className="divide-y rounded-lg border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-4">
            <Skeleton className="size-8" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
