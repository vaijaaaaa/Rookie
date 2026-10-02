import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NoteEditor } from "@/components/notes/note-editor";
import { APP_TIME_ZONE } from "@/components/agenda/tz";
import { requireProfile } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/format";
import { getNote, getNoteAttachOptions } from "@/services/notes";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const note = await getNote(id);
  return { title: note?.title ?? "Note" };
}

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [, note, options] = await Promise.all([requireProfile(), getNote(id), getNoteAttachOptions()]);
  if (!note) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/notes" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3" /> All notes
        </Link>
        <p className="font-mono text-[11px] text-muted-foreground">
          Created {formatDate(note.created_at)} · Updated {formatDate(note.updated_at, "MMM d, h:mm a")}
        </p>
      </div>
      <NoteEditor key={note.id} note={note} options={options} timeZone={APP_TIME_ZONE} />
    </div>
  );
}
