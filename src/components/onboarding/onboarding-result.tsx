"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Map, Sparkles } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { Button } from "@/components/ui/button";
import type { RecommendedRoadmap } from "@/app/onboarding/actions";

export function OnboardingResult({ roadmap }: { roadmap: RecommendedRoadmap | null }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="w-full" role="status" aria-live="polite">
      <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-brand">
        <Sparkles className="size-3.5" aria-hidden /> You&apos;re all set
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-semibold tracking-tight outline-none sm:text-3xl">
        {roadmap ? "Your recommended roadmap" : "Your profile is ready"}
      </h1>

      {roadmap ? (
        <>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Based on your answers, start here. We&apos;ve added it to your dashboard and enrolled you in its courses.
          </p>
          <div className="mt-6 rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <Map className="size-3.5" aria-hidden /> roadmaps/{roadmap.slug}
              </span>
              <DifficultyBadge value={roadmap.difficulty} />
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">{roadmap.title}</h2>
            {roadmap.summary ? <p className="mt-1 text-sm text-muted-foreground">{roadmap.summary}</p> : null}
            <dl className="mt-5 flex gap-6 font-mono text-xs">
              <div>
                <dt className="text-muted-foreground">topics</dt>
                <dd className="mt-0.5 text-sm tabular-nums">{roadmap.topic_count}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">duration</dt>
                <dd className="mt-0.5 text-sm tabular-nums">~{roadmap.estimated_weeks} wks</dd>
              </div>
            </dl>
          </div>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-muted-foreground">
          No roadmaps have been published yet, so we couldn&apos;t make a recommendation. Your dashboard will suggest one
          as soon as they&apos;re available.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="brand">
          <Link href="/dashboard">
            Go to dashboard <ArrowRight />
          </Link>
        </Button>
        {roadmap ? (
          <Button asChild variant="outline">
            <Link href={`/roadmaps/${roadmap.slug}`}>View roadmap</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/roadmaps">Browse roadmaps</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
