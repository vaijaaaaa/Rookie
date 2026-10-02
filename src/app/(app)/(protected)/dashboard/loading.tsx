import { HeroSkeleton, PanelSkeleton } from "@/components/dashboard/skeletons";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <HeroSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PanelSkeleton rows={4} rowClassName="h-8" />
          <PanelSkeleton rows={3} rowClassName="h-16" />
        </div>
        <div className="space-y-4">
          <PanelSkeleton rows={1} rowClassName="h-28" />
          <PanelSkeleton rows={3} rowClassName="h-12" />
        </div>
      </div>
    </div>
  );
}
