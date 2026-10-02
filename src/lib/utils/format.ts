import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns";

export function formatDate(d: string | Date, pattern = "MMM d, yyyy") {
  return format(new Date(d), pattern);
}

export function formatTime(d: string | Date) {
  return format(new Date(d), "h:mm a");
}

/** "HH:MM:SS" postgres time → "9:00 AM" */
export function formatClock(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return format(d, "h:mm a");
}

export function relativeDay(d: string | Date) {
  const date = new Date(d);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

export function timeAgo(d: string | Date) {
  return formatDistanceToNowStrict(new Date(d), { addSuffix: true });
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** yyyy-MM-dd in local time */
export function toISODate(d = new Date()) {
  return format(d, "yyyy-MM-dd");
}

export const LABELS = {
  learning_goal: {
    software_developer: "Software Developer",
    full_stack_developer: "Full Stack Developer",
    backend_developer: "Backend Developer",
    frontend_developer: "Frontend Developer",
    data_engineer: "Data Engineer",
    ai_engineer: "AI Engineer",
    cs_fundamentals: "Just learning CS",
  },
  experience: {
    beginner: "Beginner",
    some_experience: "Some experience",
    intermediate: "Intermediate",
  },
} as const;
