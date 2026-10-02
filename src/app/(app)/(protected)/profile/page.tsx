import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarCheck, Code2, Flame, GraduationCap, Map, Pencil } from "lucide-react";
import { ActivityList } from "@/components/profile/activity-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { percent } from "@/lib/utils";
import { formatDate, LABELS } from "@/lib/utils/format";
import type { ActivityLog, MyStats, Roadmap, RoadmapProgressRow } from "@/types";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [statsRes, activityRes, roadmapRes, progressRes] = await Promise.all([
    supabase.rpc("get_my_stats"),
    supabase
      .from("activity_logs")
      .select("id, type, title, occurred_at")
      .eq("user_id", profile.id)
      .order("occurred_at", { ascending: false })
      .limit(10)
      .overrideTypes<Pick<ActivityLog, "id" | "type" | "title" | "occurred_at">[], { merge: false }>(),
    profile.primary_roadmap_id
      ? supabase
          .from("roadmaps")
          .select("id, slug, title, summary")
          .eq("id", profile.primary_roadmap_id)
          .maybeSingle<Pick<Roadmap, "id" | "slug" | "title" | "summary">>()
      : Promise.resolve({ data: null }),
    profile.primary_roadmap_id
      ? supabase.rpc("get_roadmaps_progress")
      : Promise.resolve({ data: [] }),
  ]);

  const stats = (statsRes.data ?? null) as MyStats | null;
  const activity = activityRes.data ?? [];
  const roadmap = roadmapRes.data;
  const roadmapProgress = ((progressRes.data ?? []) as RoadmapProgressRow[]).find((r) => r.roadmap_id === profile.primary_roadmap_id) ?? null;
  const attendance =
    stats && stats.classes_total > 0 ? `${percent(stats.classes_attended, stats.classes_total)}%` : "—";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">
              <Pencil /> Edit profile
            </Link>
          </Button>
        }
      />

      <section aria-label="About you" className="rounded-lg border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <UserAvatar name={profile.full_name} src={profile.avatar_url} className="size-16 text-base sm:size-20" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{profile.full_name || "Unnamed learner"}</h2>
              <Badge variant="outline" className="font-mono uppercase">
                {profile.role}
              </Badge>
            </div>
            {profile.username ? (
              <p className="font-mono text-sm text-muted-foreground">@{profile.username}</p>
            ) : null}
            {profile.bio ? (
              <p className="mt-3 max-w-prose text-sm whitespace-pre-line">{profile.bio}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No bio yet.{" "}
                <Link href="/settings" className="underline-offset-4 hover:text-foreground hover:underline">
                  Add one
                </Link>
              </p>
            )}
            <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Goal</dt>
                <dd className="mt-0.5">{profile.learning_goal ? LABELS.learning_goal[profile.learning_goal] : "Not set"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Experience</dt>
                <dd className="mt-0.5">{profile.experience ? LABELS.experience[profile.experience] : "Not set"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Joined</dt>
                <dd className="mt-0.5">
                  <time dateTime={profile.created_at}>{formatDate(profile.created_at, "MMMM yyyy")}</time>
                </dd>
              </div>
            </dl>
            {profile.interests.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Interests">
                {profile.interests.map((i) => (
                  <li key={i}>
                    <Badge variant="outline" className="font-mono">
                      {i}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-label="Stats" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Lessons" value={stats?.lessons_completed ?? 0} hint="completed" icon={BookOpen} />
        <StatCard label="Problems" value={stats?.problems_solved ?? 0} hint="solved" icon={Code2} />
        <StatCard label="Courses" value={stats?.courses_completed ?? 0} hint="completed" icon={GraduationCap} />
        <StatCard
          label="Attendance"
          value={attendance}
          hint={stats && stats.classes_total > 0 ? `${stats.classes_attended}/${stats.classes_total} classes` : "no classes yet"}
          icon={CalendarCheck}
        />
        <StatCard
          label="Streak"
          value={stats?.current_streak ?? 0}
          hint={`days · best ${stats?.longest_streak ?? 0}`}
          icon={Flame}
          className="col-span-2 md:col-span-1"
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Section title="Current roadmap" href={roadmap ? `/roadmaps/${roadmap.slug}` : undefined} hrefLabel="Open">
          {roadmap ? (
            <div>
              <p className="font-medium">{roadmap.title}</p>
              {roadmap.summary ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{roadmap.summary}</p> : null}
              <div className="mt-4 flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>
                  {roadmapProgress?.completed_topics ?? 0}/{roadmapProgress?.total_topics ?? 0} topics
                </span>
                <span className="text-foreground tabular-nums">{roadmapProgress?.percent ?? 0}%</span>
              </div>
              <Progress
                value={roadmapProgress?.percent ?? 0}
                className="mt-1.5"
                aria-label={`${roadmap.title} progress`}
              />
            </div>
          ) : (
            <EmptyState
              icon={Map}
              title="No roadmap selected"
              description="Pick a roadmap to get a structured path and daily recommendations."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/roadmaps">Browse roadmaps</Link>
                </Button>
              }
              className="border-0 py-6"
            />
          )}
        </Section>

        <Section title="Recent activity" href="/progress" hrefLabel="Progress">
          <ActivityList items={activity} />
        </Section>
      </div>
    </div>
  );
}
