import { Skeleton } from "@/components/ui/skeleton";

export function FormLoading() {
  return (
    <div className="mx-auto max-w-3xl">
      <Skeleton className="mb-4 h-8 w-24" />
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableLoading({ rows = 8 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-6xl">
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="space-y-2 rounded-lg border p-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56" />
        ))}
      </div>
    </div>
  );
}
