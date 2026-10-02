import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, Dumbbell, FileText, LogIn, NotebookPen } from "lucide-react";
import { CourseContentsSheet } from "@/components/lesson/course-contents-sheet";
import { CourseOutline } from "@/components/lesson/course-outline";
import { extractHeadings, type TocHeading } from "@/components/lesson/headings";
import { LessonMarkdown } from "@/components/lesson/lesson-markdown";
import { LessonPager } from "@/components/lesson/lesson-pager";
import { LessonResources } from "@/components/lesson/lesson-resources";
import { LessonToc } from "@/components/lesson/lesson-toc";
import { LessonVideo } from "@/components/lesson/lesson-video";
import { LessonViewTracker } from "@/components/lesson/lesson-view-tracker";
import { MarkCompleteButton } from "@/components/lesson/mark-complete-button";
import { QuickNote } from "@/components/notes/quick-note";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getProfile } from "@/lib/auth/session";
import { percent } from "@/lib/utils";
import {
  flattenLessons,
  getCourseBySlug,
  getLesson,
  getLessonProgress,
  getLessonResources,
  type ProgressMap,
} from "@/services/courses";
import { getNotesFor } from "@/services/notes";
import type { Note } from "@/types";

type Params = { params: Promise<{ slug: string; lessonSlug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Lesson not found" };
  const lesson = await getLesson(course.id, lessonSlug);
  if (!lesson) return { title: "Lesson not found" };
  return {
    title: `${lesson.title} · ${course.title}`,
    description: lesson.summary || course.summary || undefined,
  };
}

export default async function LessonPage({ params }: Params) {
  const { slug, lessonSlug } = await params;
  const [course, profile] = await Promise.all([getCourseBySlug(slug), getProfile()]);
  if (!course) notFound();
  const lesson = await getLesson(course.id, lessonSlug);
  if (!lesson) notFound();

  const lessons = flattenLessons(course.modules);
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? lessons[index - 1]! : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1]! : null;
  const currentModule = course.modules.find((m) => m.id === lesson.module_id);

  const [progress, resources, notes] = await Promise.all([
    profile
      ? getLessonProgress(
          profile.id,
          lessons.map((l) => l.id),
        )
      : Promise.resolve<ProgressMap>({}),
    getLessonResources(lesson.id),
    profile ? getNotesFor({ lesson_id: lesson.id }) : Promise.resolve<Note[]>([]),
  ]);

  const completedCount = lessons.filter((l) => progress[l.id] === "completed").length;
  const coursePercent = percent(completedCount, lessons.length);
  const isCompleted = progress[lesson.id] === "completed";
  const nextHref = next ? `/courses/${course.slug}/lessons/${next.slug}` : null;
  const loginHref = `/login?next=${encodeURIComponent(`/courses/${course.slug}/lessons/${lesson.slug}`)}`;

  const headings: TocHeading[] = extractHeadings(lesson.content);
  if (lesson.exercise) headings.push({ id: "lesson-practice", text: "Practice", depth: 2 });

  const outline = (
    <CourseOutline
      courseSlug={course.slug}
      modules={course.modules}
      progress={progress}
      currentLessonId={lesson.id}
    />
  );

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      {profile ? <LessonViewTracker lessonId={lesson.id} /> : null}

      <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[256px_minmax(0,1fr)_264px]">
        {/* LEFT: course contents (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col">
            <Link href={`/courses/${course.slug}`} className="group mb-3 block px-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Course</p>
              <p className="mt-0.5 text-sm font-semibold leading-snug group-hover:text-brand">{course.title}</p>
            </Link>
            {profile ? (
              <div className="mb-3 px-2">
                <Progress value={coursePercent} />
                <p className="mt-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {completedCount}/{lessons.length} complete · {coursePercent}%
                </p>
              </div>
            ) : null}
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-4">{outline}</div>
          </div>
        </aside>

        {/* CENTER: reading column */}
        <article className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
            <CourseContentsSheet
              courseTitle={course.title}
              progressLabel={profile ? `${completedCount}/${lessons.length} lessons · ${coursePercent}%` : undefined}
            >
              {outline}
            </CourseContentsSheet>
            {lessons.length > 0 && index >= 0 ? (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {index + 1} / {lessons.length}
              </span>
            ) : null}
          </div>

          <div className="mx-auto max-w-3xl">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <Link href="/courses" className="hover:text-foreground">
                Courses
              </Link>
              <ChevronRight className="size-3" />
              <Link href={`/courses/${course.slug}`} className="max-w-[16rem] truncate hover:text-foreground">
                {course.title}
              </Link>
              {currentModule ? (
                <>
                  <ChevronRight className="size-3" />
                  <span className="max-w-[16rem] truncate">{currentModule.title}</span>
                </>
              ) : null}
            </nav>

            <header className="mt-3 border-b pb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-[2rem] md:leading-tight">
                {lesson.title}
              </h1>
              {lesson.summary ? <p className="mt-2 text-base text-muted-foreground">{lesson.summary}</p> : null}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" /> {lesson.estimated_minutes} min read
                </span>
                {index >= 0 ? (
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <FileText className="size-3.5" /> Lesson {index + 1} of {lessons.length}
                  </span>
                ) : null}
                {isCompleted ? <span className="text-brand">✓ Completed</span> : null}
                <span className="ml-auto">
                  {profile ? (
                    <MarkCompleteButton
                      lessonId={lesson.id}
                      courseId={course.id}
                      courseSlug={course.slug}
                      completed={isCompleted}
                      nextHref={nextHref}
                      size="sm"
                    />
                  ) : null}
                </span>
              </div>
            </header>

            <div className="mt-8 space-y-8">
              {lesson.video_url ? <LessonVideo url={lesson.video_url} title={lesson.title} /> : null}

              {lesson.content.trim() ? (
                <LessonMarkdown>{lesson.content}</LessonMarkdown>
              ) : (
                <p className="text-sm text-muted-foreground">This lesson has no written content yet.</p>
              )}

              {lesson.exercise ? (
                <section
                  id="lesson-practice"
                  aria-labelledby="practice-title"
                  className="scroll-mt-24 overflow-hidden rounded-lg border border-brand/30 bg-brand/[0.03]"
                >
                  <header className="flex items-center gap-2 border-b border-brand/20 bg-brand/[0.06] px-4 py-2.5">
                    <Dumbbell className="size-4 text-brand" />
                    <h2 id="practice-title" className="font-mono text-xs font-medium uppercase tracking-wider text-brand">
                      Practice
                    </h2>
                  </header>
                  <div className="px-4 py-4 md:px-5">
                    <Markdown className="prose-sm md:prose-base">{lesson.exercise}</Markdown>
                  </div>
                </section>
              ) : null}

              {/* Completion */}
              <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {isCompleted ? "Nice work — this lesson is done." : "Finished this lesson?"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile
                      ? "Completion updates your course and roadmap progress."
                      : "Sign in to track progress across courses and roadmaps."}
                  </p>
                </div>
                {profile ? (
                  <MarkCompleteButton
                    lessonId={lesson.id}
                    courseId={course.id}
                    courseSlug={course.slug}
                    completed={isCompleted}
                    nextHref={nextHref}
                  />
                ) : (
                  <Button asChild variant="outline">
                    <Link href={loginHref}>
                      <LogIn /> Sign in to track progress
                    </Link>
                  </Button>
                )}
              </div>

              <LessonPager courseSlug={course.slug} prev={prev} next={next} />
            </div>
          </div>
        </article>

        {/* RIGHT: progress, toc, resources, notes (below content on < xl) */}
        <aside className="min-w-0 lg:col-start-2 xl:col-start-auto">
          <div className="mx-auto max-w-3xl space-y-6 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:pb-4">
            <PanelBlock title="Course progress" className="xl:block hidden">
              {profile ? (
                <>
                  <div className="flex items-baseline justify-between font-mono text-xs tabular-nums">
                    <span className="text-muted-foreground">
                      {completedCount}/{lessons.length} lessons
                    </span>
                    <span className="text-foreground">{coursePercent}%</span>
                  </div>
                  <Progress value={coursePercent} className="mt-1.5" />
                </>
              ) : (
                <Link href={loginHref} className="text-sm text-brand hover:underline">
                  Sign in to track progress
                </Link>
              )}
            </PanelBlock>

            <PanelBlock title="On this page" className="hidden xl:block">
              <LessonToc headings={headings} />
            </PanelBlock>

            <PanelBlock title="Resources">
              <LessonResources resources={resources} />
            </PanelBlock>

            <PanelBlock title="Your notes" icon={NotebookPen}>
              {profile ? (
                <QuickNote attach={{ lesson_id: lesson.id, course_id: course.id }} initialNotes={notes} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Link href={loginHref} className="text-brand hover:underline">
                    Sign in
                  </Link>{" "}
                  to keep private notes on this lesson.
                </p>
              )}
            </PanelBlock>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PanelBlock({
  title,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  icon?: typeof Clock;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <h2 className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        {title}
      </h2>
      {children}
    </section>
  );
}
