import Link from "next/link";
import { Clock, PlayCircle } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { formatTime, relativeDay } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { ClassListItem } from "@/services/classes";
import type { AttendanceStatus } from "@/types";
import { isClassLive, isClassPast } from "./class-time";
import { JoinClassButton } from "./join-class-button";

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function ClassCard({
  item,
  now,
  attendance,
  linkable = true,
  showDate = true,
}: {
  item: ClassListItem;
  now: number;
  /** Signed-in user's attendance for past classes; undefined = don't show. null = no record. */
  attendance?: AttendanceStatus | null;
  /** Visitors can't open class details (protected route). */
  linkable?: boolean;
  showDate?: boolean;
}) {
  const live = isClassLive(item, now);
  const past = isClassPast(item, now);
  const status = live ? "live" : item.status;
  const titleId = `class-${item.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center",
        live && "border-brand/40",
        item.status === "cancelled" && "opacity-70",
      )}
    >
      <div className="flex w-full shrink-0 items-baseline gap-2 font-mono text-xs text-muted-foreground sm:w-28 sm:flex-col sm:items-start sm:gap-0.5">
        {showDate ? <span className="text-foreground">{relativeDay(item.starts_at)}</span> : null}
        <time dateTime={item.starts_at} className={cn(!showDate && "text-sm text-foreground")}>
          {formatTime(item.starts_at)}
        </time>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" aria-hidden />
          <span className="sr-only">Duration</span>
          {formatDuration(item.duration_minutes)}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={titleId} className="truncate text-sm font-medium">
            {linkable ? (
              <Link href={`/class/${item.id}`} className="hover:underline focus-visible:underline">
                {item.title}
              </Link>
            ) : (
              item.title
            )}
          </h3>
          <StatusBadge status={status} />
          {past && attendance !== undefined ? (
            attendance ? (
              <StatusBadge status={attendance} />
            ) : (
              <span className="font-mono text-[11px] text-muted-foreground">No attendance record</span>
            )
          ) : null}
        </div>
        {item.course || item.module ? (
          <p className="truncate text-xs text-muted-foreground">
            {item.course ? (
              <Link href={`/courses/${item.course.slug}`} className="hover:text-foreground">
                {item.course.title}
              </Link>
            ) : null}
            {item.course && item.module ? <span aria-hidden> / </span> : null}
            {item.module ? <span>{item.module.title}</span> : null}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Open session</p>
        )}
        {item.instructor ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserAvatar name={item.instructor.full_name} src={item.instructor.avatar_url} className="size-5 text-[9px]" />
            <span>{item.instructor.full_name}</span>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!past ? (
          <JoinClassButton
            starts_at={item.starts_at}
            duration_minutes={item.duration_minutes}
            status={item.status}
            meeting_url={item.meeting_url}
            serverNow={now}
            size="sm"
            onlyWhenOpen
          />
        ) : null}
        {item.recording_url ? (
          <Button asChild variant="outline" size="sm">
            <a href={item.recording_url} target="_blank" rel="noopener noreferrer">
              <PlayCircle />
              Recording
              <span className="sr-only">for {item.title} (opens in a new tab)</span>
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
