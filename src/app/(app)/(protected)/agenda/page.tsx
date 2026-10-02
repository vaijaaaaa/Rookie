import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AgendaDay } from "@/components/agenda/agenda-day";
import { DayNavigator, WeekStrip } from "@/components/agenda/day-navigator";
import { formatISODate, isISODate, relativeDayLabel } from "@/components/agenda/tz";
import { requireProfile } from "@/lib/auth/session";
import { getAgendaFormOptions, getDayAgenda, getWeekMarkers, todayFor } from "@/services/agenda";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const today = todayFor();
  const requested = Array.isArray(sp.date) ? sp.date[0] : sp.date;
  const date = isISODate(requested) ? requested : today;

  const [day, week, options] = await Promise.all([
    getDayAgenda(profile, date),
    getWeekMarkers(profile, date),
    getAgendaFormOptions(profile.id),
  ]);

  const label = relativeDayLabel(date, today);
  const long = formatISODate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={<span>Daily agenda · {day.timezone}</span>}
        title={label === "Today" || label === "Tomorrow" || label === "Yesterday" ? label : formatISODate(date, { weekday: "long" })}
        description={<span className="font-mono text-xs">{long}</span>}
        actions={<DayNavigator date={date} today={today} />}
      />
      <div className="space-y-4">
        <WeekStrip date={date} today={today} weekStart={week.from} markedDays={week.days} />
        <AgendaDay key={date} date={date} entries={day.entries} options={options} isPast={date < today} />
      </div>
    </div>
  );
}
