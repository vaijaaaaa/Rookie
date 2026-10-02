import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { RoadmapSection, RoadmapTopic } from "@/services/roadmaps";
import { TopicStateIcon } from "./topic-state-icon";
import { TopicToggle } from "./topic-toggle";

type SectionState = "completed" | "active" | "upcoming";

function sectionState(s: RoadmapSection, currentTopicId: string | null): SectionState {
  if (s.topics.length > 0 && s.completedTopics === s.topics.length) return "completed";
  if (currentTopicId && s.topics.some((t) => t.id === currentTopicId)) return "active";
  return "upcoming";
}

/**
 * Vertical learning path: a rail connects numbered section nodes; each section
 * lists its topics with ✓ / → / ○ state. Rail segments fill with the brand
 * colour once a section is complete.
 */
export function RoadmapPathView({
  sections,
  currentTopicId,
  roadmapSlug,
  signedIn,
}: {
  sections: RoadmapSection[];
  currentTopicId: string | null;
  roadmapSlug: string;
  signedIn: boolean;
}) {
  return (
    <ol className="relative">
      {sections.map((s, i) => {
        const state = sectionState(s, currentTopicId);
        const last = i === sections.length - 1;
        return (
          <li
            key={s.id}
            className="relative pb-8 pl-12 last:pb-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 md:pl-16"
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms`, animationFillMode: "both" }}
          >
            {/* Rail segment to the next node */}
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-10 bottom-0 left-[19px] w-0.5 md:top-12 md:left-[23px]",
                  state === "completed" ? "bg-brand" : "bg-border",
                )}
              />
            ) : null}

            {/* Node */}
            <span
              aria-hidden
              className={cn(
                "absolute top-0 left-0 flex size-10 items-center justify-center rounded-full border-2 font-mono text-sm font-semibold tabular-nums md:size-12 md:text-base",
                state === "completed" && "border-brand bg-brand text-brand-foreground",
                state === "active" && "border-brand bg-background text-brand ring-4 ring-brand/15",
                state === "upcoming" && "border-border bg-card text-muted-foreground",
              )}
            >
              {i + 1}
            </span>

            <section
              aria-labelledby={`section-${s.id}`}
              className={cn(
                "rounded-lg border bg-card transition-colors",
                state === "active" && "border-brand/40 shadow-[0_0_0_1px] shadow-brand/10",
              )}
            >
              <header className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Section {String(i + 1).padStart(2, "0")}
                    {state === "active" ? <span className="ml-2 text-brand">· In progress</span> : null}
                    {state === "completed" ? <span className="ml-2 text-brand">· Complete</span> : null}
                  </p>
                  <h3 id={`section-${s.id}`} className="mt-0.5 text-base font-semibold tracking-tight md:text-lg">
                    {s.href ? (
                      <Link href={s.href} className="inline-flex items-center gap-1 hover:text-brand">
                        {s.title} <ArrowUpRight className="size-4 text-muted-foreground" />
                      </Link>
                    ) : (
                      s.title
                    )}
                  </h3>
                </div>
                {signedIn && s.topics.length > 0 ? (
                  <div className="flex shrink-0 items-center gap-2 sm:w-36">
                    <Progress value={s.percent} className="flex-1" />
                    <span className="w-9 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {s.percent}%
                    </span>
                  </div>
                ) : null}
              </header>

              {s.description ? (
                <p className="px-4 pt-3 text-sm text-muted-foreground md:px-5">{s.description}</p>
              ) : null}

              {s.topics.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground md:px-5">Topics coming soon.</p>
              ) : (
                <ul className="grid gap-1 p-2 md:grid-cols-2 md:p-3">
                  {s.topics.map((t) => (
                    <TopicRow key={t.id} topic={t} roadmapSlug={roadmapSlug} signedIn={signedIn} />
                  ))}
                </ul>
              )}
            </section>
          </li>
        );
      })}
    </ol>
  );
}

function TopicRow({ topic, roadmapSlug, signedIn }: { topic: RoadmapTopic; roadmapSlug: string; signedIn: boolean }) {
  const current = topic.state === "current";
  const titleEl = topic.href ? (
    <Link
      href={topic.href}
      className={cn(
        "after:absolute after:inset-0 after:content-[''] hover:text-brand",
        topic.completed && "text-muted-foreground",
      )}
    >
      {topic.title}
    </Link>
  ) : (
    <span className={cn(topic.completed && "text-muted-foreground")}>{topic.title}</span>
  );

  return (
    <li
      id={`topic-${topic.id}`}
      className={cn(
        "relative flex items-start gap-3 rounded-md px-2.5 py-2 transition-colors",
        topic.href && "hover:bg-accent/50",
        current && "bg-brand/10 ring-1 ring-brand/30",
      )}
    >
      <span className="relative z-10 mt-px">
        {signedIn && topic.manual ? (
          <TopicToggle
            nodeId={topic.id}
            roadmapSlug={roadmapSlug}
            title={topic.title}
            done={topic.completed}
            state={topic.state}
          />
        ) : (
          <TopicStateIcon state={topic.state} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-5", current ? "font-medium text-foreground" : "text-foreground/90")}>
          {titleEl}
        </p>
        {topic.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{topic.description}</p>
        ) : null}
        {current ? (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-brand">Up next</p>
        ) : null}
      </div>
      {topic.href ? <BookOpen className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-label="Has lesson" /> : null}
    </li>
  );
}
