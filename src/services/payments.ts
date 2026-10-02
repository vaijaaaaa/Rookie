import "server-only";
import { fetchAllRows } from "@/lib/supabase/paging";
import { createClient } from "@/lib/supabase/server";
import { shiftPeriod } from "@/lib/utils/money";
import type { Profile, StudentPayment } from "@/types";

export type PaymentStudent = Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "created_at">;

export interface MonthRow {
  student: PaymentStudent;
  /** false for payments whose student account was deleted (or is no longer a student). */
  isStudent: boolean;
  payments: StudentPayment[];
  total: number;
}

const toNumber = (p: StudentPayment): StudentPayment => ({ ...p, amount: Number(p.amount) });

/** Display name for a payment's student, falling back to the snapshot once the profile is gone. */
export function paymentStudentName(p: Pick<StudentPayment, "student_name">, profile?: Pick<Profile, "full_name" | "email"> | null) {
  return profile?.full_name || profile?.email || p.student_name || "Deleted user";
}

/** Every student with their payments for one billing month. */
export async function getMonthLedger(period: string) {
  const supabase = await createClient();
  const [studentsRes, paymentsRes] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, created_at")
        .eq("role", "student")
        .order("full_name")
        .order("id")
        .range(from, to)
        .overrideTypes<PaymentStudent[], { merge: false }>(),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("student_payments")
        .select("*")
        .eq("period", period)
        .order("paid_on", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to)
        .overrideTypes<StudentPayment[], { merge: false }>(),
    ),
  ]);

  const byUser = new Map<string, StudentPayment[]>();
  for (const p of paymentsRes.rows.map(toNumber)) {
    // Deleted accounts: group by the name snapshot so their payments stay visible.
    const key = p.user_id ?? `deleted:${p.student_name ?? ""}`;
    byUser.set(key, [...(byUser.get(key) ?? []), p]);
  }
  const studentIds = new Set(studentsRes.rows.map((s) => s.id));
  const rows: MonthRow[] = studentsRes.rows.map((student) => {
    const payments = byUser.get(student.id) ?? [];
    return { student, isStudent: true, payments, total: payments.reduce((s, p) => s + p.amount, 0) };
  });
  const others: MonthRow[] = [...byUser.entries()]
    .filter(([key]) => !studentIds.has(key))
    .map(([key, payments]) => ({
      student: {
        id: key,
        full_name: paymentStudentName(payments[0]!),
        email: null,
        avatar_url: null,
        created_at: payments[0]!.created_at,
      },
      isStudent: false,
      payments,
      total: payments.reduce((s, p) => s + p.amount, 0),
    }));
  const collected = [...rows, ...others].reduce((s, r) => s + r.total, 0);
  const paidCount = rows.filter((r) => r.payments.length > 0).length;
  return {
    rows: [...rows, ...others],
    collected,
    paidCount,
    studentCount: rows.length,
    error: studentsRes.error ?? paymentsRes.error,
  };
}

/** Total collected per month for the 6 months ending at `period`. */
export async function getCollectionTrend(period: string, months = 6) {
  const start = shiftPeriod(period, -(months - 1));
  const supabase = await createClient();
  const { rows } = await fetchAllRows(
    (from, to) =>
      supabase
        .from("student_payments")
        .select("period, amount")
        .gte("period", start)
        .lte("period", period)
        .order("id")
        .range(from, to)
        .overrideTypes<{ period: string; amount: number | string }[], { merge: false }>(),
    { maxRows: 100_000 },
  );
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.period, (totals.get(r.period) ?? 0) + Number(r.amount));
  return Array.from({ length: months }, (_, i) => {
    const p = shiftPeriod(start, i);
    return { period: p, total: totals.get(p) ?? 0 };
  });
}

/** One student's payment history (admin user page): the latest `limit` rows plus the all-time total. */
export async function getStudentPayments(userId: string, limit = 60) {
  const supabase = await createClient();
  const [recentRes, amounts] = await Promise.all([
    supabase
      .from("student_payments")
      .select("*")
      .eq("user_id", userId)
      .order("period", { ascending: false })
      .order("paid_on", { ascending: false })
      .limit(limit)
      .overrideTypes<StudentPayment[], { merge: false }>(),
    fetchAllRows((from, to) =>
      supabase
        .from("student_payments")
        .select("amount")
        .eq("user_id", userId)
        .order("id")
        .range(from, to)
        .overrideTypes<{ amount: number | string }[], { merge: false }>(),
    ),
  ]);
  return {
    payments: (recentRes.data ?? []).map(toNumber),
    total: amounts.rows.reduce((s, r) => s + Number(r.amount), 0),
    count: amounts.rows.length,
  };
}
