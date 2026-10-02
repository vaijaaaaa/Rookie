import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-2 mb-6 h-7 w-32" />
      <div className="flex gap-5 rounded-lg border p-6">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Skeleton className="h-48" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
