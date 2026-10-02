import Link from "next/link";
import { ArrowRight, Video } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/utils/format";
import type { LandingClass } from "./data";
import { LandingSection, SectionHeading } from "./section-heading";

export function UpcomingClasses({ classes }: { classes: LandingClass[] }) {
  return (
    <LandingSection labelledBy="classes-title">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading
          id="classes-title"
          eyebrow="Live classes"
          title="Learn it live, then make it yours."
          description="Instructors teach each module in a live session. Recordings, agendas and resources stay attached to the class afterwards, and attendance is tracked for you."
          className="mb-0 sm:flex-col sm:items-start"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/classes">
                Class schedule <ArrowRight />
              </Link>
            </Button>
          }
        />
        {classes.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No classes scheduled right now"
            description="New sessions appear here as soon as instructors schedule them."
          />
        ) : (
          <ol className="divide-y rounded-lg border bg-card">
            {classes.map((c) => (
              <li key={c.id} className="flex gap-4 p-4">
                <div className="w-14 shrink-0 text-center">
                  <p className="font-mono text-[11px] uppercase text-muted-foreground">{formatDate(c.starts_at, "MMM")}</p>
                  <p className="text-2xl font-semibold tabular-nums leading-tight">{formatDate(c.starts_at, "d")}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{formatDate(c.starts_at, "EEE")}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-medium">{c.title}</h3>
                    {c.status === "live" ? <StatusBadge status="live" /> : null}
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    <time dateTime={c.starts_at}>{formatTime(c.starts_at)}</time> · {c.duration_minutes} min
                    {c.course_title ? <> · {c.course_title}</> : null}
                  </p>
                  {c.instructor_name ? (
                    <p className="mt-1 text-xs text-muted-foreground">with {c.instructor_name}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </LandingSection>
  );
}
