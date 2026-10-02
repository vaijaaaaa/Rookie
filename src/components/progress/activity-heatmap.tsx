import { formatISODate } from "@/components/agenda/tz";
import { cn } from "@/lib/utils";
import type { ActivityCalendar } from "@/services/progress";

const LEVELS = ["bg-muted", "bg-brand/25", "bg-brand/50", "bg-brand/75", "bg-brand"] as const;

function level(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

/** GitHub-style contribution grid — pure server-rendered CSS grid. */
export function ActivityHeatmap({ calendar }: { calendar: ActivityCalendar }) {
  const months = calendar.weeks.map((col, i) => {
    const first = col[0]!.date;
    const prev = i > 0 ? calendar.weeks[i - 1]![0]!.date : null;
    return !prev || prev.slice(5, 7) !== first.slice(5, 7) ? formatISODate(first, { month: "short" }) : "";
  });

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-grid grid-cols-[auto_1fr] gap-x-2">
          <div />
          <div className="grid auto-cols-[12px] grid-flow-col gap-[3px] font-mono text-[10px] text-muted-foreground">
            {months.map((m, i) => (
              <span key={i} className="h-4 overflow-visible whitespace-nowrap">
                {m}
              </span>
            ))}
          </div>
          <div className="grid grid-rows-7 gap-[3px] font-mono text-[10px] leading-[12px] text-muted-foreground">
            {DAY_LABELS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div
            className="grid auto-cols-[12px] grid-flow-col grid-rows-7 gap-[3px]"
            role="img"
            aria-label={`${calendar.total} activities across ${calendar.activeDays} active days in the last ${calendar.weeks.length} weeks`}
          >
            {calendar.weeks.flatMap((col) =>
              col.map((cell) => (
                <span
                  key={cell.date}
                  title={
                    cell.future
                      ? undefined
                      : `${cell.count} ${cell.count === 1 ? "activity" : "activities"} · ${formatISODate(cell.date, { weekday: "short", month: "short", day: "numeric" })}`
                  }
                  className={cn(
                    "size-3 rounded-[3px]",
                    cell.future ? "bg-transparent" : LEVELS[level(cell.count)],
                    cell.date === calendar.today && "ring-1 ring-foreground/40",
                  )}
                />
              )),
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span>
          {calendar.total} activities · {calendar.activeDays} active days
        </span>
        <span className="flex items-center gap-1">
          Less
          {LEVELS.map((c) => (
            <span key={c} className={cn("size-2.5 rounded-[2px]", c)} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
