import "server-only";
import { cache } from "react";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { errorMessage } from "@/lib/utils";
import { MAX_CODE_LENGTH } from "@/services/execution/types";
import type {
  ActionResult,
  CodeLanguage,
  CodeVerdict,
  CodingProblem,
  CodingSubmission,
  ProblemDifficulty,
  TestCase,
} from "@/types";

/**
 * Coding practice data access.
 *
 * Queries are plain server functions (Server Components only). `createSubmission`
 * is an inline Server Action — pass it to Client Components as a prop.
 */

export const PROBLEMS_PAGE_SIZE = 20;
export const LANGUAGES: CodeLanguage[] = ["java", "javascript", "python"];
export const DIFFICULTIES: ProblemDifficulty[] = ["easy", "medium", "hard"];
export const STATUS_FILTERS = ["solved", "attempted", "todo"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProblemListItem = Pick<CodingProblem, "id" | "slug" | "title" | "difficulty" | "topic" | "tags">;

export type ProblemStatus = "solved" | "attempted" | "todo";

export type ProblemRow = ProblemListItem & { status: ProblemStatus; attempts: number };

export interface ProblemListParams {
  q?: string;
  difficulty?: ProblemDifficulty;
  topic?: string;
  tag?: string;
  status?: StatusFilter;
  page?: number;
}

export interface MyProblemActivity {
  /** problem_id → number of submissions */
  attempts: Map<string, number>;
  solved: Set<string>;
}

export interface PracticeCatalog {
  topics: string[];
  tags: string[];
  totalByDifficulty: Record<ProblemDifficulty, number>;
  solvedByDifficulty: Record<ProblemDifficulty, number>;
  total: number;
  solved: number;
}

export interface TopicProgress {
  topic: string;
  total: number;
  solved: number;
}

export type SubmissionSummary = Pick<
  CodingSubmission,
  "id" | "language" | "code" | "verdict" | "passed_count" | "total_count" | "runtime_ms" | "created_at"
>;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** My submissions reduced to per-problem attempts + solved set. */
export const getMyProblemActivity = cache(async (userId: string): Promise<MyProblemActivity> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coding_submissions")
    .select("problem_id, verdict")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5000)
    .overrideTypes<Pick<CodingSubmission, "problem_id" | "verdict">[], { merge: false }>();

  const attempts = new Map<string, number>();
  const solved = new Set<string>();
  for (const s of data ?? []) {
    attempts.set(s.problem_id, (attempts.get(s.problem_id) ?? 0) + 1);
    if (s.verdict === "accepted") solved.add(s.problem_id);
  }
  return { attempts, solved };
});

/** Filter options + header stats. Selects only small columns of published problems. */
export const getPracticeCatalog = cache(async (userId: string): Promise<PracticeCatalog> => {
  const supabase = await createClient();
  const [{ data }, activity] = await Promise.all([
    supabase
      .from("coding_problems")
      .select("id, difficulty, topic, tags")
      .eq("is_published", true)
      .overrideTypes<Pick<CodingProblem, "id" | "difficulty" | "topic" | "tags">[], { merge: false }>(),
    getMyProblemActivity(userId),
  ]);

  const rows = data ?? [];
  const totalByDifficulty: Record<ProblemDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
  const solvedByDifficulty: Record<ProblemDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
  const topics = new Set<string>();
  const tags = new Set<string>();
  let solved = 0;
  for (const p of rows) {
    totalByDifficulty[p.difficulty] += 1;
    topics.add(p.topic);
    for (const t of p.tags ?? []) tags.add(t);
    if (activity.solved.has(p.id)) {
      solved += 1;
      solvedByDifficulty[p.difficulty] += 1;
    }
  }
  const byName = (a: string, b: string) => a.localeCompare(b);
  return {
    topics: [...topics].sort(byName),
    tags: [...tags].sort(byName),
    totalByDifficulty,
    solvedByDifficulty,
    total: rows.length,
    solved,
  };
});

export async function getTopicProgress(): Promise<TopicProgress[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_topic_progress");
  return ((data as TopicProgress[] | null) ?? []).map((r) => ({
    topic: r.topic,
    total: Number(r.total) || 0,
    solved: Number(r.solved) || 0,
  }));
}

