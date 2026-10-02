import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardHero } from "@/components/dashboard/hero";
import {
  AnnouncementsPanel,
  ContinueLearningPanel,
  DueSoonPanel,
  RecentActivityPanel,
  RoadmapProgressPanel,
  TodayPanel,
  UpcomingClassPanel,
} from "@/components/dashboard/panels";
import { HeroSkeleton, PanelSkeleton } from "@/components/dashboard/skeletons";
import { requireProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Suspense fallback={<HeroSkeleton />}>
        <DashboardHero profile={profile} />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Suspense fallback={<PanelSkeleton rows={4} rowClassName="h-8" />}>
            <TodayPanel profile={profile} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton rows={3} rowClassName="h-16" />}>
            <ContinueLearningPanel profile={profile} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton rows={4} rowClassName="h-6" />}>
            <RoadmapProgressPanel profile={profile} />
          </Suspense>
        </div>

        <div className="space-y-4">
          <Suspense fallback={<PanelSkeleton rows={1} rowClassName="h-28" />}>
            <UpcomingClassPanel profile={profile} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton rows={3} rowClassName="h-12" />}>
            <DueSoonPanel profile={profile} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton rows={3} rowClassName="h-12" />}>
            <AnnouncementsPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton rows={5} rowClassName="h-8" />}>
            <RecentActivityPanel profile={profile} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
