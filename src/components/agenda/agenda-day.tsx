"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarPlus, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn, percent } from "@/lib/utils";
import { deleteAgendaItem, setAgendaItemDone } from "@/app/(app)/(protected)/agenda/actions";
import type { AgendaEntry } from "@/services/agenda";
import { AgendaItemDialog, type AgendaFormOptions } from "./agenda-item-dialog";
import { AGENDA_TYPE_META, PRIORITY_META } from "./type-meta";
import { clock12 } from "./tz";

export function AgendaDay({
  date,
  entries,
  options,
  isPast,
}: {
  date: string;
  entries: AgendaEntry[];
  options: AgendaFormOptions;
  isPast: boolean;
}) {
  const router = useRouter();
  const [optimistic, applyOptimistic] = React.useOptimistic(
    entries,
    (state, action: { type: "toggle"; id: string; done: boolean } | { type: "remove"; id: string }) =>
      action.type === "toggle"
        ? state.map((e) => (e.itemId === action.id ? { ...e, done: action.done, status: action.done ? "done" : "todo" } : e))
        : state.filter((e) => e.itemId !== action.id),
  );
  const [, startTransition] = React.useTransition();
  const [dialog, setDialog] = React.useState<{ open: boolean; item: AgendaEntry | null }>({ open: false, item: null });

  const items = optimistic.filter((e) => e.kind === "item");
  const done = items.filter((e) => e.done).length;
  const pct = percent(done, items.length);

  function toggle(id: string, value: boolean) {
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id, done: value });
      const res = await setAgendaItemDone(id, value);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id });
      const res = await deleteAgendaItem(id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Item deleted");
      router.refresh();
    });
  }

  const openNew = () => setDialog({ open: true, item: null });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Day progress</p>
            <p className="mt-1 text-sm">
              <span className="text-lg font-semibold tabular-nums">{done}</span>
              <span className="text-muted-foreground"> / {items.length} tasks completed</span>
            </p>
          </div>
          <Button variant="brand" size="sm" onClick={openNew}>
            <Plus /> Add task
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={pct} aria-label="Day progress" />
          <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      </div>

      {optimistic.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title={isPast ? "Nothing was scheduled for this day" : "Your day is wide open"}
          description={
            isPast
              ? "No tasks, classes or deadlines on this date."
              : "No classes or deadlines yet. Plan a study block, a revision session or a problem to solve."
          }
          action={
            <Button variant="brand" size="sm" onClick={openNew}>
              <Plus /> Add a task
            </Button>
          }
        />
      ) : (
        <ol className="relative space-y-2" aria-label="Agenda timeline">
          {optimistic.map((e) => (
            <AgendaRow
              key={e.key}
              entry={e}
              onToggle={toggle}
              onEdit={() => setDialog({ open: true, item: e })}
              onDelete={remove}
            />
          ))}
        </ol>
      )}

      <AgendaItemDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        date={date}
        options={options}
        item={dialog.item}
      />
    </div>
  );
}

function AgendaRow({
  entry: e,
  onToggle,
  onEdit,
  onDelete,
}: {
  entry: AgendaEntry;
  onToggle: (id: string, done: boolean) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  const meta = AGENDA_TYPE_META[e.type];
  const Icon = meta.icon;
  const live = e.classStatus === "live";
  const checkboxId = e.itemId ? `agenda-${e.itemId}` : undefined;

  return (
    <li className="grid grid-cols-[4.5rem_1fr] gap-3 sm:grid-cols-[5.5rem_1fr]">
      <div className="pt-3 text-right font-mono text-xs leading-tight tabular-nums">
        {e.start ? (
          <>
            <div className="text-foreground">{clock12(e.start)}</div>
            {e.end ? <div className="text-muted-foreground">{clock12(e.end)}</div> : null}
          </>
        ) : (
          <div className="text-muted-foreground">Anytime</div>
        )}
      </div>

      <div
        className={cn(
          "group relative rounded-lg border bg-card p-3 transition-colors",
          live && "border-destructive/40",
          e.done && "bg-card/50",
        )}
      >
        <div className="flex items-start gap-3">
          {e.kind === "item" && e.itemId ? (
            <Checkbox
              id={checkboxId}
              checked={e.done}
              onCheckedChange={(v) => onToggle(e.itemId!, v === true)}
              className="mt-0.5"
              aria-label={`Mark "${e.title}" as ${e.done ? "not done" : "done"}`}
            />
          ) : (
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px]",
                live ? "text-destructive" : "text-muted-foreground",
              )}
              aria-hidden
            >
              <Icon className="size-3.5" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {e.kind === "item" ? (
                <label
                  htmlFor={checkboxId}
                  className={cn(
                    "cursor-pointer text-sm font-medium",
                    e.done && "text-muted-foreground line-through decoration-muted-foreground/60",
                  )}
                >
                  {e.title}
                </label>
              ) : e.href ? (
                <Link href={e.href} className="text-sm font-medium hover:underline">
                  {live ? "🔴 " : null}
                  {e.title}
                </Link>
              ) : (
                <span className="text-sm font-medium">{e.title}</span>
              )}
            </div>

            {e.description ? (
              <p className={cn("mt-0.5 line-clamp-2 text-xs text-muted-foreground", e.done && "opacity-70")}>
                {e.description}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="gap-1">
                <Icon /> {meta.label}
              </Badge>
              {e.priority ? (
                <Badge variant={PRIORITY_META[e.priority].variant}>{PRIORITY_META[e.priority].label}</Badge>
              ) : null}
              {e.classStatus ? <StatusBadge status={e.classStatus} /> : null}
              {e.kind === "assignment" ? (
                <StatusBadge status={e.submissionStatus ?? "not_started"} />
              ) : null}
              {e.kind === "assignment" && e.start ? (
                <span className="font-mono text-[11px] text-muted-foreground">due {clock12(e.start)}</span>
              ) : null}
              {e.source ? (
                <Badge variant="info" className="font-normal">
                  {e.source}
                </Badge>
              ) : null}
              {e.course ? (
                <Link
                  href={`/courses/${e.course.slug}`}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {e.course.title}
                </Link>
              ) : null}
              {e.lesson && e.lesson.courseSlug ? (
                <>
                  <span className="text-xs text-muted-foreground/60">→</span>
                  <Link
                    href={`/courses/${e.lesson.courseSlug}/lessons/${e.lesson.slug}`}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {e.lesson.title}
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {live && e.meetingUrl ? (
              <Button asChild size="sm" variant="destructive" className="h-7">
                <a href={e.meetingUrl} target="_blank" rel="noopener noreferrer">
                  Join
                </a>
              </Button>
            ) : null}
            {e.href && e.kind === "item" ? (
              <Button asChild size="icon-sm" variant="ghost" className="size-7">
                <Link href={e.href} aria-label={`Open ${e.title}`}>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            ) : null}
            {e.kind !== "item" && e.href ? (
              <Button asChild size="sm" variant="outline" className="h-7">
                <Link href={e.href}>View</Link>
              </Button>
            ) : null}
            {e.personal && e.itemId ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="ghost" className="size-7" aria-label={`Actions for ${e.title}`}>
                    <Ellipsis className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => onDelete(e.itemId!)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
