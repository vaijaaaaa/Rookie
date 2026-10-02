import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

export type CalendarStatus = AttendanceStatus | "scheduled" | "unmarked";

export interface CalendarEntry {
  classId: string;
  title: string;
  startsAt: string;
  status: CalendarStatus;
}

export const CALENDAR_STATUS: Record<CalendarStatus, { label: string; dot: string; cell: string }> = {
  present: { label: "Present", dot: "bg-success", cell: "bg-success/10 border-success/30" },
  late: { label: "Late", dot: "bg-warning", cell: "bg-warning/10 border-warning/30" },
  absent: { label: "Absent", dot: "bg-destructive", cell: "bg-destructive/10 border-destructive/30" },
  excused: { label: "Excused", dot: "bg-info", cell: "bg-info/10 border-info/30" },
  unmarked: { label: "Not marked", dot: "bg-muted-foreground/50", cell: "border-dashed" },
  scheduled: { label: "Scheduled", dot: "ring-1 ring-muted-foreground/60 bg-transparent", cell: "" },
};

/** Most important status wins the cell tint when a day has several classes. */
const SEVERITY: CalendarStatus[] = ["absent", "late", "unmarked", "excused", "present", "scheduled"];

const WEEK_STARTS_ON = 1; // Monday

/** Parse ?month=YYYY-MM (falls back to the given default month). */
export function parseMonth(v: string | string[] | undefined, fallback: Date): Date {
  const s = Array.isArray(v) ? v[0] : v;
  const m = s?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!m) return startOfMonth(fallback);
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}

export function monthKey(d: Date) {
  return format(d, "yyyy-MM");
}

export function AttendanceCalendar({
  month,
  entriesByDay,
  hrefFor,
  today,
}: {
  month: Date;
  /** Current date (passed in so rendering stays pure). */
  today: Date;
  /** keyed by yyyy-MM-dd (local) */
  entriesByDay: Map<string, CalendarEntry[]>;
  hrefFor: (month: Date) => string;
}) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });
  const weeks: Date[][] = [];
  for (let d = gridStart; d <= gridEnd; ) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(d);
      d = addDays(d, 1);
    }
    weeks.push(week);
  }
  const weekdayLabels = weeks[0]!.map((d) => ({ short: format(d, "EEEEE"), long: format(d, "EEEE"), mid: format(d, "EEE") }));
  const title = format(month, "MMMM yyyy");
  const usedStatuses = new Set<CalendarStatus>();
  for (const list of entriesByDay.values()) for (const e of list) usedStatuses.add(e.status);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium" id="attendance-calendar-title">
          {title}
        </h3>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={hrefFor(addMonths(month, -1))} scroll={false} aria-label="Previous month">
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="font-mono text-xs">
            <Link href={hrefFor(today)} scroll={false}>
              Today
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={hrefFor(addMonths(month, 1))} scroll={false} aria-label="Next month">
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-1" aria-labelledby="attendance-calendar-title">
        <thead>
          <tr>
            {weekdayLabels.map((w) => (
              <th
                key={w.long}
                scope="col"
                abbr={w.long}
                className="pb-1 text-center font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                <span className="sm:hidden">{w.short}</span>
                <span className="hidden sm:inline">{w.mid}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]!.toISOString()}>
              {week.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, month);
                const entries = inMonth ? (entriesByDay.get(key) ?? []) : [];
                const top = SEVERITY.find((s) => entries.some((e) => e.status === s));
                const isCurrentDay = isSameDay(day, today);
                return (
                  <td key={key} className="p-0 align-top">
                    <div
                      className={cn(
                        "flex h-12 flex-col justify-between rounded-md border border-transparent p-1 sm:h-16 sm:p-1.5",
                        inMonth ? "bg-muted/20" : "opacity-30",
                        top && CALENDAR_STATUS[top].cell,
                        top && "border",
                        isCurrentDay && "ring-1 ring-brand",
                      )}
                      title={entries.map((e) => `${e.title} — ${CALENDAR_STATUS[e.status].label}`).join("\n") || undefined}
                    >
                      <span
                        className={cn(
                          "font-mono text-[11px] tabular-nums",
                          isCurrentDay ? "font-semibold text-brand" : "text-muted-foreground",
                        )}
                      >
                        <time dateTime={key}>{format(day, "d")}</time>
                      </span>
                      {entries.length > 0 ? (
                        <span className="flex flex-wrap gap-0.5" aria-hidden>
                          {entries.slice(0, 4).map((e) => (
                            <span key={e.classId} className={cn("size-1.5 rounded-full sm:size-2", CALENDAR_STATUS[e.status].dot)} />
                          ))}
                        </span>
                      ) : null}
                      {entries.length > 0 ? (
                        <span className="sr-only">
                          {entries.map((e) => `${e.title}: ${CALENDAR_STATUS[e.status].label}`).join("; ")}
                        </span>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legend">
        {(Object.keys(CALENDAR_STATUS) as CalendarStatus[]).map((s) => (
          <li
            key={s}
            className={cn(
              "flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground",
              !usedStatuses.has(s) && "opacity-60",
            )}
          >
            <span className={cn("size-2 rounded-full", CALENDAR_STATUS[s].dot)} aria-hidden />
            {CALENDAR_STATUS[s].label}
          </li>
        ))}
      </ul>
    </div>
  );
}
