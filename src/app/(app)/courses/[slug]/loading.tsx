import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Skeleton className="mb-4 h-3 w-24" />
      <div className="flex flex-col gap-6 rounded-lg border bg-card p-6 md:flex-row md:justify-between">
        <div className="flex flex-1 gap-4">
          <Skeleton className="hidden size-14 sm:block" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-5 w-80 max-w-full" />
          </div>
        </div>
        <div className="w-full space-y-3 md:w-64">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-1.5 w-full" />
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-lg border bg-card">
              <div className="space-y-2 border-b p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-1/2" />
              </div>
              {Array.from({ length: 4 }, (_, j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="size-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
