import type { Metadata } from "next";
import { Map as MapIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RoadmapCard } from "@/components/roadmap/roadmap-card";
import { getProfile } from "@/lib/auth/session";
import { listRoadmapCards } from "@/services/roadmaps";

export const metadata: Metadata = {
  title: "Roadmaps",
  description: "Guided learning paths from fundamentals to job-ready skills.",
};

export default async function RoadmapsPage() {
  const profile = await getProfile();
  const roadmaps = await listRoadmapCards(
    profile ? { id: profile.id, primary_roadmap_id: profile.primary_roadmap_id } : null,
  );

  // Current roadmap first, then followed, then the rest (stable within groups).
  const rank = (r: (typeof roadmaps)[number]) => (r.current ? 0 : r.following ? 1 : 2);
  const sorted = [...roadmaps].sort((a, b) => rank(a) - rank(b));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Learning paths"
        title="Roadmaps"
        description="Step-by-step paths through the topics that matter, linked to lessons you can track."
      />
      {sorted.length === 0 ? (
        <EmptyState icon={MapIcon} title="No roadmaps yet" description="Published roadmaps will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((r) => (
            <RoadmapCard key={r.id} roadmap={r} signedIn={!!profile} />
          ))}
        </div>
      )}
    </div>
  );
}
