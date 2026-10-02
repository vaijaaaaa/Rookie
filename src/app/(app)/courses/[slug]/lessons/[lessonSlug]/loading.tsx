import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[256px_minmax(0,1fr)_264px]">
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-1.5 w-full" />
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="mb-4 h-8 w-36 lg:hidden" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="mt-4 h-9 w-3/4" />
          <Skeleton className="mt-3 h-4 w-40" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-6 h-40 w-full" />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="hidden space-y-3 xl:block">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="mt-6 h-3 w-24" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
