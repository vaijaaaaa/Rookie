"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";
import type { ActionResult } from "@/types";

const paymentSchema = z.object({
  userId: z.guid("Pick a student"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a month"),
  amount: z.coerce.number().positive("Amount must be more than 0").max(10_000_000, "Amount is too large"),
  method: z.enum(["cash", "upi", "bank_transfer", "card", "other"]),
  paidOn: z.iso.date("Pick the date it was paid"),
  reference: z.string().trim().max(120, "Reference is too long"),
  note: z.string().trim().max(500, "Note is too long"),
});

export type PaymentInput = z.input<typeof paymentSchema>;

function revalidate(userId?: string) {
  revalidatePath("/admin/payments");
  if (userId) revalidatePath(`/admin/users/${userId}`);
}

/** Create (id null) or update a payment. Admin only — RLS enforces it too. */
export async function savePayment(id: string | null, input: PaymentInput): Promise<ActionResult> {
  const me = await requireRole(["admin"]);
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment" };
  const v = parsed.data;
  const row = {
    user_id: v.userId,
    period: `${v.month}-01`,
    amount: Math.round(v.amount * 100) / 100,
    method: v.method,
    paid_on: v.paidOn,
    reference: v.reference || null,
    note: v.note || null,
  };

  const supabase = await createClient();
  if (id) {
    const { data, error } = await supabase.from("student_payments").update(row).eq("id", id).select("id");
    if (error) return { ok: false, error: errorMessage(error) };
    if (!data?.length) return { ok: false, error: "Payment not found" };
    revalidate(v.userId);
    return { ok: true, message: "Payment updated" };
  }
  const { error } = await supabase.from("student_payments").insert({ ...row, currency: "INR", recorded_by: me.id });
  if (error) return { ok: false, error: errorMessage(error) };
  revalidate(v.userId);
  return { ok: true, message: "Payment recorded" };
}

export async function deletePayment(id: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsedId = z.guid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid payment" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("student_payments").delete().eq("id", parsedId.data).select("user_id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data?.length) return { ok: false, error: "Payment not found" };
  revalidate((data[0] as { user_id: string | null }).user_id ?? undefined);
  return { ok: true, message: "Payment deleted" };
}
