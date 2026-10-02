"use client";

import * as React from "react";
import Link from "next/link";
import { NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/utils/format";
import { createNote, deleteNote, updateNote, type NoteAttach } from "@/services/notes";
import type { Note } from "@/types";
import { MarkdownField } from "./markdown-field";
import { MarkdownPreview } from "./markdown-preview-lazy";

/**
 * Compact "My notes" panel for lesson / class / practice pages.
 * Notes created here are attached to `attach` and are private to the user.
 */
export function QuickNote({ attach, initialNotes }: { attach: NoteAttach; initialNotes: Note[] }) {
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [editing, setEditing] = React.useState<string | "new" | null>(null);

  function upsertLocal(note: Note) {
    setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
  }

  return (
    <section className="rounded-lg border bg-card" aria-labelledby="quick-notes-title">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h2
          id="quick-notes-title"
          className="flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          <NotebookPen className="size-3.5" /> My notes
          {notes.length > 0 ? <span className="tabular-nums">· {notes.length}</span> : null}
        </h2>
        <div className="flex items-center gap-1">
          <Link href="/notes" className="text-xs text-muted-foreground hover:text-foreground">
            All notes
          </Link>
          {editing !== "new" ? (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing("new")}>
              <Plus /> Add
            </Button>
          ) : null}
        </div>
      </header>

      <div className="space-y-3 p-4">
        {editing === "new" ? (
          <QuickNoteEditor
            onCancel={() => setEditing(null)}
            onSave={async (values) => {
              const res = await createNote({ ...attach, ...values });
              if (!res.ok) {
                toast.error(res.error);
                return false;
              }
              if (res.data) upsertLocal(res.data);
              setEditing(null);
              toast.success("Note saved");
              return true;
            }}
          />
        ) : null}

        {notes.length === 0 && editing !== "new" ? (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex w-full flex-col items-center gap-1 rounded-md border border-dashed px-4 py-6 text-center transition-colors hover:bg-muted/40"
          >
            <span className="text-sm font-medium">No notes yet</span>
            <span className="text-xs text-muted-foreground">Jot down key ideas, gotchas or questions — only you can see them.</span>
          </button>
        ) : null}

        <ul className="space-y-2">
          {notes.map((note) =>
            editing === note.id ? (
              <li key={note.id}>
                <QuickNoteEditor
                  initial={note}
                  onCancel={() => setEditing(null)}
                  onSave={async (values) => {
                    const res = await updateNote(note.id, values);
                    if (!res.ok) {
                      toast.error(res.error);
                      return false;
                    }
                    if (res.data) upsertLocal(res.data);
                    setEditing(null);
                    toast.success("Note updated");
                    return true;
                  }}
                />
              </li>
            ) : (
              <QuickNoteItem
                key={note.id}
                note={note}
                onEdit={() => setEditing(note.id)}
                onDelete={async () => {
                  const prev = notes;
                  setNotes((n) => n.filter((x) => x.id !== note.id));
                  const res = await deleteNote(note.id);
                  if (!res.ok) {
                    setNotes(prev);
                    toast.error(res.error);
                  } else toast.success("Note deleted");
                }}
              />
            ),
          )}
        </ul>
      </div>
    </section>
  );
}

function QuickNoteItem({ note, onEdit, onDelete }: { note: Note; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  return (
    <li className="group rounded-md border bg-background/40 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <p className="truncate text-sm font-medium">{note.title}</p>
          <p className="font-mono text-[11px] text-muted-foreground" suppressHydrationWarning>
            {timeAgo(note.updated_at)}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <Button size="icon-sm" variant="ghost" className="size-7" onClick={onEdit} aria-label="Edit note">
            <Pencil className="size-3.5" />
          </Button>
          {confirming ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-2"
              onClick={onDelete}
              onBlur={() => setConfirming(false)}
              autoFocus
            >
              Delete?
            </Button>
          ) : (
            <Button
              size="icon-sm"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirming(true)}
              aria-label="Delete note"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      {note.content.trim() ? (
        expanded ? (
          <MarkdownPreview className="mt-2">{note.content}</MarkdownPreview>
        ) : (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.content}</p>
        )
      ) : null}
    </li>
  );
}

function QuickNoteEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Pick<Note, "title" | "content">;
  onSave: (values: { title: string; content: string }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [content, setContent] = React.useState(initial?.content ?? "");
  const [pending, startTransition] = React.useTransition();
  const empty = !title.trim() && !content.trim();

  function submit() {
    if (empty) return;
    startTransition(async () => {
      await onSave({ title: title.trim(), content });
    });
  }

  return (
    <form
      className="space-y-2 rounded-md border bg-background/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        aria-label="Note title"
        maxLength={200}
        className="h-8"
        autoFocus
      />
      <MarkdownField
        value={content}
        onChange={setContent}
        minHeight="min-h-28"
        placeholder="What did you learn? Markdown and ```code``` supported."
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">⌘/Ctrl + Enter to save</span>
        <div className="ml-auto flex gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="brand" disabled={pending || empty}>
            {pending ? "Saving…" : "Save note"}
          </Button>
        </div>
      </div>
    </form>
  );
}
