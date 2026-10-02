import Link from "next/link";
import { formatISODate } from "@/components/agenda/tz";
import { cn } from "@/lib/utils";
import type { DailyTrack as Track, TrackDayState } from "@/services/daily-questions";

const STATE: Record<TrackDayState, { label: string; cell: string }> = {
  answered: { label: "Answered", cell: "bg-brand border-brand" },
  open: { label: "Open today", cell: "border-brand bg-brand/15" },
  missed: { label: "Missed", cell: "bg-destructive/25 border-destructive/40" },
  none: { label: "No question", cell: "bg-muted/40" },
};

/** Last 30 days as a strip of squares, plus streak numbers. */
export function DailyTrack({ track, selected }: { track: Track; selected?: string }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-2">
        {[
          ["Streak", `${track.streak}`, track.streak === 1 ? "day" : "days"],
          ["Best", `${track.longest}`, track.longest === 1 ? "day" : "days"],
          ["Answered", `${track.answered}`, `of ${track.asked}`],
        ].map(([label, value, unit]) => (
          <div key={label} className="rounded-md border px-3 py-2">
            <dt className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="mb-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Last 30 days</p>
        <ol className="grid grid-cols-10 gap-1.5">
          {track.days.map((d) => {
            const label = `${formatISODate(d.date, { weekday: "short", month: "short", day: "numeric" })}: ${STATE[d.state].label}`;
            const cell = (
              <span
                className={cn(
                  "block aspect-square rounded-[4px] border border-transparent transition-transform",
                  STATE[d.state].cell,
                  d.date === selected && "ring-2 ring-foreground/60 ring-offset-1 ring-offset-card",
                )}
              />
            );
            return (
              <li key={d.date} title={label}>
                {d.state === "none" ? (
                  <span aria-label={label}>{cell}</span>
                ) : (
                  <Link href={`/daily?date=${d.date}`} aria-label={label} className="block rounded-[4px] hover:scale-110 focus-visible:outline-2">
                    {cell}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {(Object.keys(STATE) as TrackDayState[]).map((s) => (
            <li key={s} className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <span className={cn("size-2.5 rounded-[3px] border border-transparent", STATE[s].cell)} aria-hidden />
              {STATE[s].label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
