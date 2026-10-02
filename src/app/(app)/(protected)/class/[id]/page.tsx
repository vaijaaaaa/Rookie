import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Link2, PlayCircle } from "lucide-react";
import { QuickNote } from "@/components/notes/quick-note";
import { Markdown } from "@/components/shared/markdown";
import { Section } from "@/components/shared/section";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/components/classes/class-card";
import { InstructorCard } from "@/components/classes/instructor-card";
import { JoinClassButton } from "@/components/classes/join-class-button";
import { requireProfile } from "@/lib/auth/session";
import { formatDate, formatTime, relativeDay } from "@/lib/utils/format";
import { classEnd, getClass, getMyAttendanceFor, isClassLive, isClassPast } from "@/services/classes";
import { getNotesFor } from "@/services/notes";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const c = await getClass(id);
  return c ? { title: c.title, description: c.description.slice(0, 160) || undefined } : { title: "Class not found" };
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default async function ClassPage({ params }: Params) {
  const { id } = await params;
  const [profile, c] = await Promise.all([requireProfile(), getClass(id)]);
  if (!c) notFound();

  const [attendanceMap, notes] = await Promise.all([
    getMyAttendanceFor(profile.id, [c.id]),
    getNotesFor({ class_id: c.id }),
  ]);
  const myAttendance = attendanceMap.get(c.id) ?? null;
  const now = getRenderTime();
  const live = isClassLive(c, now);
  const past = isClassPast(c, now);
  const endsAt = new Date(classEnd(c));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/classes"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" aria-hidden /> All classes
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="flex flex-wrap items-center gap-x-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {c.course ? (
                <Link href={`/courses/${c.course.slug}`} className="hover:text-foreground">
                  {c.course.title}
                </Link>
              ) : (
                <span>Open session</span>
              )}
              {c.module ? (
                <>
                  <span aria-hidden>/</span>
                  {c.course ? (
                    <Link href={`/courses/${c.course.slug}#module-${c.module.id}`} className="hover:text-foreground">
                      {c.module.title}
                    </Link>
                  ) : (
                    <span>{c.module.title}</span>
                  )}
                </>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{c.title}</h1>
              <StatusBadge status={live ? "live" : c.status} />
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              <time dateTime={c.starts_at}>
                {relativeDay(c.starts_at)} · {formatTime(c.starts_at)}
              </time>
              {" – "}
              <time dateTime={endsAt.toISOString()}>{formatTime(endsAt)}</time>
              {" · "}
              {formatDuration(c.duration_minutes)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-start gap-2">
            {!(past && c.recording_url) ? (
              <JoinClassButton
                starts_at={c.starts_at}
                duration_minutes={c.duration_minutes}
                status={c.status}
                meeting_url={c.meeting_url}
                serverNow={now}
              />
            ) : null}
            {c.recording_url ? (
              <Button asChild variant={past ? "brand" : "outline"}>
                <a href={c.recording_url} target="_blank" rel="noopener noreferrer">
                  <PlayCircle />
                  Watch recording
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Section title="About this class">
            {c.description.trim() ? (
              <Markdown>{c.description}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">No description yet.</p>
            )}
          </Section>

          <Section title="Agenda">
            {c.agenda.trim() ? (
              <Markdown>{c.agenda}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">The instructor hasn&apos;t posted an agenda yet.</p>
            )}
          </Section>

          <Section title={`Resources${c.resources.length ? ` · ${c.resources.length}` : ""}`} contentClassName="p-0">
            {c.resources.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">No resources shared for this class.</p>
            ) : (
              <ul className="divide-y">
                {c.resources.map((r, i) => (
                  <li key={`${r.url}-${i}`}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40"
                    >
                      <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate group-hover:underline">{r.title}</span>
                      <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:inline">
                        {hostOf(r.url)}
                      </span>
                      <ExternalLink className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="space-y-6" aria-label="Class details">
          <Section title="When">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-mono">{formatDate(c.starts_at, "EEE, MMM d, yyyy")}</dd>
              <dt className="text-muted-foreground">Starts</dt>
              <dd className="font-mono">{formatTime(c.starts_at)}</dd>
              <dt className="text-muted-foreground">Ends</dt>
              <dd className="font-mono">{formatTime(endsAt)}</dd>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-mono">{formatDuration(c.duration_minutes)}</dd>
            </dl>
          </Section>

          <Section title="Instructor">
            <InstructorCard instructor={c.instructor} />
          </Section>

          <Section title="My attendance">
            {myAttendance ? (
              <div className="space-y-2">
                <StatusBadge status={myAttendance.status} />
                {myAttendance.note ? (
                  <p className="flex gap-1.5 text-xs text-muted-foreground">
                    <FileText className="mt-0.5 size-3 shrink-0" aria-hidden />
                    <span>{myAttendance.note}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {past ? "Not marked yet." : "Attendance is marked by the instructor after class."}
              </p>
            )}
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              <Link href="/attendance" className="hover:text-foreground">
                View full attendance →
              </Link>
            </p>
          </Section>

          <QuickNote attach={{ class_id: c.id }} initialNotes={notes} />
        </aside>
      </div>
    </div>
  );
}

function getRenderTime() {
  return Date.now();
}
