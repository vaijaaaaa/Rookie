import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarRange, CheckCircle2, ChevronLeft, Layers, ListChecks, Map as MapIcon, Trophy } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Markdown } from "@/components/shared/markdown";
import { Section } from "@/components/shared/section";
import { FollowRoadmapActions } from "@/components/roadmap/follow-roadmap-actions";
import { ProgressRing } from "@/components/roadmap/progress-ring";
import { RoadmapPathView } from "@/components/roadmap/roadmap-path";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/session";
import { LABELS } from "@/lib/utils/format";
import { getRoadmapBySlug, getRoadmapPath, isFollowingRoadmap } from "@/services/roadmaps";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const roadmap = await getRoadmapBySlug(slug);
  if (!roadmap) return { title: "Roadmap not found" };
  return { title: `${roadmap.title} roadmap`, description: roadmap.summary || undefined };
}

export default async function RoadmapPage({ params }: Params) {
  const { slug } = await params;
  const [roadmap, profile] = await Promise.all([getRoadmapBySlug(slug), getProfile()]);
  if (!roadmap) notFound();

  const [path, following] = await Promise.all([
    getRoadmapPath(roadmap, !!profile),
    profile ? isFollowingRoadmap(profile.id, roadmap.id) : Promise.resolve(false),
  ]);
  const current = !!profile && profile.primary_roadmap_id === roadmap.id;

  const currentTopic = path.sections.flatMap((s) => s.topics).find((t) => t.id === path.currentTopicId) ?? null;
  const currentSectionIndex = path.sections.findIndex((s) => s.topics.some((t) => t.id === path.currentTopicId));
  const finished = path.totalTopics > 0 && path.completedTopics === path.totalTopics;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        href="/roadmaps"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" /> All roadmaps
      </Link>

      {/* Header */}
      <header className="border-b pb-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Roadmap{roadmap.goal ? ` · ${LABELS.learning_goal[roadmap.goal]}` : ""}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance md:text-4xl">{roadmap.title}</h1>
        {roadmap.summary ? <p className="mt-2 max-w-3xl text-base text-muted-foreground">{roadmap.summary}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs tabular-nums text-muted-foreground">
          <DifficultyBadge value={roadmap.difficulty} />
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="size-3.5" /> ~{roadmap.estimated_weeks}{" "}
            {roadmap.estimated_weeks === 1 ? "week" : "weeks"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-3.5" /> {path.sections.length} {path.sections.length === 1 ? "section" : "sections"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="size-3.5" /> {path.totalTopics} {path.totalTopics === 1 ? "topic" : "topics"}
          </span>
        </div>
        <div className="mt-5">
          <FollowRoadmapActions
            roadmapId={roadmap.id}
            roadmapSlug={roadmap.slug}
            signedIn={!!profile}
            following={following}
            current={current}
          />
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Side panel (first on mobile) */}
        <aside className="space-y-4 lg:order-last lg:sticky lg:top-20 lg:self-start">
          {profile ? (
            <Section title="Your progress">
              <div className="flex items-center gap-4">
                <ProgressRing value={path.percent} size={88} stroke={7} />
                <dl className="space-y-1.5 text-sm">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Topics</dt>
                    <dd className="font-mono tabular-nums">
                      {path.completedTopics}
                      <span className="text-muted-foreground">/{path.totalTopics}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sections done</dt>
                    <dd className="font-mono tabular-nums">
                      {path.sections.filter((s) => s.topics.length > 0 && s.completedTopics === s.topics.length).length}
                      <span className="text-muted-foreground">/{path.sections.length}</span>
                    </dd>
                  </div>
                </dl>
              </div>
              {finished ? (
                <p className="mt-4 flex items-center gap-2 rounded-md border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-brand">
                  <Trophy className="size-4" /> Roadmap complete
                </p>
              ) : currentTopic ? (
                <div className="mt-4 rounded-md border bg-muted/30 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-brand">
                    Up next{currentSectionIndex >= 0 ? ` · Section ${currentSectionIndex + 1}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-medium">{currentTopic.title}</p>
                  <div className="mt-3 flex gap-2">
                    {currentTopic.href ? (
                      <Button asChild size="sm" variant="brand" className="flex-1">
                        <Link href={currentTopic.href}>
                          Continue <ArrowRight />
                        </Link>
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="outline" className={currentTopic.href ? "" : "flex-1"}>
                      <a href={`#topic-${currentTopic.id}`}>Jump to topic</a>
                    </Button>
                  </div>
                </div>
              ) : null}
            </Section>
          ) : (
            <Section title="Track your progress">
              <p className="text-sm text-muted-foreground">
                Sign in to follow this roadmap, check off topics, and see your progress fill the path.
              </p>
            </Section>
          )}

          {roadmap.prerequisites.length > 0 ? (
            <Section title="Prerequisites">
              <ul className="space-y-1.5 text-sm">
                {roadmap.prerequisites.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="Legend">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-brand" /> Completed
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-brand" /> Up next
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-muted-foreground/30" /> Upcoming
              </li>
              {profile ? (
                <li className="pt-1">Topics linked to lessons complete automatically; click the circle on other topics to check them off.</li>
              ) : null}
            </ul>
          </Section>
        </aside>

        {/* Path */}
        <div className="min-w-0">
          {roadmap.description ? (
            <div className="mb-8">
              <Markdown className="prose-sm">{roadmap.description}</Markdown>
            </div>
          ) : null}
          {path.sections.length === 0 ? (
            <EmptyState icon={MapIcon} title="This roadmap is being drafted" description="Sections will appear here soon." />
          ) : (
            <RoadmapPathView
              sections={path.sections}
              currentTopicId={profile ? path.currentTopicId : null}
              roadmapSlug={roadmap.slug}
              signedIn={!!profile}
            />
          )}
        </div>
      </div>
    </div>
  );
}
