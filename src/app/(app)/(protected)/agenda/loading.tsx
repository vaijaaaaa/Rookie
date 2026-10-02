import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Loading agenda">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>
      <Skeleton className="mb-4 h-[68px] w-full rounded-lg" />
      <Skeleton className="mb-4 h-24 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[4.5rem_1fr] gap-3 sm:grid-cols-[5.5rem_1fr]">
            <Skeleton className="mt-3 ml-auto h-3 w-14" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