/** Escape user input for ILIKE and strip PostgREST filter syntax. */
function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, " ")}%`;
}

export async function listProblems(
  userId: string,
  params: ProblemListParams,
): Promise<{ rows: ProblemRow[]; count: number; page: number; pageCount: number }> {
  let page = Math.max(1, Math.floor(params.page ?? 1));
  const supabase = await createClient();
  const activity = await getMyProblemActivity(userId);
  const empty = { rows: [], count: 0, page, pageCount: 1 };
  const solvedIds = [...activity.solved];
  const attemptedIds = [...activity.attempts.keys()];
  const attemptedOnlyIds = attemptedIds.filter((id) => !activity.solved.has(id));
  const inList = (ids: string[]) => `(${ids.join(",")})`;

  // Built per call so the same filters can be re-run (e.g. to clamp an out-of-range page).
  const buildQuery = (head = false) => {
    let query = supabase
      .from("coding_problems")
      .select("id, slug, title, difficulty, topic, tags", { count: "exact", head })
      .eq("is_published", true);

    const q = params.q?.trim();
    if (q) query = query.ilike("title", likePattern(q.slice(0, 100)));
    if (params.difficulty) query = query.eq("difficulty", params.difficulty);
    if (params.topic) query = query.eq("topic", params.topic);
    if (params.tag) query = query.contains("tags", [params.tag]);

    // Status filters are applied as id lists derived from my submissions.
    if (params.status === "solved") query = query.in("id", solvedIds);
    else if (params.status === "attempted") query = query.in("id", attemptedOnlyIds);
    else if (params.status === "todo" && attemptedIds.length > 0) query = query.not("id", "in", inList(attemptedIds));
    return query;
  };

  if (params.status === "solved" && solvedIds.length === 0) return empty;
  if (params.status === "attempted" && attemptedOnlyIds.length === 0) return empty;

  const fetchPage = (p: number) => {
    const from = (p - 1) * PROBLEMS_PAGE_SIZE;
    return buildQuery()
      .order("difficulty", { ascending: true })
      .order("title", { ascending: true })
      .range(from, from + PROBLEMS_PAGE_SIZE - 1)
      .overrideTypes<ProblemListItem[], { merge: false }>();
  };

  let { data, count, error } = await fetchPage(page);
  // ?page= past the end: PostgREST answers with a range error — clamp to the last page instead.
  if (page > 1 && (error || (data ?? []).length === 0)) {
    const { count: total } = await buildQuery(true);
    const last = Math.max(1, Math.ceil((total ?? 0) / PROBLEMS_PAGE_SIZE));
    if (last < page) {
      page = last;
      ({ data, count, error } = await fetchPage(page));
    }
  }

  const rows: ProblemRow[] = (data ?? []).map((p) => ({
    ...p,
    tags: p.tags ?? [],
    attempts: activity.attempts.get(p.id) ?? 0,
    status: activity.solved.has(p.id) ? "solved" : activity.attempts.has(p.id) ? "attempted" : "todo",
  }));
  const total = count ?? 0;
  return { rows, count: total, page, pageCount: Math.max(1, Math.ceil(total / PROBLEMS_PAGE_SIZE)) };
}

export const getProblemBySlug = cache(async (slug: string): Promise<CodingProblem | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coding_problems")
    .select(
      "id, slug, title, difficulty, topic, tags, description, input_format, output_format, constraints, examples, function_name, starter_code, solution_explanation, is_published, created_by, created_at",
    )
    .eq("slug", slug)
    .maybeSingle<CodingProblem>();
  if (!data) return null;
  return {
    ...data,
    tags: data.tags ?? [],
    constraints: data.constraints ?? [],
    examples: Array.isArray(data.examples) ? data.examples : [],
    starter_code: data.starter_code ?? {},
  };
});

/**
 * Sample tests only. RLS already hides non-sample tests from students, but staff
 * can read all of them — filter explicitly so the browser never receives hidden tests.
 */
export async function getSampleTests(problemId: string): Promise<TestCase[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coding_problem_test_cases")
    .select("id, problem_id, input, expected_output, is_sample, position")
    .eq("problem_id", problemId)
    .eq("is_sample", true)
    .order("position", { ascending: true })
    .overrideTypes<TestCase[], { merge: false }>();
  return (data ?? []).map((t) => ({ ...t, input: Array.isArray(t.input) ? t.input : [t.input] }));
}

export async function getMySubmissions(problemId: string, userId: string, limit = 50): Promise<SubmissionSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coding_submissions")
    .select("id, language, code, verdict, passed_count, total_count, runtime_ms, created_at")
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<SubmissionSummary[], { merge: false }>();
  return data ?? [];
}

/** Whether the user has ever had an accepted submission (not limited to the latest N submissions). */
export async function hasSolvedProblem(problemId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("coding_submissions")
    .select("id", { count: "exact", head: true })
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .eq("verdict", "accepted");
  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const VERDICTS = ["pending", "accepted", "wrong_answer", "runtime_error", "compile_error", "time_limit"] as const;

const submissionSchema = z
  .object({
    problemId: z.guid({ message: "Invalid problem" }),
    language: z.enum(["java", "javascript", "python"]),
    code: z
      .string()
      .max(MAX_CODE_LENGTH, `Code must be at most ${MAX_CODE_LENGTH.toLocaleString()} characters`)
      .refine((c) => c.trim().length > 0, "Code is empty"),
    verdict: z.enum(VERDICTS),
    passedCount: z.number().int().min(0).max(1000),
    totalCount: z.number().int().min(0).max(1000),
    runtimeMs: z.number().int().min(0).max(600_000).nullable(),
  })
  .refine((v) => v.passedCount <= v.totalCount, { message: "Invalid test counts", path: ["passedCount"] });

export type CreateSubmissionInput = z.input<typeof submissionSchema>;

/**
 * Record a submission.
 *
 * MVP TRUST MODEL: the verdict and counts are computed in the student's browser
 * against SAMPLE tests only (hidden tests are not readable by students via RLS)
 * and are trusted as reported. A real judge must run hidden tests server-side in
 * the sandbox service and write the verdict with the service role; this action
 * would then only enqueue the code with verdict "pending".
 */
export async function createSubmission(input: CreateSubmissionInput): Promise<ActionResult<SubmissionSummary>> {
  "use server";
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission" };
  const v = parsed.data;

  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in to submit." };

  try {
    const supabase = await createClient();
    const { data: problem } = await supabase
      .from("coding_problems")
      .select("id, slug")
      .eq("id", v.problemId)
      .eq("is_published", true)
      .maybeSingle<{ id: string; slug: string }>();
    if (!problem) return { ok: false, error: "Problem not found." };

    // Sanity rules on the reported verdict (still client-trusted, see above).
    let verdict: CodeVerdict = v.verdict;
    const sandboxConfigured = Boolean(process.env.NEXT_PUBLIC_CODE_RUNNER_URL);
    if (v.language !== "javascript" && !sandboxConfigured) verdict = "pending";
    if (verdict === "accepted" && (v.totalCount === 0 || v.passedCount < v.totalCount)) verdict = "wrong_answer";

    const { data, error } = await supabase
      .from("coding_submissions")
      .insert({
        user_id: user.id,
        problem_id: problem.id,
        language: v.language,
        code: v.code,
        verdict,
        passed_count: verdict === "pending" ? 0 : v.passedCount,
        total_count: v.totalCount,
        runtime_ms: verdict === "pending" ? null : v.runtimeMs,
      })
      .select("id, language, code, verdict, passed_count, total_count, runtime_ms, created_at")
      .single<SubmissionSummary>();
    if (error) return { ok: false, error: errorMessage(error) };

    revalidatePath("/practice");
    revalidatePath(`/practice/${problem.slug}`);
    return {
      ok: true,
      data,
      message: verdict === "accepted" ? "Accepted — nice work!" : verdict === "pending" ? "Submitted for judging" : "Submitted",
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export type CreateSubmissionAction = typeof createSubmission;
