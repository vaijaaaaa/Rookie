import Link from "next/link";
import { ArrowRight, Map } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { LandingRoadmap } from "./data";
import { LandingSection, SectionHeading } from "./section-heading";

export function PopularRoadmaps({ roadmaps }: { roadmaps: LandingRoadmap[] }) {
  return (
    <LandingSection labelledBy="roadmaps-title">
      <SectionHeading
        id="roadmaps-title"
        eyebrow="Roadmaps"
        title="A map of what to learn, in order."
        description="Each roadmap is a sequence of sections and topics linked to real lessons. Check topics off as you go."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/roadmaps">
              All roadmaps <ArrowRight />
            </Link>
          </Button>
        }
      />
      {roadmaps.length === 0 ? (
        <EmptyState
          icon={Map}
          title="Roadmaps are being drafted"
          description="We haven't published any roadmaps yet. Check back soon."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {roadmaps.map((r, i) => (
            <li key={r.id}>
              <Link
                href={`/roadmaps/${r.slug}`}
                className="group flex h-full flex-col rounded-lg border bg-card p-5 outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} / {r.slug}
                  </span>
                  <DifficultyBadge value={r.difficulty} />
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight group-hover:text-brand">{r.title}</h3>
                {r.summary ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.summary}</p> : null}
                <dl className="mt-auto flex gap-6 pt-5 font-mono text-xs">
                  <div>
                    <dt className="text-muted-foreground">topics</dt>
                    <dd className="mt-0.5 text-sm tabular-nums">{r.topic_count}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">duration</dt>
                    <dd className="mt-0.5 text-sm tabular-nums">~{r.estimated_weeks} wks</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </LandingSection>
  );
}
