import type { Metadata } from "next";
import { Award, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireProfile } from "@/lib/auth/session";
import { cn, percent } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";
import { getAchievements, type AchievementView } from "@/services/progress";

export const metadata: Metadata = { title: "Achievements" };

export default async function AchievementsPage() {
  const profile = await requireProfile();
  const achievements = await getAchievements(profile.id);
  const unlocked = achievements.filter((a) => a.unlockedAt);
  const pct = percent(unlocked.length, achievements.length);

  // Unlocked first (newest first), then locked in definition order.
  const sorted = achievements
    .map((a, i) => ({ a, i }))
    .sort((x, y) => {
      if (x.a.unlockedAt && y.a.unlockedAt) return Date.parse(y.a.unlockedAt) - Date.parse(x.a.unlockedAt);
      if (x.a.unlockedAt) return -1;
      if (y.a.unlockedAt) return 1;
      return x.i - y.i;
    })
    .map(({ a }) => a);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Milestones"
        title="Achievements"
        description="Earned automatically as you learn, practice and show up."
        actions={
          achievements.length ? (
            <div className="w-48">
              <div className="mb-1 flex justify-between font-mono text-xs text-muted-foreground">
                <span>Unlocked</span>
                <span className="tabular-nums">
                  {unlocked.length} / {achievements.length}
                </span>
              </div>
              <Progress value={pct} aria-label="Achievements unlocked" />
            </div>
          ) : null
        }
      />

      {achievements.length === 0 ? (
        <EmptyState icon={Award} title="No achievements defined yet" description="Check back soon — milestones are on the way." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((a) => (
            <AchievementCard key={a.id} a={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AchievementCard({ a }: { a: AchievementView }) {
  const isUnlocked = !!a.unlockedAt;
  const pct = a.current !== null ? percent(a.current, a.target) : 0;
  return (
    <li
      className={cn(
        "relative flex gap-3 rounded-lg border bg-card p-4 transition-colors",
        isUnlocked ? "border-brand/30" : "bg-card/60",
      )}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-lg border text-2xl",
          isUnlocked ? "border-brand/30 bg-brand/10" : "bg-muted/40 opacity-50 grayscale",
        )}
        aria-hidden
      >
        {a.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className={cn("text-sm font-semibold", !isUnlocked && "text-muted-foreground")}>{a.title}</h2>
          {isUnlocked ? (
            <span className="shrink-0 font-mono text-[11px] text-brand">✓ {formatDate(a.unlockedAt!, "MMM d")}</span>
          ) : (
            <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Locked" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
        {!isUnlocked ? (
          a.current !== null ? (
            <div className="mt-3">
              <div className="mb-1 flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>{a.unit}</span>
                <span className="tabular-nums">
                  {a.current} / {a.target}
                </span>
              </div>
              <Progress value={pct} className="h-1" indicatorClassName="bg-muted-foreground/60" />
            </div>
          ) : a.note ? (
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">{a.note}</p>
          ) : null
        ) : null}
      </div>
    </li>
  );
}
