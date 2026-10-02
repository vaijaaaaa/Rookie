import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarPlus,
  CircleCheck,
  ClipboardList,
  Code2,
  GraduationCap,
  History,
  Map as MapIcon,
  Megaphone,
  Pin,
  PlayCircle,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { Section } from "@/components/shared/section";
import { StatusBadge } from "@/components/shared/status-badge";
import { AGENDA_TYPE_META } from "@/components/agenda/type-meta";
import { clock12, dateInTz, relativeDayLabel, APP_TIME_ZONE, timeInTz } from "@/components/agenda/tz";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/format";
import { getDayAgenda, todayFor } from "@/services/agenda";
import {
  getAnnouncements,
  getContinueLearning,
  getCourseProgress,
  getDueSoon,
  getEnrolledCourses,
  getPrimaryRoadmap,
  getRecentActivity,
  getUpcomingClass,
} from "@/services/dashboard";
import type { ActivityType, Profile } from "@/types";

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

export async function TodayPanel({ profile }: { profile: Profile }) {
  const today = todayFor();
  const day = await getDayAgenda(profile, today);
  const entries = day.entries.slice(0, 7);
  const more = day.entries.length - entries.length;

  return (
    <Section title="Today" href="/agenda" hrefLabel="Open agenda">
      {entries.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Nothing scheduled today"
          description="Plan a study block or a problem to solve."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/agenda">Plan your day</Link>
            </Button>
          }
          className="py-8"
        />
      ) : (
        <ol className="relative space-y-0.5">
          {entries.map((e) => {
            const Icon = AGENDA_TYPE_META[e.type].icon;
            const live = e.classStatus === "live";
            const body = (
              <>
                <span className="w-16 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {e.start ? clock12(e.start) : "Anytime"}
                </span>
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md border",
                    e.done ? "border-brand/40 bg-brand/10 text-brand" : "bg-background text-muted-foreground",
                    live && "border-destructive/40 text-destructive",
                  )}
                  aria-hidden
                >
                  {e.done ? <CircleCheck className="size-3.5" /> : <Icon className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm", e.done && "text-muted-foreground line-through")}>
                    {live ? "🔴 " : null}
                    {e.title}
                  </span>
                  {e.course ? <span className="block truncate text-xs text-muted-foreground">{e.course.title}</span> : null}
                </span>
                {live ? <StatusBadge status="live" /> : null}
                <span className="sr-only">{e.done ? "(done)" : ""}</span>
              </>
            );
            return (
              <li key={e.key}>
                <Link
                  href={e.kind === "item" ? "/agenda" : (e.href ?? "/agenda")}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/60"
                >
                  {body}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      {more > 0 ? (
        <Link href="/agenda" className="mt-2 block px-2 text-xs text-muted-foreground hover:text-foreground">
          +{more} more
        </Link>
      ) : null}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Continue learning
// ---------------------------------------------------------------------------

export async function ContinueLearningPanel({ profile }: { profile: Profile }) {
  const items = await getContinueLearning(profile.id, 3);
  return (
    <Section title="Continue learning" href="/courses" hrefLabel="All courses">
      {items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No lessons in progress"
          description="Enroll in a course to get a personalised next step here."
          action={
            <Button asChild size="sm" variant="brand">
              <Link href="/courses">Browse courses</Link>
            </Button>
          }
          className="py-8"
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={item.course.id}>
              <Link
                href={`/courses/${item.course.slug}/lessons/${item.lesson.slug}`}
                className={cn(
                  "group flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40",
                  idx === 0 && "border-brand/30 bg-brand/5",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-base">
                  {item.course.icon ?? <BookOpen className="size-4 text-muted-foreground" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm">
                    <span className="text-muted-foreground">{item.course.title}</span>
                    <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{item.lesson.title}</span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <Progress value={item.percent} className="h-1" aria-label={`${item.course.title} progress`} />
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {item.completed}/{item.total}
                    </span>
                  </span>
                </span>
                <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground sm:flex">
                  <PlayCircle className="size-4" />
                  {item.started ? "Resume" : "Start"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Roadmap / course progress
// ---------------------------------------------------------------------------

export async function RoadmapProgressPanel({ profile }: { profile: Profile }) {
  const roadmap = await getPrimaryRoadmap(profile.primary_roadmap_id);

  if (roadmap && roadmap.sections.length) {
    return (
      <Section title="Roadmap progress" href={`/roadmaps/${roadmap.roadmap.slug}`} hrefLabel="Open roadmap">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium">{roadmap.roadmap.title}</p>
          <p className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {roadmap.completed}/{roadmap.total} topics
          </p>
        </div>
        <ul className="space-y-2.5">
          {roadmap.sections.map((s) => (
            <li key={s.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className={cn("truncate", s.percent === 100 ? "text-muted-foreground" : "text-foreground")}>
                  {s.percent === 100 ? "✓ " : null}
                  {s.title}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{s.percent}%</span>
              </div>
              <Progress value={s.percent} aria-label={`${s.title} progress`} />
            </li>
          ))}
        </ul>
      </Section>
    );
  }

  // Fallback: per enrolled course
  const [courses, progress] = await Promise.all([getEnrolledCourses(profile.id), getCourseProgress()]);
  return (
    <Section title="Course progress" href="/progress" hrefLabel="Details">
      {courses.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title="No roadmap yet"
          description="Pick a roadmap to see your progress by section."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/roadmaps">Explore roadmaps</Link>
            </Button>
          }
          className="py-8"
        />
      ) : (
        <ul className="space-y-2.5">
          {courses.slice(0, 6).map((c) => {
            const p = progress.get(c.id);
            const pct = p?.percent ?? 0;
            return (
              <li key={c.id}>
                <Link href={`/courses/${c.slug}`} className="group block">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate group-hover:underline">{c.title}</span>
                    <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} aria-label={`${c.title} progress`} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Upcoming class
// ---------------------------------------------------------------------------

export async function UpcomingClassPanel() {
  const cls = await getUpcomingClass();
  const tz = APP_TIME_ZONE;
  return (
    <Section title="Upcoming class" href="/classes" hrefLabel="Schedule">
      {!cls ? (
        <EmptyState icon={Video} title="No upcoming classes" description="New sessions show up here as soon as they're scheduled." className="py-8" />
      ) : (
        <div className={cn("rounded-md border p-3", cls.isLive && "border-destructive/40 bg-destructive/5")}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground">
                {relativeDayLabel(dateInTz(cls.starts_at, tz), todayFor())} · {timeInTz(cls.starts_at, tz)}
                <span className="text-muted-foreground/70"> · {cls.duration_minutes}m</span>
              </p>
              <p className="mt-1 text-sm font-medium">
                {cls.isLive ? "🔴 " : null}
                {cls.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[cls.course?.title, cls.instructor?.full_name].filter(Boolean).join(" · ") || "Open session"}
              </p>
            </div>
            {cls.isLive ? <StatusBadge status="live" /> : null}
          </div>
          <div className="mt-3 flex gap-2">
            {cls.joinable && cls.meeting_url ? (
              <Button asChild size="sm" variant={cls.isLive ? "destructive" : "brand"}>
                <a href={cls.meeting_url} target="_blank" rel="noopener noreferrer">
                  <Video /> Join class
                </a>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link href={`/class/${cls.id}`}>View</Link>
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export async function AnnouncementsPanel() {
  const rows = await getAnnouncements(3);
  return (
    <Section title="Announcements">
      {rows.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements" description="Updates from your instructors will appear here." className="py-8" />
      ) : (
        <ul className="divide-y">
          {rows.map((a) => (
            <li key={a.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-1.5">
                {a.pinned ? <Pin className="size-3 shrink-0 text-brand" aria-label="Pinned" /> : null}
                <p className="truncate text-sm font-medium">{a.title}</p>
              </div>
              {a.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.body}</p> : null}
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {[a.course?.title ?? "Everyone", a.author?.full_name, timeAgo(a.created_at)].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

const ACTIVITY_META: Record<ActivityType, { icon: LucideIcon; verb: string }> = {
  lesson_completed: { icon: BookOpen, verb: "Completed lesson" },
  problem_solved: { icon: Code2, verb: "Solved" },
  class_attended: { icon: Video, verb: "Attended" },
  assignment_submitted: { icon: ClipboardList, verb: "Submitted" },
  roadmap_node_completed: { icon: MapIcon, verb: "Finished topic" },
  course_completed: { icon: GraduationCap, verb: "Completed course" },
  achievement_unlocked: { icon: Award, verb: "Unlocked" },
};

export async function RecentActivityPanel({ profile }: { profile: Profile }) {
  const rows = await getRecentActivity(profile.id, 6);
  return (
    <Section title="Recent activity" href="/progress" hrefLabel="Progress">
      {rows.length === 0 ? (
        <EmptyState icon={History} title="No activity yet" description="Finish a lesson or solve a problem — it'll show up here." className="py-8" />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const meta = ACTIVITY_META[r.type];
            const Icon = meta.icon;
            return (
              <li key={r.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand" aria-hidden>
                  <CircleCheck className="size-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="text-muted-foreground">{meta.verb} </span>
                    {r.title || "—"}
                  </p>
                  <p className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <Icon className="size-3" /> {timeAgo(r.occurred_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Due soon
// ---------------------------------------------------------------------------

export async function DueSoonPanel({ profile }: { profile: Profile }) {
  const rows = await getDueSoon(profile.id, 3);
  const tz = APP_TIME_ZONE;
  const today = todayFor();
  return (
    <Section title="Due soon" href="/assignments" hrefLabel="All assignments">
      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nothing due this week" description="You're all caught up on assignments." className="py-8" />
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => {
            const label = relativeDayLabel(dateInTz(a.due_at, tz), today);
            const urgent = label === "Today" || label === "Tomorrow";
            return (
              <li key={a.id}>
                <Link
                  href={`/assignments/${a.id}`}
                  className="flex items-center gap-3 rounded-md border p-2.5 transition-colors hover:bg-accent/40"
                >
                  <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.course?.title} · {a.points} pts
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <Badge variant={urgent ? "danger" : "outline"} className="font-mono">
                      {label} {timeInTz(a.due_at, tz)}
                    </Badge>
                    {a.status === "in_progress" ? (
                      <span className="mt-1 block text-[11px] text-muted-foreground">Draft saved</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
