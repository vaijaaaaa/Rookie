// Pure time helpers, safe on server and client.

/** Offset (minutes) of `timeZone` from UTC at instant `date`. */
function tzOffsetMinutes(timeZone: string, date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return Math.round((asUtc - date.getTime()) / 60000);
  } catch {
    return 0;
  }
}

/** yyyy-MM-dd for `date` as seen in `timeZone`. */
export function dateInTz(timeZone: string, date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** [start, end) of the calendar day containing `date` in `timeZone`, as ISO strings. */
export function dayBoundsInTz(timeZone: string, date: Date): { start: string; end: string } {
  const [y, m, d] = dateInTz(timeZone, date).split("-").map(Number);
  const guess = Date.UTC(y!, m! - 1, d!);
  const start = guess - tzOffsetMinutes(timeZone, new Date(guess)) * 60000;
  const nextGuess = Date.UTC(y!, m! - 1, d! + 1);
  const end = nextGuess - tzOffsetMinutes(timeZone, new Date(nextGuess)) * 60000;
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

/** ISO → value for <input type="datetime-local"> in the runtime's timezone (call in the browser). */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value → ISO, interpreted in the runtime's timezone (call in the browser). */
export function localInputToIso(local: string): string {
  return new Date(local).toISOString();
}

/** "HH:MM:SS" → "HH:MM" for <input type="time">. */
export function trimClock(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : "";
}

/** Current instant shifted by `offsetMs`, as ISO. (Kept out of components for render purity.) */
export function nowIso(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

export const HOUR = 3_600_000;
export const DAY = 86_400_000;
