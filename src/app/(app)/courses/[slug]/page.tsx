import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft, Clock, FileText, Layers, Video } from "lucide-react";
import { formatCategory } from "@/components/courses/catalog-filters";
import { CourseCurriculum } from "@/components/courses/course-curriculum";
import { CourseIcon } from "@/components/courses/course-icon";
import { EnrollButton } from "@/components/courses/enroll-button";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Markdown } from "@/components/shared/markdown";
import { Section } from "@/components/shared/section";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { getProfile } from "@/lib/auth/session";
import { formatTime, relativeDay } from "@/lib/utils/format";
import {
  flattenLessons,
  getCourseBySlug,
  getCourseProgress,
  getLessonProgress,
  getUpcomingClassesForCourse,
  isEnrolled,
  nextLesson,
  type ProgressMap,
  type UpcomingClass,
} from "@/services/courses";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Course not found" };
  return { title: course.title, description: course.summary || undefined };
}

export default async function CoursePage({ params }: Params) {
  const { slug } = await params;
  const [course, profile] = await Promise.all([getCourseBySlug(slug), getProfile()]);
  if (!course) notFound();

  const lessons = flattenLessons(course.modules);
  const lessonIds = lessons.map((l) => l.id);

  const [progress, enrolled, courseProgress] = await Promise.all([
    profile ? getLessonProgress(profile.id, lessonIds) : Promise.resolve<ProgressMap>({}),
    profile ? isEnrolled(profile.id, course.id) : Promise.resolve(false),
    getCourseProgress(),
  ]);
  const upcoming: UpcomingClass[] = profile && enrolled ? await getUpcomingClassesForCourse(course.id) : [];

  const row = courseProgress.get(course.id);
  const total = row?.total_lessons ?? lessons.length;
  const completed = profile ? (row?.completed_lessons ?? 0) : 0;
  const percent = profile ? (row?.percent ?? 0) : 0;
  const finished = total > 0 && completed >= total;
  const next = profile ? nextLesson(lessons, progress) : (lessons[0] ?? null);
  const continueHref = next ? `/courses/${course.slug}/lessons/${next.slug}` : null;
  const totalMinutes = lessons.reduce((s, l) => s + l.estimated_minutes, 0);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        href="/courses"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" /> All courses
      </Link>

      {/* Header */}
      <header className="rounded-lg border bg-card">
        <div className="flex flex-col gap-6 p-5 md:flex-row md:items-start md:justify-between md:p-6">
          <div className="flex min-w-0 gap-4">
            <CourseIcon icon={course.icon} size="lg" className="hidden sm:flex" />
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {formatCategory(course.category)}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{course.title}</h1>
              {course.summary ? <p className="mt-2 max-w-2xl text-muted-foreground">{course.summary}</p> : null}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <DifficultyBadge value={course.difficulty} />
                <Meta icon={Layers}>
                  {course.modules.length} {course.modules.length === 1 ? "module" : "modules"}
                </Meta>
                <Meta icon={FileText}>
                  {total} {total === 1 ? "lesson" : "lessons"}
                </Meta>
                <Meta icon={Clock}>
                  {course.estimated_hours > 0 ? `${course.estimated_hours}h` : `${totalMinutes} min`}
                </Meta>
                {course.instructor ? (
                  <span className="inline-flex items-center gap-2">
                    <UserAvatar
                      name={course.instructor.full_name}
                      src={course.instructor.avatar_url}
                      className="size-5 text-[10px]"
                    />
                    <span className="text-foreground/90">{course.instructor.full_name}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 space-y-3 md:w-64">
            <EnrollButton
              courseId={course.id}
              courseSlug={course.slug}
              signedIn={!!profile}
              enrolled={enrolled}
              continueHref={continueHref}
              finished={finished}
              className="w-full"
            />
            {profile && (enrolled || completed > 0) ? (
              <div>
                <div className="mb-1.5 flex items-baseline justify-between font-mono text-xs tabular-nums">
                  <span className="text-muted-foreground">
                    {completed}/{total} lessons
                  </span>
                  <span className={finished ? "text-brand" : "text-foreground"}>{percent}%</span>
                </div>
                <Progress value={percent} />
                {next && !finished ? (
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    Next: <span className="text-foreground/90">{next.title}</span>
                  </p>
                ) : null}
              </div>
            ) : !profile ? (
              <p className="text-xs text-muted-foreground">Lessons are free to read. Sign in to track progress.</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {course.description ? (
            <section>
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                About this course
              </h2>
              <Markdown className="prose-sm">{course.description}</Markdown>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Curriculum</h2>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{totalMinutes} min total</span>
            </div>
            {course.modules.length === 0 ? (
              <EmptyState icon={Layers} title="Curriculum coming soon" description="No modules have been published yet." />
            ) : (
              <CourseCurriculum
                courseSlug={course.slug}
                modules={course.modules}
                progress={progress}
                nextLessonId={profile && !finished ? (next?.id ?? null) : null}
              />
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {profile && enrolled ? <UpcomingClasses classes={upcoming} /> : null}
          <Section title="Course at a glance">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Glance label="Level">
                <DifficultyBadge value={course.difficulty} />
              </Glance>
              <Glance label="Modules">{course.modules.length}</Glance>
              <Glance label="Lessons">{total}</Glance>
              <Glance label="Reading">{totalMinutes} min</Glance>
            </dl>
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums">
      <Icon className="size-3.5" />
      {children}
    </span>
  );
}

function Glance({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function UpcomingClasses({ classes }: { classes: UpcomingClass[] }) {
  return (
    <Section title="Upcoming classes" href="/classes" hrefLabel="All" contentClassName="p-0">
      {classes.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">No classes scheduled for this course.</p>
      ) : (
        <ul className="divide-y">
          {classes.map((c) => (
            <li key={c.id}>
              <Link href={`/class/${c.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/40">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                  {c.status === "live" ? (
                    <Video className="size-4 text-destructive" />
                  ) : (
                    <CalendarClock className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {relativeDay(c.starts_at)} · {formatTime(c.starts_at)} · {c.duration_minutes}m
                  </p>
                </div>
                {c.status === "live" ? <StatusBadge status="live" /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
