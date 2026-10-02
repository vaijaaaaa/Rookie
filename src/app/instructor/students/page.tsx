import Link from "next/link";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocalTime } from "@/components/instructor/local-time";
import { SearchForm } from "@/components/instructor/search-form";
import { requireStaff } from "@/services/instructor/context";

export const metadata = { title: "Students" };

interface OverviewRow {
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  joined_at: string;
  lessons_completed: number;
  problems_solved: number;
  attendance_rate: number;
  last_active: string | null;
}

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").replace(/[,()*%\\]/g, " ").trim().slice(0, 80);
  const ctx = await requireStaff();
  let query = ctx.supabase.rpc("get_student_overview");
  if (q) query = query.or(`full_name.ilike.*${q}*,email.ilike.*${q}*`);
  const { data, error } = await query.limit(500);
  const students = (data ?? []) as unknown as OverviewRow[];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="People"
        title="Students"
        description={ctx.isAdmin ? "Every student on the platform." : "Students enrolled in your courses."}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SearchForm defaultValue={q} placeholder="Search name or email…" />
        <p className="font-mono text-[11px] text-muted-foreground">{students.length} student{students.length === 1 ? "" : "s"}</p>
      </div>
      {error ? <p className="mb-4 text-sm text-destructive">Couldn&apos;t load students: {error.message}</p> : null}
      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? "No matching students" : "No students yet"}
          description={q ? `Nothing matches “${q}”.` : "Students appear once they enroll in one of your courses."}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="text-right">Lessons</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Solved</TableHead>
                <TableHead className="hidden lg:table-cell">Attendance</TableHead>
                <TableHead className="hidden text-right md:table-cell">Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.user_id}>
                  <TableCell>
                    <Link href={`/instructor/students/${s.user_id}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
                      <UserAvatar name={s.full_name} src={s.avatar_url} className="size-7" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.full_name || "Unnamed"}</span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">{s.email}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    <LocalTime value={s.joined_at} format="date" />
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{s.lessons_completed}</TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">{s.problems_solved}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <Progress value={s.attendance_rate} className="w-20" />
                      <span className="font-mono text-xs tabular-nums">{s.attendance_rate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-xs text-muted-foreground md:table-cell">
                    {s.last_active ? <LocalTime value={s.last_active} format="relative" /> : "never"}
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
