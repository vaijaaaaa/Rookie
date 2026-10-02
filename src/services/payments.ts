import "server-only";
import { createClient } from "@/lib/supabase/server";
import { shiftPeriod } from "@/lib/utils/money";
import type { Profile, StudentPayment } from "@/types";

export type PaymentStudent = Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "created_at">;

export interface MonthRow {
  student: PaymentStudent;
  payments: StudentPayment[];
  total: number;
}

const toNumber = (p: StudentPayment): StudentPayment => ({ ...p, amount: Number(p.amount) });

/** Every student with their payments for one billing month. */
export async function getMonthLedger(period: string) {
  const supabase = await createClient();
  const [studentsRes, paymentsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, created_at")
      .eq("role", "student")
      .order("full_name")
      .limit(2000)
      .overrideTypes<PaymentStudent[], { merge: false }>(),
    supabase
      .from("student_payments")
      .select("*")
      .eq("period", period)
      .order("paid_on", { ascending: false })
      .limit(5000)
      .overrideTypes<StudentPayment[], { merge: false }>(),
  ]);

  const byUser = new Map<string, StudentPayment[]>();
  for (const p of (paymentsRes.data ?? []).map(toNumber)) {
    byUser.set(p.user_id, [...(byUser.get(p.user_id) ?? []), p]);
  }
  const rows: MonthRow[] = (studentsRes.data ?? []).map((student) => {
    const payments = byUser.get(student.id) ?? [];
    return { student, payments, total: payments.reduce((s, p) => s + p.amount, 0) };
  });
  const collected = rows.reduce((s, r) => s + r.total, 0);
  const paidCount = rows.filter((r) => r.payments.length > 0).length;
  return { rows, collected, paidCount, studentCount: rows.length, error: studentsRes.error ?? paymentsRes.error };
}

/** Total collected per month for the 6 months ending at `period`. */
export async function getCollectionTrend(period: string, months = 6) {
  const start = shiftPeriod(period, -(months - 1));
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_payments")
    .select("period, amount")
    .gte("period", start)
    .lte("period", period)
    .limit(20000)
    .overrideTypes<{ period: string; amount: number | string }[], { merge: false }>();
  const totals = new Map<string, number>();
  for (const r of data ?? []) totals.set(r.period, (totals.get(r.period) ?? 0) + Number(r.amount));
  return Array.from({ length: months }, (_, i) => {
    const p = shiftPeriod(start, i);
    return { period: p, total: totals.get(p) ?? 0 };
  });
}

/** One student's payment history (admin user page). */
export async function getStudentPayments(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_payments")
    .select("*")
    .eq("user_id", userId)
    .order("period", { ascending: false })
    .order("paid_on", { ascending: false })
    .limit(60)
    .overrideTypes<StudentPayment[], { merge: false }>();
  return (data ?? []).map(toNumber);
}
