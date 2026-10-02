import type { PaymentMethod } from "@/types";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export const METHOD_LABEL = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label])) as Record<PaymentMethod, string>;

/** ₹2,500 — amounts come back from Postgres numeric as strings, so coerce. */
export function formatMoney(amount: number | string, currency = "INR") {
  const n = typeof amount === "string" ? Number(amount) : amount;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

/** "2026-10" → "2026-10-01" (validated); falls back to the current month. */
export function monthToPeriod(month: string | undefined, now = new Date()): string {
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return `${month}-01`;
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Shift a yyyy-MM-01 period by n months. */
export function shiftPeriod(period: string, n: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

export function periodLabel(period: string, style: "long" | "short" = "long") {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString("en-IN", {
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
