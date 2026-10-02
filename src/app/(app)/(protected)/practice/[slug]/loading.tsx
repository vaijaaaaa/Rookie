import { Skeleton } from "@/components/ui/skeleton";
import { EditorSkeleton } from "@/components/coding/code-editor-lazy";

export default function ProblemLoading() {
  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-3.5rem-4rem)]" aria-busy="true" aria-label="Loading problem">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="h-10 w-full lg:hidden" />
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <div className="min-h-[60dvh] rounded-lg border bg-card lg:min-h-0 lg:w-[45%]">
          <div className="flex gap-4 border-b px-4 py-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-3 w-16" />
            ))}
          </div>
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-6 h-3 w-20" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div className="hidden min-h-0 flex-1 flex-col rounded-lg border bg-card lg:flex">
          <div className="flex items-center gap-2 border-b px-2 py-1.5">
            <Skeleton className="h-8 w-28" />
            <div className="flex-1" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="min-h-0 flex-1">
            <EditorSkeleton />
          </div>
          <div className="h-[260px] border-t p-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
