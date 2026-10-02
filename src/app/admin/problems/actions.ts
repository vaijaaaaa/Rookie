"use server";

import { revalidatePath } from "next/cache";
import { dbError, invalid, NOT_PERMITTED, withStaff } from "@/services/instructor/context";
import { moveRow, nextPosition } from "@/services/instructor/reorder";
import { problemSchema, testCaseSchema, type ProblemInput, type TestCaseInput } from "@/services/instructor/schemas";
import { splitList } from "@/services/instructor/utils";
import type { ActionResult } from "@/types";

function revalidate(id?: string) {
  revalidatePath("/admin/problems");
  if (id) revalidatePath(`/admin/problems/${id}`);
  revalidatePath("/practice", "layout");
}

export async function saveProblem(id: string | null, input: ProblemInput): Promise<ActionResult<{ id: string }>> {
  return withStaff<{ id: string }>(async (ctx) => {
    const parsed = problemSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { starter_java, starter_javascript, starter_python, tags, constraints, examples, ...v } = parsed.data;
    const starter_code: Record<string, string> = {};
    if (starter_java.trim()) starter_code.java = starter_java;
    if (starter_javascript.trim()) starter_code.javascript = starter_javascript;
    if (starter_python.trim()) starter_code.python = starter_python;
    const row = {
      ...v,
      tags: splitList(tags).map((t) => t.toLowerCase()),
      constraints: splitList(constraints, /\r?\n/),
      examples: examples.map((e) => (e.explanation.trim() ? e : { input: e.input, output: e.output })),
      starter_code,
    };
    if (!id) {
      const { data, error } = await ctx.supabase
        .from("coding_problems")
        .insert({ ...row, created_by: ctx.profile.id })
        .select("id")
        .single<{ id: string }>();
      if (error) return dbError(error);
      revalidate();
      return { ok: true, data: { id: data.id }, message: "Problem created" };
    }
    const { data, error } = await ctx.supabase.from("coding_problems").update(row).eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate(id);
    return { ok: true, data: { id }, message: "Problem saved" };
  });
}

export async function deleteProblem(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("coding_problems").delete().eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate();
    return { ok: true };
  });
}

function toRow(v: TestCaseInput) {
  return { input: JSON.parse(v.input) as unknown[], expected_output: JSON.parse(v.expected_output) as unknown, is_sample: v.is_sample };
}

export async function createTestCase(problemId: string, input: TestCaseInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = testCaseSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const position = await nextPosition(ctx.supabase, "coding_problem_test_cases", { problem_id: problemId });
    const { error } = await ctx.supabase
      .from("coding_problem_test_cases")
      .insert({ ...toRow(parsed.data), problem_id: problemId, position });
    if (error) return dbError(error);
    revalidate(problemId);
    return { ok: true, message: "Test case added" };
  });
}

export async function updateTestCase(id: string, input: TestCaseInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = testCaseSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { data, error } = await ctx.supabase.from("coding_problem_test_cases").update(toRow(parsed.data)).eq("id", id).select("problem_id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate((data[0] as { problem_id: string }).problem_id);
    return { ok: true, message: "Test case saved" };
  });
}

export async function deleteTestCase(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("coding_problem_test_cases").delete().eq("id", id).select("problem_id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate((data[0] as { problem_id: string }).problem_id);
    return { ok: true };
  });
}

export async function moveTestCase(id: string, direction: "up" | "down"): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data } = await ctx.supabase
      .from("coding_problem_test_cases")
      .select("problem_id")
      .eq("id", id)
      .maybeSingle<{ problem_id: string }>();
    if (!data) return NOT_PERMITTED;
    const res = await moveRow(ctx.supabase, "coding_problem_test_cases", id, { problem_id: data.problem_id }, direction);
    if (res.ok) revalidate(data.problem_id);
    return res;
  });
}
