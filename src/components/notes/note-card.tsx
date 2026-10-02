import Link from "next/link";
import { BookOpen, Code2, GraduationCap, Video } from "lucide-react";
import { timeAgo } from "@/lib/utils/format";
import type { NoteListItem } from "@/services/notes";

function excerpt(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\[\]()!-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

/** Note summary card for the /notes list. */
export function NoteCard({ note }: { note: NoteListItem }) {
  const attachments = [
    note.course ? { icon: GraduationCap, label: note.course.title } : null,
    note.lesson ? { icon: BookOpen, label: note.lesson.title } : null,
    note.problem ? { icon: Code2, label: note.problem.title } : null,
    note.class ? { icon: Video, label: note.class.title } : null,
  ].filter((a): a is NonNullable<typeof a> => !!a);
  const text = excerpt(note.content);

  return (
    <li>
      <Link
        href={`/notes/${note.id}`}
        className="flex h-full flex-col rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/30"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-1 text-sm font-semibold">{note.title}</h2>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{timeAgo(note.updated_at)}</span>
        </div>
        <p className="mt-1 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
          {text || <span className="italic">Empty note</span>}
        </p>
        {attachments.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Attached to">
            {attachments.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
                <Icon className="size-3 shrink-0" />
                <span className="truncate">{label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Link>
    </li>
  );
}
