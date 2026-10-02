import Link from "next/link";
import { CalendarCheck, Pencil, Plus, Video } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LinkTabs } from "@/components/instructor/link-tabs";
import { LocalTime } from "@/components/instructor/local-time";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { requireStaff } from "@/services/instructor/context";
import { classScopeFilter, getManagedCourseIds } from "@/services/instructor/scope";
import { CLASS_LIST_SELECT, type ClassListRow } from "@/services/instructor/classes";
import { HOUR, nowIso } from "@/services/instructor/time";
import { deleteClass } from "./actions";

export const metadata = { title: "Classes" };

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "past" ? "past" : "upcoming";
  const ctx = await requireStaff();
  const courseIds = await getManagedCourseIds(ctx);
  const scope = classScopeFilter(ctx, courseIds);
  // A class stays "upcoming" until 2h after it starts (covers live sessions).
  const cutoff = nowIso(-2 * HOUR);

  let q = ctx.supabase.from("classes").select(CLASS_LIST_SELECT);
  if (scope) q = q.or(scope);
  q = tab === "upcoming" ? q.gte("starts_at", cutoff).order("starts_at") : q.lt("starts_at", cutoff).order("starts_at", { ascending: false });
  const { data } = await q.limit(100).overrideTypes<ClassListRow[], { merge: false }>();
  const classes = data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Teaching"
        title="Classes"
        description="Schedule live sessions, share agendas and recordings."
        actions={
          <Button asChild variant="brand">
            <Link href="/admin/classes/new">
              <Plus /> Schedule class
            </Link>
          </Button>
        }
      />
      <LinkTabs
        className="mb-4"
        active={tab}
        tabs={[
          { value: "upcoming", label: "Upcoming", href: "/admin/classes" },
          { value: "past", label: "Past", href: "/admin/classes?tab=past" },
        ]}
      />
      {classes.length === 0 ? (
        <EmptyState
          icon={Video}
          title={tab === "upcoming" ? "No upcoming classes" : "No past classes"}
          description={tab === "upcoming" ? "Schedule a class and enrolled students get notified." : "Classes you've taught will show up here."}
          action={
            tab === "upcoming" ? (
              <Button asChild variant="brand" size="sm">
                <Link href="/admin/classes/new">
                  <Plus /> Schedule class
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="hidden md:table-cell">Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Marked</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-72">
                    <Link href={`/admin/classes/${c.id}`} className="block truncate font-medium hover:underline">
                      {c.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{c.courses?.title ?? "Open session"}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    <LocalTime value={c.starts_at} format="short" />
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">{c.duration_minutes}m</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">
                    {c.attendance[0]?.count ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/attendance/${c.id}`}>
                          <CalendarCheck /> <span className="hidden lg:inline">Attendance</span>
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Edit class">
                        <Link href={`/admin/classes/${c.id}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <ConfirmAction
                        action={deleteClass.bind(null, c.id)}
                        title={`Delete "${c.title}"?`}
                        description="Attendance records for this class are deleted too."
                        successMessage="Class deleted"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
