import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Generic panel skeleton matching the shared <Section> chrome. */
export function PanelSkeleton({ rows = 3, className, rowClassName }: { rows?: number; className?: string; rowClassName?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card", className)} aria-busy="true">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={cn("h-10 w-full", rowClassName)} />
        ))}
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-5" aria-busy="true">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mt-2 h-4 w-48" />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  );
}
