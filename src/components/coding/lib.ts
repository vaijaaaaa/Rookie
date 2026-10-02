import type { CodeLanguage, CodingProblem } from "@/types";

export const LANGUAGE_OPTIONS: { value: CodeLanguage; label: string }[] = [
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
];

export const LANGUAGE_LABEL: Record<CodeLanguage, string> = {
  java: "Java",
  javascript: "JavaScript",
  python: "Python",
};

export function isLanguage(v: unknown): v is CodeLanguage {
  return v === "java" || v === "javascript" || v === "python";
}

/** Starter code for a language, with a generic fallback when the author didn't provide one. */
export function starterFor(problem: Pick<CodingProblem, "starter_code" | "function_name">, lang: CodeLanguage) {
  const given = problem.starter_code?.[lang];
  if (given && given.trim()) return given;
  const fn = problem.function_name;
  switch (lang) {
    case "javascript":
      return `/**\n * @param {...any} args\n * @return {any}\n */\nfunction ${fn}(...args) {\n  // Write your solution here\n}\n`;
    case "python":
      return `def ${fn}(*args):\n    # Write your solution here\n    pass\n`;
    case "java":
      return `class Solution {\n    public Object ${fn}(Object... args) {\n        // Write your solution here\n        return null;\n    }\n}\n`;
  }
}

/** Best-effort parameter names from a JS/Python/Java signature, for labelling test inputs. */
export function paramNames(problem: Pick<CodingProblem, "starter_code" | "function_name">, arity: number): string[] {
  const fn = problem.function_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sources: [string | undefined, RegExp][] = [
    [problem.starter_code?.javascript, new RegExp(`(?:function\\s+${fn}\\s*|${fn}\\s*=\\s*(?:async\\s*)?(?:function\\s*)?)\\(([^)]*)\\)`)],
    [problem.starter_code?.python, new RegExp(`def\\s+${fn}\\s*\\(([^)]*)\\)`)],
    [problem.starter_code?.java, new RegExp(`${fn}\\s*\\(([^)]*)\\)`)],
  ];
  for (const [src, re] of sources) {
    const m = src ? re.exec(src) : null;
    if (!m) continue;
    const names = m[1]!
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p && p !== "self")
      .map((p) => {
        const clean = p.replace(/=.*$/, "").replace(/:.*$/, "").trim();
        const parts = clean.split(/\s+/);
        return (parts[parts.length - 1] ?? "").replace(/^\.\.\.|\[\]$/g, "");
      })
      .filter((p) => /^[A-Za-z_$][\w$]*$/.test(p));
    if (names.length === arity) return names;
  }
  return Array.from({ length: arity }, (_, i) => `arg${i + 1}`);
}

/** Compact JSON for displaying values; `undefined` is shown explicitly. */
export function formatValue(v: unknown): string {
  if (v === undefined) return "undefined";
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

// ---------------------------------------------------------------------------
// localStorage (always guarded: private mode / quota / disabled storage)
// ---------------------------------------------------------------------------

const codeKey = (problemId: string, lang: CodeLanguage) => `rookie:code:${problemId}:${lang}`;
const langKey = (problemId: string) => `rookie:lang:${problemId}`;
const layoutKey = "rookie:workspace:split";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export const draftStore = {
  getCode: (problemId: string, lang: CodeLanguage) => read(codeKey(problemId, lang)),
  setCode: (problemId: string, lang: CodeLanguage, code: string | null) => write(codeKey(problemId, lang), code),
  getLanguage: (problemId: string): CodeLanguage | null => {
    const v = read(langKey(problemId));
    return isLanguage(v) ? v : null;
  },
  setLanguage: (problemId: string, lang: CodeLanguage) => write(langKey(problemId), lang),
  getSplit: (): number | null => {
    const n = Number(read(layoutKey));
    return Number.isFinite(n) && n >= 25 && n <= 75 ? n : null;
  },
  setSplit: (pct: number) => write(layoutKey, String(Math.round(pct))),
};
