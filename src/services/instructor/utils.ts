// Pure helpers shared by instructor forms (client + server).

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "a, b ,c" → ["a","b","c"] */
export function splitList(input: string, sep: RegExp | string = ","): string[] {
  return input
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const PROBLEM_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const CLASS_STATUSES = ["scheduled", "live", "completed", "cancelled"] as const;
export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export const SUBMISSION_TYPES = ["text", "url", "code"] as const;
export const RESOURCE_KINDS = ["article", "video", "docs", "repo", "slides", "other"] as const;
export const AGENDA_ITEM_TYPES = ["task", "class", "assignment", "problem", "study", "revision"] as const;
export const PRIORITIES = ["low", "medium", "high"] as const;
export const CODE_LANGUAGES = ["java", "javascript", "python"] as const;
export const LEARNING_GOALS = [
  "software_developer",
  "full_stack_developer",
  "backend_developer",
  "frontend_developer",
  "data_engineer",
  "ai_engineer",
  "cs_fundamentals",
] as const;

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
