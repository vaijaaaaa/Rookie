import Link from "next/link";
import { CalendarRange, Layers, ListChecks, Star } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { RoadmapCard as RoadmapCardData } from "@/services/roadmaps";

export function RoadmapCard({ roadmap, signedIn }: { roadmap: RoadmapCardData; signedIn: boolean }) {
  return (
    <Link
      href={`/roadmaps/${roadmap.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
        roadmap.current && "border-brand/40",
      )}
    >
      {roadmap.current ? <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-brand" /> : null}

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight group-hover:text-brand">{roadmap.title}</h3>
        {roadmap.current ? (
          <Badge variant="success" className="shrink-0">
            <Star /> Current
          </Badge>
        ) : roadmap.following ? (
          <Badge variant="outline" className="shrink-0">
            Following
          </Badge>
        ) : null}
      </div>

      <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{roadmap.summary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs tabular-nums text-muted-foreground">
        <DifficultyBadge value={roadmap.difficulty} />
        <span className="inline-flex items-center gap-1">
          <CalendarRange className="size-3" /> {roadmap.estimated_weeks} {roadmap.estimated_weeks === 1 ? "week" : "weeks"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Layers className="size-3" /> {roadmap.sectionCount} {roadmap.sectionCount === 1 ? "section" : "sections"}
        </span>
        <span className="inline-flex items-center gap-1">
          <ListChecks className="size-3" /> {roadmap.topicCount} {roadmap.topicCount === 1 ? "topic" : "topics"}
        </span>
      </div>

      {signedIn && (roadmap.following || roadmap.completedTopics > 0) ? (
        <div className="mt-4 border-t pt-3">
          <div className="mb-1.5 flex items-baseline justify-between font-mono text-xs tabular-nums">
            <span className="text-muted-foreground">
              {roadmap.completedTopics}/{roadmap.topicCount} topics
            </span>
            <span className={roadmap.percent === 100 ? "text-brand" : "text-foreground"}>{roadmap.percent}%</span>
          </div>
          <Progress value={roadmap.percent} />
        </div>
      ) : null}
    </Link>
  );
}
