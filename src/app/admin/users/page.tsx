import Link from "next/link";
import { Eye, Search, Users, X } from "lucide-react";
import { Pagination } from "@/components/admin/pagination";
import { RoleBadge } from "@/components/admin/role-badge";
import { RoleMenu } from "@/components/admin/role-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { formatDate, timeAgo } from "@/lib/utils/format";
import { USERS_PAGE_SIZE, getRoleCounts, isUserRole, listUsers } from "@/services/admin";
import type { UserRole } from "@/types";

export const metadata = { title: "Users" };

type SP = Promise<{ page?: string; q?: string; role?: string }>;

const TABS: { role: UserRole | null; label: string }[] = [
  { role: null, label: "All" },
  { role: "student", label: "Students" },
  { role: "instructor", label: "Instructors" },
  { role: "admin", label: "Admins" },
];

function hrefFor(role: UserRole | null, q: string) {
  const sp = new URLSearchParams();
  if (role) sp.set("role", role);
  if (q) sp.set("q", q);
  const s = sp.toString();
  return s ? `/admin/users?${s}` : "/admin/users";
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SP }) {
  const me = await requireRole(["admin"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const role = isUserRole(sp.role) ? sp.role : null;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [{ users, total, error }, counts] = await Promise.all([listUsers({ page, q, role }), getRoleCounts()]);

  const heading =
    role === "instructor" ? "Manage instructors" : role === "student" ? "Manage students" : role === "admin" ? "Admins" : "Users";

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Admin"
        title={heading}
        description="Search accounts, review onboarding and change roles."
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Filter by role" className="inline-flex h-9 w-fit items-center rounded-lg bg-muted p-1 text-muted-foreground">
          {TABS.map((t) => {
            const active = t.role === role;
            const count = counts[t.role ?? "all"];
            return (
              <Link
                key={t.label}
                href={hrefFor(t.role, q)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-background text-foreground shadow-sm dark:bg-accent" : "hover:text-foreground",
                )}
              >
                {t.label}
                <span className="font-mono text-[11px] tabular-nums opacity-70">{count}</span>
              </Link>
            );
          })}
        </nav>

        <form method="get" action="/admin/users" className="flex w-full gap-2 md:w-80">
          {role ? <input type="hidden" name="role" value={role} /> : null}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="Search name or email" className="pl-8" aria-label="Search users" />
          </div>
          {q ? (
            <Button asChild variant="ghost" size="icon" aria-label="Clear search">
              <Link href={hrefFor(role, "")}>
                <X />
              </Link>
            </Button>
          ) : null}
        </form>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not load users: {error}
        </p>
      ) : null}

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? `No users match "${q}"` : "No users here yet"}
          description={q ? "Try a different name or email." : "Users will appear once they sign up."}
          action={
            q || role ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/users">Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="hidden lg:table-cell">Onboarded</TableHead>
                <TableHead className="hidden lg:table-cell">Last activity</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link href={`/admin/users/${u.id}`} className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={u.full_name} src={u.avatar_url} />
                      <div className="min-w-0">
                        <p className="truncate font-medium hover:underline">
                          {u.full_name || "Unnamed"}
                          {u.id === me.id ? <span className="ml-1.5 text-xs text-muted-foreground">(you)</span> : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{u.email ?? "—"}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {formatDate(u.created_at)}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs lg:table-cell">
                    {u.onboarded_at ? (
                      <span className="text-success">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                    {u.last_active ? timeAgo(u.last_active) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <RoleMenu userId={u.id} userName={u.full_name || u.email || "This user"} role={u.role} isSelf={u.id === me.id} />
                      <Button asChild variant="ghost" size="icon-sm" aria-label={`View ${u.full_name}`}>
                        <Link href={`/admin/users/${u.id}`}>
                          <Eye />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            pageSize={USERS_PAGE_SIZE}
            total={total}
            basePath="/admin/users"
            params={{ q: q || undefined, role: role ?? undefined }}
          />
        </div>
      )}
    </div>
  );
}
