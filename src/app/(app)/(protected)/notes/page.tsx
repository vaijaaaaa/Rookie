import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen, Plus, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { NoteCard } from "@/components/notes/note-card";
import { cn } from "@/lib/utils";
import { listNotes, type NoteAttachType } from "@/services/notes";

export const metadata: Metadata = { title: "Notes" };

const FILTERS: { value: NoteAttachType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "course", label: "Courses" },
  { value: "lesson", label: "Lessons" },
  { value: "problem", label: "Problems" },
  { value: "class", label: "Classes" },
  { value: "none", label: "Unattached" },
];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>;
}) {
  const sp = await searchParams;
  const q = (one(sp.q) ?? "").slice(0, 100);
  const typeParam = one(sp.type);
  const type = FILTERS.some((f) => f.value === typeParam && f.value !== "all") ? (typeParam as NoteAttachType) : undefined;
  const notes = await listNotes({ q, type });
  const filtered = !!q || !!type;

  const hrefFor = (t: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (t !== "all") params.set("type", t);
    const s = params.toString();
    return s ? `/notes?${s}` : "/notes";
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Private to you"
        title="Notes"
        description="Your personal knowledge base — attach notes to courses, lessons, problems and classes."
        actions={
          <Button asChild variant="brand">
            <Link href="/notes/new">
              <Plus /> New note
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <form action="/notes" method="get" role="search" className="relative md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search notes…" aria-label="Search notes" className="pl-8" />
          {type ? <input type="hidden" name="type" value={type} /> : null}
        </form>
        <nav aria-label="Filter notes" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {FILTERS.map((f) => {
            const active = (type ?? "all") === f.value;
            return (
              <Link
                key={f.value}
                href={hrefFor(f.value)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md border px-2.5 py-1 text-xs transition-colors",
                  active ? "border-foreground/20 bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {notes.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title="No matching notes"
            description={q ? `Nothing found for “${q}”.` : "No notes with this attachment yet."}
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/notes">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={NotebookPen}
            title="Start your first note"
            description="Summaries in your own words stick. Write one for the lesson you just finished."
            action={
              <Button asChild size="sm" variant="brand">
                <Link href="/notes/new">
                  <Plus /> New note
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <p className="mb-2 font-mono text-[11px] text-muted-foreground">
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
