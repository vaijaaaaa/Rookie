import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addDays, formatISODate } from "./tz";

const href = (d: string) => `/agenda?date=${d}`;

/** Prev / Today / Next controls. */
export function DayNavigator({ date, today }: { date: string; today: string }) {
  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="outline" size="icon-sm" aria-label="Previous day">
        <Link href={href(addDays(date, -1))} scroll={false}>
          <ChevronLeft />
        </Link>
      </Button>
      <Button asChild variant={date === today ? "secondary" : "outline"} size="sm" className="h-8">
        <Link href="/agenda" scroll={false} aria-current={date === today ? "date" : undefined}>
          Today
        </Link>
      </Button>
      <Button asChild variant="outline" size="icon-sm" aria-label="Next day">
        <Link href={href(addDays(date, 1))} scroll={false}>
          <ChevronRight />
        </Link>
      </Button>
    </div>
  );
}

/** Mon–Sun strip with dots for days that have something scheduled. */
export function WeekStrip({
  date,
  today,
  weekStart,
  markedDays,
}: {
  date: string;
  today: string;
  weekStart: string;
  markedDays: string[];
}) {
  const marked = new Set(markedDays);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <nav aria-label="Week" className="flex items-stretch gap-1 rounded-lg border bg-card p-1">
      <Link
        href={href(addDays(weekStart, -7))}
        scroll={false}
        className="hidden items-center rounded-md px-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:flex"
        aria-label="Previous week"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <ol className="grid flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const selected = d === date;
          const isToday = d === today;
          return (
            <li key={d}>
              <Link
                href={href(d)}
                scroll={false}
                aria-current={selected ? "date" : undefined}
                aria-label={`${formatISODate(d, { weekday: "long", month: "long", day: "numeric" })}${marked.has(d) ? ", has items" : ""}`}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md py-1.5 transition-colors",
                  selected ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <span className="font-mono text-[10px] uppercase tracking-wider">
                  {formatISODate(d, { weekday: "short" })}
                </span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums",
                    isToday && "bg-brand text-brand-foreground",
                  )}
                >
                  {Number(d.slice(8))}
                </span>
                <span
                  className={cn("size-1 rounded-full", marked.has(d) ? "bg-brand" : "bg-transparent")}
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ol>
      <Link
        href={href(addDays(weekStart, 7))}
        scroll={false}
        className="hidden items-center rounded-md px-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:flex"
        aria-label="Next week"
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
