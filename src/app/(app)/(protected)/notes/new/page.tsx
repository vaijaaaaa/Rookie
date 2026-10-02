import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NoteEditor } from "@/components/notes/note-editor";
import { safeTimeZone } from "@/components/agenda/tz";
import { requireProfile } from "@/lib/auth/session";
import { getNoteAttachOptions } from "@/services/notes";

export const metadata: Metadata = { title: "New note" };

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [profile, options, sp] = await Promise.all([requireProfile(), getNoteAttachOptions(), searchParams]);
  const pick = (k: string) => {
    const v = sp[k];
    return typeof v === "string" && v ? v : undefined;
  };
  // Deep links like /notes/new?course_id=…&lesson_id=… prefill attachments.
  const initialAttach = {
    course_id: pick("course_id"),
    lesson_id: pick("lesson_id"),
    problem_id: pick("problem_id"),
    class_id: pick("class_id"),
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/notes" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" /> All notes
      </Link>
      <NoteEditor options={options} timeZone={safeTimeZone(profile.timezone)} initialAttach={initialAttach} />
    </div>
  );
}
