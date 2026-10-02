import Link from "next/link";
import { ChevronRight, Lightbulb } from "lucide-react";
import { APP_TIME_ZONE, dateInTz, formatISODate } from "@/components/agenda/tz";
import { DailyQuestionForm } from "@/components/daily/question-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/services/instructor/context";

export const metadata = { title: "Daily questions" };

type Row = { id: string; question_date: string; title: string; daily_question_answers: { count: number }[] };

export default async function AdminDailyPage() {
  const ctx = await requireStaff();
  const today = dateInTz(new Date(), APP_TIME_ZONE);
  const [{ data }, { count: students }] = await Promise.all([
    ctx.supabase
      .from("daily_questions")
      .select("id, question_date, title, daily_question_answers(count)")
      .order("question_date", { ascending: false })
      .limit(120)
      .overrideTypes<Row[], { merge: false }>(),
    ctx.supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
  ]);
  const items = data ?? [];
  const hasToday = items.some((q) => q.question_date === today);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Practice"
        title="Daily questions"
        description="Post one question per day. Students see it on their Daily question tab from that day (IST) and answer it like a note."
      />

      <Section title={hasToday ? "Post a question" : "Post today's question"} contentClassName="p-4">
        <DailyQuestionForm defaultDate={today} />
      </Section>

      <Section title="All questions" contentClassName="p-0">
        {items.length === 0 ? (
          <EmptyState icon={Lightbulb} title="No questions yet" description="Paste your first daily question above." className="border-0" />
        ) : (
          <ul className="divide-y">
            {items.map((q) => {
              const answers = q.daily_question_answers[0]?.count ?? 0;
              const status = q.question_date === today ? "Today" : q.question_date > today ? "Scheduled" : null;
              return (
                <li key={q.id}>
                  <Link href={`/admin/daily/${q.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
                    <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                      {formatISODate(q.question_date, { month: "short", day: "numeric" })}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{q.title}</span>
                    {status ? <Badge variant={status === "Today" ? "default" : "outline"}>{status}</Badge> : null}
                    <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                      {answers}
                      {students ? `/${students}` : ""} answered
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
