import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { AgendaItemForm, type AgendaFormOptions } from "@/components/instructor/agenda-item-form";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { requireStaff } from "@/services/instructor/context";
import { getCourseOptions, getLessonOptions } from "@/services/instructor/scope";
import { dateInTz, DAY, nowIso, trimClock } from "@/services/instructor/time";
import { formatDate } from "@/lib/utils/format";
import type { AgendaItem, DailyAgenda } from "@/types";
import { deleteAgenda, deleteAgendaItem } from "./actions";

export const metadata = { title: "Cohort agendas" };

type AgendaRow = DailyAgenda & { courses: { title: string } | null; agenda_items: AgendaItem[] };

export default async function AgendasPage() {
  const ctx = await requireStaff();
  const today = dateInTz(ctx.profile.timezone || "UTC", new Date());
  const courses = await getCourseOptions(ctx);
  const courseIds = courses.map((c) => c.id);

  const [agendasRes, lessons, classesRes, assignmentsRes, problemsRes] = await Promise.all([
    courseIds.length
      ? ctx.supabase
          .from("daily_agendas")
          .select("*, courses(title), agenda_items(*)")
          .in("course_id", courseIds)
          .gte("date", today)
          .order("date")
          .limit(30)
          .overrideTypes<AgendaRow[], { merge: false }>()
      : Promise.resolve({ data: [] as AgendaRow[] }),
    getLessonOptions(ctx, courseIds),
    courseIds.length
      ? ctx.supabase.from("classes").select("id, title, course_id, starts_at").in("course_id", courseIds)
          .gte("starts_at", nowIso(-DAY)).order("starts_at").limit(200)
          .overrideTypes<AgendaFormOptions["classes"], { merge: false }>()
      : Promise.resolve({ data: [] as AgendaFormOptions["classes"] }),
    courseIds.length
      ? ctx.supabase.from("assignments").select("id, title, course_id").in("course_id", courseIds).order("due_at", { ascending: false }).limit(200)
          .overrideTypes<AgendaFormOptions["assignments"], { merge: false }>()
      : Promise.resolve({ data: [] as AgendaFormOptions["assignments"] }),
    ctx.supabase.from("coding_problems").select("id, title").eq("is_published", true).order("title").limit(500)
      .overrideTypes<AgendaFormOptions["problems"], { merge: false }>(),
  ]);

  const options: AgendaFormOptions = {
    courses,
    lessons,
    classes: classesRes.data ?? [],
    assignments: assignmentsRes.data ?? [],
    problems: problemsRes.data ?? [],
  };
  const agendas = agendasRes.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Teaching"
        title="Cohort agendas"
        description="Plan the day for everyone in a course. Items appear on each enrolled student's agenda, and each student completes them individually."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border bg-card p-4 lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Add an item</h2>
          <AgendaItemForm options={options} defaultDate={today} />
        </section>
        <section className="space-y-4">
          {agendas.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming cohort agendas" description="Items you add show up here, grouped by course and day." />
          ) : (
            agendas.map((a) => {
              const items = [...a.agenda_items].sort((x, y) => (x.start_time ?? "99").localeCompare(y.start_time ?? "99"));
              return (
                <article key={a.id} className="rounded-lg border bg-card">
                  <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.courses?.title}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {a.date === today ? "Today" : formatDate(`${a.date}T12:00:00`, "EEE, MMM d")}
                        {a.title ? ` · ${a.title}` : ""}
                      </p>
                    </div>
                    <ConfirmAction
                      action={deleteAgenda.bind(null, a.id)}
                      title="Delete this whole day?"
                      description="All items and student check-offs for this day are removed."
                      successMessage="Agenda deleted"
                    />
                  </header>
                  {items.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No items.</p>
                  ) : (
                    <ul className="divide-y">
                      {items.map((i) => (
                        <li key={i.id} className="flex items-start gap-3 px-4 py-2.5">
                          <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                            {i.start_time ? `${trimClock(i.start_time)}${i.end_time ? `–${trimClock(i.end_time)}` : ""}` : "anytime"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{i.title}</p>
                            {i.description ? <p className="text-xs text-muted-foreground">{i.description}</p> : null}
                          </div>
                          <Badge variant="outline" className="capitalize">{i.type}</Badge>
                          <ConfirmAction action={deleteAgendaItem.bind(null, i.id)} title="Remove this item?" successMessage="Item removed" />
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
