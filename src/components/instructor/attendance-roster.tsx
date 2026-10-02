"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { saveAttendance } from "@/app/instructor/attendance/actions";
import { ATTENDANCE_STATUSES } from "@/services/instructor/utils";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";
import { toastResult } from "./form-utils";

export interface RosterStudent {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  status: AttendanceStatus | null;
  note: string;
}

const LABEL: Record<AttendanceStatus, { label: string; key: string; active: string }> = {
  present: { label: "Present", key: "P", active: "bg-success/15 text-success border-success/40" },
  absent: { label: "Absent", key: "A", active: "bg-destructive/15 text-destructive border-destructive/40" },
  late: { label: "Late", key: "L", active: "bg-warning/15 text-warning border-warning/40" },
  excused: { label: "Excused", key: "E", active: "bg-info/15 text-info border-info/40" },
};

type RowState = { status: AttendanceStatus | null; note: string };

export function AttendanceRoster({ classId, students }: { classId: string; students: RosterStudent[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const initial = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, { status: s.status, note: s.note }])) as Record<string, RowState>,
    [students],
  );
  const [rows, setRows] = useState<Record<string, RowState>>(initial);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    for (const s of students) {
      const st = rows[s.id]?.status;
      if (st) c[st] += 1;
      else c.unmarked += 1;
    }
    return c;
  }, [rows, students]);

  const dirty = students.some((s) => rows[s.id]?.status !== initial[s.id]?.status || rows[s.id]?.note !== initial[s.id]?.note);
  const visible = query
    ? students.filter((s) => `${s.full_name} ${s.email ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    : students;

  function update(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { status: null, note: "" }), ...patch } }));
  }

  function markAllPresent() {
    setRows((prev) => {
      const next = { ...prev };
      for (const s of students) next[s.id] = { ...(next[s.id] ?? { note: "" }), status: "present" } as RowState;
      return next;
    });
  }

  function save() {
    const payload = students
      .map((s) => ({ user_id: s.id, status: rows[s.id]?.status ?? null, note: rows[s.id]?.note ?? "" }))
      .filter((r): r is { user_id: string; status: AttendanceStatus; note: string } => r.status !== null);
    startTransition(async () => {
      const res = await saveAttendance({ class_id: classId, rows: payload });
      if (toastResult(res, "Attendance saved")) router.refresh();
    });
  }

  function onRowKey(e: React.KeyboardEvent<HTMLDivElement>, id: string) {
    if ((e.target as HTMLElement).tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
    const map: Record<string, AttendanceStatus> = { p: "present", a: "absent", l: "late", e: "excused" };
    const st = map[e.key.toLowerCase()];
    if (st) {
      e.preventDefault();
      update(id, { status: st });
    }
  }

  if (!students.length) {
    return (
      <EmptyState
        icon={Users}
        title="No students on the roster"
        description="Students enrolled in this class's course appear here."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["Present", counts.present, "text-success"],
            ["Late", counts.late, "text-warning"],
            ["Absent", counts.absent, "text-destructive"],
            ["Excused", counts.excused, "text-info"],
            ["Unmarked", counts.unmarked, "text-muted-foreground"],
          ] as const
        ).map(([label, n, cls]) => (
          <div key={label} className="rounded-lg border bg-card px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-semibold tabular-nums", cls)}>{n}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter students…" className="pl-8" aria-label="Filter students" />
        </div>
        <Button variant="outline" size="sm" onClick={markAllPresent}>
          <CheckCheck /> Mark all present
        </Button>
        <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">Focus a row · P / A / L / E</span>
        <Button variant="brand" className="ml-auto" onClick={save} disabled={pending || !dirty}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {dirty ? "Save attendance" : "Saved"}
        </Button>
      </div>

      <div className="divide-y rounded-lg border bg-card">
        {visible.map((s) => {
          const row = rows[s.id] ?? { status: null, note: "" };
          return (
            <div
              key={s.id}
              tabIndex={0}
              onKeyDown={(e) => onRowKey(e, s.id)}
              className="grid gap-2 px-3 py-2.5 outline-none focus-visible:bg-muted/40 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,14rem)] md:items-center"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <UserAvatar name={s.full_name} src={s.avatar_url} className="size-7" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.full_name || "Unnamed"}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{s.email}</p>
                </div>
              </div>
              <div role="radiogroup" aria-label={`Attendance for ${s.full_name}`} className="inline-flex w-fit rounded-md border p-0.5">
                {ATTENDANCE_STATUSES.map((st) => {
                  const active = row.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      tabIndex={-1}
                      onClick={() => update(s.id, { status: st })}
                      className={cn(
                        "rounded border border-transparent px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                        active && LABEL[st].active,
                      )}
                    >
                      {LABEL[st].label}
                    </button>
                  );
                })}
              </div>
              <Input
                value={row.note}
                onChange={(e) => update(s.id, { note: e.target.value })}
                placeholder="Note"
                aria-label={`Note for ${s.full_name}`}
                className="h-8 text-xs"
              />
            </div>
          );
        })}
        {!visible.length ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">No students match “{query}”.</p> : null}
      </div>
    </div>
  );
}
