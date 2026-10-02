import Link from "next/link";
import { ChevronLeft, ChevronRight, IndianRupee, Users, Wallet } from "lucide-react";
import { PaymentDialog } from "@/components/admin/payment-dialog";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { SimpleBarChart } from "@/components/instructor/bar-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { cn, percent } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";
import { formatMoney, METHOD_LABEL, monthToPeriod, periodLabel, shiftPeriod } from "@/lib/utils/money";
import { getCollectionTrend, getMonthLedger } from "@/services/payments";
import { deletePayment } from "./actions";

export const metadata = { title: "Payments" };

type Status = "all" | "paid" | "unpaid";
type SP = Promise<{ month?: string; status?: string; q?: string }>;

/** Most common amount this month — a sensible default for the next entry. */
function typicalAmount(amounts: number[]) {
  const counts = new Map<number, number>();
  for (const a of amounts) counts.set(a, (counts.get(a) ?? 0) + 1);
  let best: number | undefined;
  let max = 0;
  for (const [a, c] of counts) if (c > max) [best, max] = [a, c];
  return best;
}

export default async function PaymentsPage({ searchParams }: { searchParams: SP }) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const period = monthToPeriod(sp.month);
  const month = period.slice(0, 7);
  const status: Status = sp.status === "paid" || sp.status === "unpaid" ? sp.status : "all";
  const q = (sp.q ?? "").trim().toLowerCase();

  const [ledger, trend] = await Promise.all([getMonthLedger(period), getCollectionTrend(period)]);
  const students = ledger.rows.map((r) => ({ id: r.student.id, name: r.student.full_name || r.student.email || "Student" }));
  const defaultAmount = typicalAmount(ledger.rows.flatMap((r) => r.payments.map((p) => p.amount)));

  const rows = ledger.rows.filter((r) => {
    if (status === "paid" && r.payments.length === 0) return false;
    if (status === "unpaid" && r.payments.length > 0) return false;
    if (q && !`${r.student.full_name} ${r.student.email ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const href = (over: Partial<{ month: string; status: Status; q: string }>) => {
    const p = new URLSearchParams();
    const m = over.month ?? month;
    const s = over.status ?? status;
    const query = over.q ?? sp.q ?? "";
    p.set("month", m);
    if (s !== "all") p.set("status", s);
    if (query) p.set("q", query);
    return `/admin/payments?${p.toString()}`;
  };

  const unpaid = ledger.studentCount - ledger.paidCount;
  const chart = trend.map((t) => ({ label: periodLabel(t.period, "short"), value: t.total, full: formatMoney(t.total) }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Admin · finance"
        title="Payments"
        description="Monthly fees received from students. This is a record of payments, not a payment gateway."
        actions={<PaymentDialog students={students} defaultMonth={month} defaultAmount={defaultAmount} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="icon-sm" aria-label="Previous month">
          <Link href={href({ month: shiftPeriod(period, -1).slice(0, 7) })}><ChevronLeft /></Link>
        </Button>
        <h2 className="min-w-36 text-center font-medium">{periodLabel(period)}</h2>
        <Button asChild variant="outline" size="icon-sm" aria-label="Next month">
          <Link href={href({ month: shiftPeriod(period, 1).slice(0, 7) })}><ChevronRight /></Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={href({ month: monthToPeriod(undefined).slice(0, 7) })}>This month</Link>
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Collected" value={formatMoney(ledger.collected)} hint={periodLabel(period)} icon={IndianRupee} />
        <StatCard label="Paid" value={`${ledger.paidCount} / ${ledger.studentCount}`} hint={`${percent(ledger.paidCount, ledger.studentCount)}% of students`} icon={Users} />
        <StatCard label="Pending" value={unpaid} hint={unpaid ? "students without a payment" : "everyone has paid"} icon={Wallet} />
        <StatCard label="Typical fee" value={defaultAmount ? formatMoney(defaultAmount) : "—"} hint="most common this month" />
      </div>

      <Section title="Collected · last 6 months" className="mb-6">
        <SimpleBarChart data={chart} valueLabel="Collected" height={160} />
      </Section>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter by status" className="inline-flex h-9 w-fit items-center rounded-lg bg-muted p-1 text-muted-foreground">
          {(["all", "unpaid", "paid"] as const).map((s) => (
            <Link
              key={s}
              href={href({ status: s })}
              aria-current={s === status ? "page" : undefined}
              className={cn(
                "inline-flex h-full items-center rounded-md px-3 text-sm font-medium capitalize",
                s === status && "bg-background text-foreground shadow-sm dark:bg-accent",
              )}
            >
              {s}
              <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                {s === "all" ? ledger.studentCount : s === "paid" ? ledger.paidCount : unpaid}
              </span>
            </Link>
          ))}
        </nav>
        <form role="search" className="flex gap-2">
          <input type="hidden" name="month" value={month} />
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search students…" className="w-full sm:w-56" />
          <Button type="submit" variant="outline">Search</Button>
        </form>
      </div>

      {ledger.studentCount === 0 ? (
        <EmptyState icon={Users} title="No students yet" description="Add students from Admin → Users, then record their monthly payments here."
          action={<Button asChild variant="outline"><Link href="/admin/users">Go to users</Link></Button>} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Wallet} title="No matching students" description="Try another filter or search." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead className="hidden md:table-cell">Paid on</TableHead>
                <TableHead className="hidden lg:table-cell">Reference</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ student, payments, total }) => {
                const name = student.full_name || student.email || "Student";
                const latest = payments[0];
                return (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Link href={`/admin/users/${student.id}`} className="flex items-center gap-2.5 hover:underline">
                        <UserAvatar name={name} src={student.avatar_url} className="size-7" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{student.email}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {payments.length ? <Badge variant="success">Paid</Badge> : <Badge variant="warning">Unpaid</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {payments.length ? formatMoney(total) : "—"}
                      {payments.length > 1 ? <span className="block text-[11px] text-muted-foreground">{payments.length} payments</span> : null}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{latest ? METHOD_LABEL[latest.method] : "—"}</TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">{latest ? formatDate(`${latest.paid_on}T12:00:00`, "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="hidden max-w-40 truncate font-mono text-xs text-muted-foreground lg:table-cell">{latest?.reference ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {latest ? (
                          <>
                            <PaymentDialog students={students} defaultMonth={month} payment={latest} trigger="icon" />
                            <ConfirmAction
                              action={deletePayment.bind(null, latest.id)}
                              title={`Delete ${formatMoney(latest.amount)} payment from ${name}?`}
                              description="Removes this payment record. It can't be undone."
                              successMessage="Payment deleted"
                            />
                          </>
                        ) : (
                          <PaymentDialog students={students} defaultStudentId={student.id} defaultMonth={month} defaultAmount={defaultAmount} trigger="row" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
