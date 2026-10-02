import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageSquareText } from "lucide-react";
import { APP_TIME_ZONE, dateInTz, formatISODate } from "@/components/agenda/tz";
import { DailyQuestionForm } from "@/components/daily/question-form";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { LocalTime } from "@/components/instructor/local-time";
import { EmptyState } from "@/components/shared/empty-state";
import { Markdown } from "@/components/shared/markdown";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { requireStaff } from "@/services/instructor/context";
import { deleteDailyQuestion } from "../actions";

export const metadata = { title: "Daily question" };

type Question = { id: string; question_date: string; title: string; body: string };
type Answer = {
  id: string;
  content: string;
  updated_at: string;
  profile: { full_name: string; username: string | null } | null;
};

export default async function AdminDailyQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, ctx] = await Promise.all([params, requireStaff()]);
  const { data: question } = await ctx.supabase
    .from("daily_questions")
    .select("id, question_date, title, body")
    .eq("id", id)
    .maybeSingle<Question>();
  if (!question) notFound();

  const { data } = await ctx.supabase
    .from("daily_question_answers")
    .select("id, content, updated_at, profile:profiles!daily_question_answers_user_id_fkey(full_name, username)")
    .eq("question_id", id)
    .order("created_at", { ascending: true })
    .limit(500)
    .overrideTypes<Answer[], { merge: false }>();
  const answers = data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/daily" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Daily questions
      </Link>
      <PageHeader
        eyebrow={formatISODate(question.question_date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        title={question.title}
        actions={
          <ConfirmAction
            action={deleteDailyQuestion.bind(null, question.id)}
            title="Delete this question?"
            description={`This also deletes ${answers.length} student answer${answers.length === 1 ? "" : "s"}. This can't be undone.`}
            successMessage="Question deleted"
            redirectTo="/admin/daily"
          />
        }
      />

      <Section title="Edit question" contentClassName="p-4">
        <DailyQuestionForm initial={question} defaultDate={dateInTz(new Date(), APP_TIME_ZONE)} />
      </Section>

      <Section title={`Answers · ${answers.length}`} contentClassName="p-0">
        {answers.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="No answers yet" description="Student answers show up here as they're saved." className="border-0" />
        ) : (
          <ul className="divide-y">
            {answers.map((a) => (
              <li key={a.id} className="px-4 py-4">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">
                    {a.profile?.full_name || "Student"}
                    {a.profile?.username ? <span className="ml-1.5 font-mono text-xs text-muted-foreground">@{a.profile.username}</span> : null}
                  </p>
                  <LocalTime value={a.updated_at} format="short" className="shrink-0 font-mono text-[11px] text-muted-foreground" />
                </div>
                <Markdown className="text-sm">{a.content}</Markdown>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
