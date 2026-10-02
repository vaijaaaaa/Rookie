import { Skeleton } from "@/components/ui/skeleton";

export default function NoteLoading() {
  return (
    <div className="mx-auto max-w-5xl" aria-busy="true" aria-label="Loading note">
      <Skeleton className="mb-4 h-3 w-20" />
      <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
        <div className="space-y-3">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-[22rem] w-full" />
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}
