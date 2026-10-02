import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, History, Radio, Video } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ClassCard } from "@/components/classes/class-card";
import { LinkTabs } from "@/components/classes/class-tabs";
import { getProfile } from "@/lib/auth/session";
import { relativeDay, toISODate } from "@/lib/utils/format";
import {
  getMyAttendanceFor,
  isClassPast,
  listClasses,
  parseClassTab,
  type ClassListItem,
  type ClassTab,
} from "@/services/classes";

export const metadata: Metadata = {
  title: "Live classes",
  description: "Upcoming, live and recorded classes with Rookie instructors.",
};

const TAB_LABELS: Record<ClassTab, string> = {
  upcoming: "Upcoming",
  live: "Live",
  previous: "Previous",
  recorded: "Recorded",
};

const EMPTY: Record<ClassTab, { icon: typeof Video; title: string; description: string }> = {
  upcoming: {
    icon: CalendarClock,
    title: "No upcoming classes",
    description: "When instructors schedule classes for your courses, they'll show up here.",
  },
  live: { icon: Radio, title: "Nothing live right now", description: "Check the Upcoming tab for the next session." },
  previous: { icon: History, title: "No past classes yet", description: "Classes you've had appear here with your attendance." },
  recorded: { icon: Video, title: "No recordings yet", description: "Recordings are added after a class ends." },
};

function groupByDay(items: ClassListItem[]) {
  const groups = new Map<string, ClassListItem[]>();
  for (const c of items) {
    const key = toISODate(new Date(c.starts_at));
    const list = groups.get(key);
    if (list) list.push(c);
    else groups.set(key, [c]);
  }
  return [...groups.entries()];
}

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const [profile, sp] = await Promise.all([getProfile(), searchParams]);
  const tab: ClassTab = profile ? parseClassTab(sp.tab) : "upcoming";
  const { classes, now } = await listClasses(tab);

  const pastIds = profile ? classes.filter((c) => isClassPast(c, now)).map((c) => c.id) : [];
  const attendance = profile ? await getMyAttendanceFor(profile.id, pastIds) : null;
  const attendanceOf = (c: ClassListItem) =>
    attendance && isClassPast(c, now) ? (attendance.get(c.id)?.status ?? null) : undefined;

  const empty = EMPTY[tab];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Classes"
        title={profile ? "Your classes" : "Live classes"}
        description={
          profile
            ? "Live sessions for the courses you're enrolled in, plus open sessions."
            : "Join instructor-led sessions on CS fundamentals, DSA and full-stack development."
        }
        actions={
          profile ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/attendance">My attendance</Link>
            </Button>
          ) : null
        }
      />

      {profile ? (
        <LinkTabs
          label="Class views"
          active={tab}
          tabs={(Object.keys(TAB_LABELS) as ClassTab[]).map((t) => ({
            value: t,
            label: TAB_LABELS[t],
            href: t === "upcoming" ? "/classes" : `/classes?tab=${t}`,
          }))}
        />
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Want a seat in these classes?</p>
            <p className="text-sm text-muted-foreground">
              Create a free account, enroll in a course and get meeting links, recordings and attendance tracking.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="brand" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      )}

      <section aria-label={`${TAB_LABELS[tab]} classes`}>
        {classes.length === 0 ? (
          <EmptyState
            icon={empty.icon}
            title={empty.title}
            description={empty.description}
            action={
              tab !== "upcoming" ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/classes">See upcoming</Link>
                </Button>
              ) : !profile ? (
                <Button asChild variant="brand" size="sm">
                  <Link href="/courses">Browse courses</Link>
                </Button>
              ) : null
            }
          />
        ) : tab === "upcoming" ? (
          <div className="space-y-6">
            {groupByDay(classes).map(([day, items]) => (
              <section key={day} aria-labelledby={`day-${day}`} className="space-y-2">
                <h2
                  id={`day-${day}`}
                  className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
                >
                  <span className="text-foreground">{relativeDay(items[0]!.starts_at)}</span>
                  <time dateTime={day}>{day}</time>
                  <span>· {items.length} {items.length === 1 ? "class" : "classes"}</span>
                </h2>
                <div className="space-y-2">
                  {items.map((c) => (
                    <ClassCard key={c.id} item={c} now={now} linkable={!!profile} showDate={false} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {classes.map((c) => (
              <ClassCard key={c.id} item={c} now={now} attendance={attendanceOf(c)} linkable={!!profile} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
