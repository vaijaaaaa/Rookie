/**
 * Timezone-aware date helpers (no external tz lib). Pure functions — safe on
 * server and client. Dates are "yyyy-MM-dd" strings, times "HH:mm".
 */

/** The whole app runs on Indian Standard Time (UTC+5:30, no DST). */
export const APP_TIME_ZONE = "Asia/Kolkata";
export const APP_TIME_ZONE_LABEL = "IST";

const dateFmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, opts: Intl.DateTimeFormatOptions, locale = "en-US") {
  const key = `${locale}|${tz}|${JSON.stringify(opts)}`;
  let f = dateFmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone: tz, ...opts });
    dateFmtCache.set(key, f);
  }
  return f;
}

/** yyyy-MM-dd of an instant in the given zone. */
export function dateInTz(d: Date | string, tz: string): string {
  return fmt(tz, { year: "numeric", month: "2-digit", day: "2-digit" }, "en-CA").format(new Date(d));
}

/** HH:mm (24h) of an instant in the given zone — for sorting. */
export function hhmmInTz(d: Date | string, tz: string): string {
  const parts = fmt(tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(d));
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

/** Hour (0–23) of an instant in the given zone. */
export function hourInTz(d: Date | string, tz: string): number {
  return Number(hhmmInTz(d, tz).slice(0, 2));
}

/** "HH:mm" or "HH:mm:ss" → "9:00 AM" */
export function clock12(t: string | null | undefined): string {
  if (!t) return "";
  const [hs, ms] = t.split(":");
  const h = Number(hs);
  const m = Number(ms ?? 0);
  if (Number.isNaN(h)) return "";
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Instant → "9:00 AM" in the zone. */
export function timeInTz(d: Date | string, tz: string): string {
  return clock12(hhmmInTz(d, tz));
}

export function isISODate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Calendar arithmetic on yyyy-MM-dd strings. */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the ISO week containing the date. */
export function startOfWeek(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  return addDays(iso, -dow);
}

export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

/** Format a yyyy-MM-dd using Intl, independent of server zone. */
export function formatISODate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(new Date(`${iso}T00:00:00Z`));
}

/** "Today" / "Tomorrow" / "Yesterday" / "Mon, Oct 6" relative to today in tz. */
export function relativeDayLabel(iso: string, today: string): string {
  const diff = diffDays(iso, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatISODate(iso, { weekday: "short", month: "short", day: "numeric" });
}

/** UTC instant bounds that safely cover a local calendar day in any zone (filter precisely afterwards). */
export function widenedDayBounds(from: string, to: string = from) {
  return {
    gte: `${addDays(from, -1)}T00:00:00Z`,
    lt: `${addDays(to, 2)}T00:00:00Z`,
  };
}
