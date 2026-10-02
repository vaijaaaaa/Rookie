import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarCheck, Code2, Flame, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { ActivityHeatmap } from "@/components/progress/activity-heatmap";
import { BarRow } from "@/components/progress/bar-row";
import { WeeklyChart } from "@/components/progress/weekly-chart";
import { requireProfile } from "@/lib/auth/session";
import { percent } from "@/lib/utils";
import {
  getActivityCalendar,
  getEnrolledCourseProgress,
  getMyStats,
  getProblemTotals,
  getTopicProgress,
} from "@/services/progress";
import type { CodeLanguage, ProblemDifficulty } from "@/types";

export const metadata: Metadata = { title: "Progress" };

const DIFFICULTY: { key: ProblemDifficulty; label: string; bar: string }[] = [
  { key: "easy", label: "Easy", bar: "bg-success" },
  { key: "medium", label: "Medium", bar: "bg-warning" },
  { key: "hard", label: "Hard", bar: "bg-destructive" },
];

const LANGUAGE_LABEL: Record<CodeLanguage, string> = { java: "Java", javascript: "JavaScript", python: "Python" };

export default async function ProgressPage() {
  const profile = await requireProfile();
  const [stats, totals, topics, calendar, courses] = await Promise.all([
    getMyStats(),
    getProblemTotals(),
    getTopicProgress(),
    getActivityCalendar(profile),
    getEnrolledCourseProgress(profile.id),
  ]);

  const totalProblems = totals.easy + totals.medium + totals.hard;
  const attendancePct = percent(stats.classes_attended, stats.classes_total);
  const languages = (Object.entries(stats.language_usage) as [CodeLanguage, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalSubmissions = languages.reduce((s, [, n]) => s + n, 0);
  const activeTopics = topics.filter((t) => t.total > 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Learning analytics"
        title="Progress"
        description="Your coding practice, lessons, streaks and attendance in one place."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Problems solved"
          value={
            <>
              {stats.problems_solved}
              <span className="text-base font-normal text-muted-foreground"> / {totalProblems}</span>
            </>
          }
          hint={`${stats.problems_attempted} attempted`}
          icon={Code2}
        />
        <StatCard label="Lessons completed" value={stats.lessons_completed} hint={`${stats.courses_completed} courses finished`} icon={BookOpen} />
        <StatCard
          label="Current streak"
          value={
            <>
              {stats.current_streak}
              <span className="text-base font-normal text-muted-foreground"> days</span>
            </>
          }
          hint={`Longest: ${stats.longest_streak} days${stats.active_today ? " · active today" : ""}`}
          icon={Flame}
        />
        <StatCard
          label="Attendance"
          value={stats.classes_total ? `${attendancePct}%` : "—"}
          hint={stats.classes_total ? `${stats.classes_attended} of ${stats.classes_total} classes` : "No classes recorded yet"}
          icon={CalendarCheck}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Activity · last 12 weeks" className="lg:col-span-2" contentClassName="p-4">
          <ActivityHeatmap calendar={calendar} />
        </Section>

        <Section title="Problems by difficulty" href="/practice" hrefLabel="Practice">
          {totalProblems === 0 ? (
            <EmptyState icon={Code2} title="No problems published yet" className="py-6" />
          ) : (
            <div className="space-y-3">
              {DIFFICULTY.map((d) => (
                <BarRow
                  key={d.key}
                  label={d.label}
                  value={stats.solved_by_difficulty[d.key] ?? 0}
                  total={totals[d.key]}
                  indicatorClassName={d.bar}
                />
              ))}
              <p className="pt-1 font-mono text-[11px] text-muted-foreground">
                {percent(stats.problems_solved, totalProblems)}% of all problems solved
              </p>
            </div>
          )}
        </Section>

        <Section title="Weekly learning · last 8 weeks" className="lg:col-span-2">
          {calendar.weekly.every((w) => w.count === 0) ? (
            <EmptyState
              icon={LineChart}
              title="No activity in the last 8 weeks"
              description="Complete lessons, solve problems and attend classes to fill this chart."
              className="py-8"
            />
          ) : (
            <WeeklyChart data={calendar.weekly} />
          )}
        </Section>

        <Section title="Language usage">
          {languages.length === 0 ? (
            <EmptyState icon={Code2} title="No submissions yet" description="Your submissions per language show up here." className="py-6" />
          ) : (
            <div className="space-y-3">
              {languages.map(([lang, n]) => (
                <BarRow key={lang} label={LANGUAGE_LABEL[lang] ?? lang} value={n} total={totalSubmissions} suffix="subs" />
              ))}
            </div>
          )}
        </Section>

        <Section title="Topic progress" href="/practice" hrefLabel="Practice" className="lg:col-span-2">
          {activeTopics.length === 0 ? (
            <EmptyState icon={Code2} title="No practice topics yet" className="py-6" />
          ) : (
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {activeTopics.map((t) => (
                <BarRow key={t.topic} label={t.topic} value={t.solved} total={t.total} />
              ))}
            </div>
          )}
        </Section>

        <Section title="Course progress" href="/courses" hrefLabel="Courses">
          {courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Not enrolled in any course"
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/courses">Browse courses</Link>
                </Button>
              }
              className="py-6"
            />
          ) : (
            <div className="space-y-3">
              {courses.map((c) => (
                <BarRow key={c.id} label={c.title} value={c.completed} total={c.total} href={`/courses/${c.slug}`} suffix="lessons" />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
