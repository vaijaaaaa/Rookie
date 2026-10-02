import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Skeleton className="mb-4 h-3 w-24" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-9 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      <Skeleton className="mt-4 h-9 w-44" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="size-10 shrink-0 rounded-full md:size-12" />
              <div className="flex-1 rounded-lg border bg-card p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-5 w-1/2" />
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {Array.from({ length: 4 }, (_, j) => (
                    <Skeleton key={j} className="h-6 w-full" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-64 w-full lg:block" />
      </div>
    </div>
  );
}
