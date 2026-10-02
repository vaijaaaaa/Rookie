import Link from "next/link";
import { ArrowUpRight, Brain, Database, Layers, Monitor, Server, Sigma, Terminal, type LucideIcon } from "lucide-react";
import { LABELS } from "@/lib/utils/format";
import type { LearningGoal } from "@/types";
import { LandingSection, SectionHeading } from "./section-heading";

const PATHS: { goal: LearningGoal; icon: LucideIcon; blurb: string; stack: string }[] = [
  { goal: "software_developer", icon: Terminal, blurb: "Programming, DSA, OOP and the habits of shipping software.", stack: "dsa · oop · git" },
  { goal: "full_stack_developer", icon: Layers, blurb: "From HTTP and the browser to APIs, databases and deploys.", stack: "web · sql · apis" },
  { goal: "backend_developer", icon: Server, blurb: "Data modeling, concurrency, networking and service design.", stack: "sql · os · networks" },
  { goal: "frontend_developer", icon: Monitor, blurb: "The DOM, rendering, state and accessible interfaces.", stack: "js · css · a11y" },
  { goal: "data_engineer", icon: Database, blurb: "Storage engines, query planning, pipelines and scale.", stack: "sql · python · etl" },
  { goal: "ai_engineer", icon: Brain, blurb: "The math, data structures and systems under modern ML.", stack: "python · linalg · ml" },
  { goal: "cs_fundamentals", icon: Sigma, blurb: "No job title in mind — just the core of computer science.", stack: "theory · systems" },
];

export function LearningPaths({ goalCounts }: { goalCounts: Partial<Record<LearningGoal, number>> }) {
  return (
    <LandingSection labelledBy="paths-title">
      <SectionHeading
        id="paths-title"
        eyebrow="Learning paths"
        title="Pick where you want to end up."
        description="Tell us your goal once. Rookie recommends a roadmap and builds your day around it."
      />
      <ul className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {PATHS.map(({ goal, icon: Icon, blurb, stack }) => {
          const count = goalCounts[goal] ?? 0;
          return (
            <li key={goal} className="bg-card">
              <Link
                href="/roadmaps"
                className="group flex h-full flex-col gap-3 p-5 outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/60"
              >
                <div className="flex items-center justify-between">
                  <Icon className="size-4 text-brand" aria-hidden />
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </div>
                <div>
                  <h3 className="font-medium">{LABELS.learning_goal[goal]}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
                </div>
                <div className="mt-auto flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                  <span>{stack}</span>
                  {count > 0 ? (
                    <span>
                      {count} roadmap{count === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-col justify-center gap-2 bg-card p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Not sure yet?</p>
          <p className="text-sm text-muted-foreground">
            Answer three questions during onboarding and we&apos;ll suggest a starting point.
          </p>
        </li>
      </ul>
    </LandingSection>
  );
}
