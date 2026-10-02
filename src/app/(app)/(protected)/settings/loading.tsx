import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl" aria-busy="true" aria-label="Loading settings">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-2 h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-72" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="mt-8 grid gap-4 md:grid-cols-[14rem_1fr] md:gap-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-48" />
        </div>
      ))}
    </div>
  );
}
