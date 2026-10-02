import Link from "next/link";
import { ArrowRight, Flame, Map as MapIcon, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { hourInTz, safeTimeZone } from "@/components/agenda/tz";
import { cn, percent } from "@/lib/utils";
import { LABELS } from "@/lib/utils/format";
import { getDayAgenda, todayFor } from "@/services/agenda";
import { firstName, getMyStats, getPrimaryRoadmap } from "@/services/dashboard";
import type { Profile } from "@/types";
import { Greeting } from "./greeting";

function greetingInTz(tz: string) {
  const h = hourInTz(new Date(), tz);
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export async function DashboardHero({ profile }: { profile: Profile }) {
  const today = todayFor(profile);
  const [stats, roadmap, day] = await Promise.all([
    getMyStats(),
    getPrimaryRoadmap(profile.primary_roadmap_id),
    getDayAgenda(profile, today),
  ]);
  const goal = profile.learning_goal ? LABELS.learning_goal[profile.learning_goal] : null;
  const dayPct = percent(day.completed, day.total);

  return (
    <section className="rounded-lg border bg-card p-5" aria-label="Overview">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Greeting name={firstName(profile)} serverGreeting={greetingInTz(safeTimeZone(profile.timezone))} />
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Target className="size-3.5" />
            {goal ? (
              <>
                Goal: <span className="text-foreground">{goal}</span>
              </>
            ) : (
              <Link href="/settings" className="hover:text-foreground hover:underline">
                Set a learning goal
              </Link>
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {/* Roadmap */}
        <Tile label="Current roadmap" icon={<MapIcon className="size-3.5" />}>
          {roadmap ? (
            <Link href={`/roadmaps/${roadmap.roadmap.slug}`} className="group block">
              <p className="truncate text-sm font-medium group-hover:underline">{roadmap.roadmap.title}</p>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={roadmap.percent} aria-label={`${roadmap.roadmap.title} progress`} />
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{roadmap.percent}%</span>
              </div>
            </Link>
          ) : (
            <Link href="/roadmaps" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
              Choose a roadmap <ArrowRight className="size-3.5" />
            </Link>
          )}
        </Tile>

        {/* Today */}
        <Tile label="Today's progress" icon={<span className="font-mono text-[10px]">{today.slice(5)}</span>}>
          <Link href="/agenda" className="group block">
            <p className="text-sm">
              <span className="font-semibold tabular-nums">{day.completed}</span>
              <span className="text-muted-foreground"> / {day.total} tasks completed</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={dayPct} aria-label="Today's progress" />
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{dayPct}%</span>
            </div>
          </Link>
        </Tile>

        {/* Streak */}
        <Tile label="Streak" icon={<Flame className={cn("size-3.5", stats.active_today && "text-orange-500")} />}>
          <p className="text-sm">
            <span aria-hidden>🔥 </span>
            <span className="font-semibold tabular-nums">{stats.current_streak}</span>
            <span className="text-muted-foreground"> day{stats.current_streak === 1 ? "" : "s"}</span>
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">best {stats.longest_streak}</span>
          </p>
          <p className={cn("mt-1.5 text-xs", stats.active_today ? "text-success" : "text-muted-foreground")}>
            {stats.active_today
              ? "✓ Active today"
              : stats.current_streak > 0
                ? "Complete something today to keep it going"
                : "Complete a lesson or problem to start one"}
          </p>
        </Tile>
      </div>
    </section>
  );
}

function Tile({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between text-muted-foreground">
        <p className="font-mono text-[11px] uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      {children}
    </div>
  );
}
