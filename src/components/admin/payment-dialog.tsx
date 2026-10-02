"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IndianRupee, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { savePayment } from "@/app/admin/payments/actions";
import { PAYMENT_METHODS } from "@/lib/utils/money";
import type { PaymentMethod, StudentPayment } from "@/types";

interface StudentOption {
  id: string;
  name: string;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Record a new payment, or edit an existing one (pass `payment`). */
export function PaymentDialog({
  students,
  defaultStudentId,
  defaultMonth,
  defaultAmount,
  payment,
  trigger = "button",
}: {
  students: StudentOption[];
  defaultStudentId?: string;
  /** yyyy-MM */
  defaultMonth: string;
  defaultAmount?: number;
  payment?: StudentPayment;
  trigger?: "button" | "row" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initial = () => ({
    userId: payment?.user_id ?? defaultStudentId ?? "",
    month: payment ? payment.period.slice(0, 7) : defaultMonth,
    amount: payment ? String(payment.amount) : defaultAmount ? String(defaultAmount) : "",
    method: (payment?.method ?? "upi") as PaymentMethod,
    paidOn: payment?.paid_on ?? today(),
    reference: payment?.reference ?? "",
    note: payment?.note ?? "",
  });
  const [v, setV] = useState(initial);
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((p) => ({ ...p, [k]: value }));

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setV(initial());
      setError(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await savePayment(payment?.id ?? null, v);
      if (!res.ok) return setError(res.error);
      toast.success(res.message ?? "Saved");
      setOpen(false);
      router.refresh();
    });
  }

  const lockedStudent = Boolean(payment || defaultStudentId);
  const studentName = students.find((s) => s.id === v.userId)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger === "icon" ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit payment"><Pencil /></Button>
        ) : trigger === "row" ? (
          <Button variant="outline" size="sm"><Plus /> Record</Button>
        ) : (
          <Button variant="brand"><IndianRupee /> Record payment</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} method="post" className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{payment ? "Edit payment" : "Record payment"}</DialogTitle>
            <DialogDescription>
              {lockedStudent && studentName ? `Monthly fee received from ${studentName}.` : "Log a monthly fee received from a student."}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}
          {lockedStudent ? null : (
            <div className="grid gap-1.5">
              <Label htmlFor="pay-student">Student</Label>
              <NativeSelect id="pay-student" value={v.userId} onChange={(e) => set("userId", e.target.value)} required>
                <option value="" disabled>Select a student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </NativeSelect>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pay-month">For month</Label>
              <Input id="pay-month" type="month" value={v.month} onChange={(e) => set("month", e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-amount">Amount (₹)</Label>
              <Input id="pay-amount" type="number" inputMode="decimal" min="1" step="0.01" value={v.amount}
                onChange={(e) => set("amount", e.target.value)} required className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-method">Method</Label>
              <NativeSelect id="pay-method" value={v.method} onChange={(e) => set("method", e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-date">Paid on</Label>
              <Input id="pay-date" type="date" value={v.paidOn} onChange={(e) => set("paidOn", e.target.value)} required />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pay-ref">Reference <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="pay-ref" value={v.reference} onChange={(e) => set("reference", e.target.value)} maxLength={120}
              placeholder="UPI transaction ID, receipt no." className="font-mono" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pay-note">Note <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="pay-note" value={v.note} onChange={(e) => set("note", e.target.value)} maxLength={500} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null} {payment ? "Save changes" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
