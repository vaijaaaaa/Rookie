import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, CircleDashed, Lightbulb } from "lucide-react";
import { formatISODate, isISODate } from "@/components/agenda/tz";
import { AnswerEditor } from "@/components/daily/answer-editor";
import { DailyTrack } from "@/components/daily/daily-track";
import { EmptyState } from "@/components/shared/empty-state";
import { Markdown } from "@/components/shared/markdown";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { requireProfile } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { buildTrack, getDailyHistory, getDailyQuestion, getMyAnswer } from "@/services/daily-questions";

export const metadata: Metadata = {
  title: "Daily question",
  description: "One question a day. Answer it, keep the streak.",
};

const longDate = (iso: string) => formatISODate(iso, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export default async function DailyPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const [profile, sp] = await Promise.all([requireProfile(), searchParams]);
  const { today, questions } = await getDailyHistory(profile.id);
  const raw = Array.isArray(sp.date) ? sp.date[0] : sp.date;
  const date = isISODate(raw) && raw <= today ? raw : today;
  const isToday = date === today;

  const question = await getDailyQuestion(date);
  const answer = question ? await getMyAnswer(profile.id, question.id) : null;
  const track = buildTrack(today, questions);
  const past = questions.filter((q) => q.question_date !== date).slice(0, 20);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={<span>Daily question · {isToday ? "Today" : formatISODate(date, { month: "short", day: "numeric" })} · IST</span>}
        title="Daily question"
        description="One question a day. Write your answer like a note — it's saved to your track."
        actions={
          !isToday ? (
            <Link href="/daily" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" /> Back to today
            </Link>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {question ? (
            <>
              <article className="rounded-lg border bg-card">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
                  <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">{longDate(date)}</p>
                  {answer ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-success">
                      <CheckCircle2 className="size-3.5" /> Answered
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <CircleDashed className="size-3.5" /> {isToday ? "Open" : "Not answered"}
                    </span>
                  )}
                </header>
                <div className="px-5 py-5">
                  <h2 className="text-xl font-semibold tracking-tight">{question.title}</h2>
                  {question.body.trim() ? <Markdown className="mt-4">{question.body}</Markdown> : null}
                </div>
              </article>

              <Section title="Your answer" contentClassName="p-4">
                <AnswerEditor
                  key={question.id}
                  questionId={question.id}
                  initialContent={answer?.content ?? ""}
                  initialUpdatedAt={answer?.updated_at ?? null}
                />
              </Section>
            </>
          ) : (
            <EmptyState
              icon={Lightbulb}
              title={isToday ? "No question today yet" : "No question on this day"}
              description={isToday ? "Check back later — your admin posts a new question each day." : "Pick another day from your track."}
            />
          )}
        </div>

        <aside className="space-y-6">
          <Section title="Your track" contentClassName="p-4">
            <DailyTrack track={track} selected={date} />
          </Section>

          <Section title="Past questions" contentClassName="p-0">
            {past.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">Earlier questions will show up here.</p>
            ) : (
              <ul className="divide-y">
                {past.map((q) => (
                  <li key={q.id}>
                    <Link href={q.question_date === today ? "/daily" : `/daily?date=${q.question_date}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40">
                      <span
                        className={cn("size-2 shrink-0 rounded-full", q.answered ? "bg-brand" : "bg-muted-foreground/30")}
                        aria-label={q.answered ? "Answered" : "Not answered"}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{q.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {formatISODate(q.question_date, { month: "short", day: "numeric" })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}
