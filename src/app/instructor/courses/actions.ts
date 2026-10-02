"use server";

import { revalidatePath } from "next/cache";
import { dbError, invalid, nn, NOT_PERMITTED, withStaff, type StaffContext } from "@/services/instructor/context";
import { moveRow, nextPosition } from "@/services/instructor/reorder";
import {
  courseSchema, lessonSchema, moduleSchema, newLessonSchema, resourceSchema,
  type CourseInput, type LessonInput, type ModuleInput, type NewLessonInput, type ResourceInput,
} from "@/services/instructor/schemas";
import type { ActionResult } from "@/types";

function revalidateCourse(courseId?: string) {
  revalidatePath("/instructor/courses");
  if (courseId) revalidatePath(`/instructor/courses/${courseId}`, "layout");
  revalidatePath("/courses", "layout");
}

async function courseOfModule(ctx: StaffContext, moduleId: string) {
  const { data } = await ctx.supabase.from("course_modules").select("course_id").eq("id", moduleId).maybeSingle<{ course_id: string }>();
  return data?.course_id ?? null;
}

async function lessonRef(ctx: StaffContext, lessonId: string) {
  const { data } = await ctx.supabase
    .from("lessons")
    .select("course_id, module_id")
    .eq("id", lessonId)
    .maybeSingle<{ course_id: string; module_id: string }>();
  return data;
}

// --- Course ----------------------------------------------------------------
export async function saveCourse(id: string | null, input: CourseInput): Promise<ActionResult<{ id: string }>> {
  return withStaff<{ id: string }>(async (ctx) => {
    const parsed = courseSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { instructor_id, ...v } = parsed.data;
    const row: Record<string, unknown> = { ...v, icon: nn(v.icon) };
    if (ctx.isAdmin) {
      if (nn(instructor_id)) row.instructor_id = instructor_id;
      else if (!id) row.instructor_id = ctx.profile.id;
    } else if (!id) {
      row.instructor_id = ctx.profile.id;
    }
    if (!id) {
      const { data, error } = await ctx.supabase.from("courses").insert(row).select("id").single<{ id: string }>();
      if (error) return dbError(error);
      revalidateCourse();
      return { ok: true, data: { id: data.id }, message: "Course created" };
    }
    const { data, error } = await ctx.supabase.from("courses").update(row).eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidateCourse(id);
    return { ok: true, data: { id }, message: "Course saved" };
  });
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("courses").delete().eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidateCourse();
    return { ok: true };
  });
}

// --- Modules ---------------------------------------------------------------
export async function createModule(courseId: string, input: ModuleInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = moduleSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const position = await nextPosition(ctx.supabase, "course_modules", { course_id: courseId });
    const { error } = await ctx.supabase.from("course_modules").insert({ ...parsed.data, course_id: courseId, position });
    if (error) return dbError(error);
    revalidateCourse(courseId);
    return { ok: true, message: "Module added" };
  });
}

export async function updateModule(id: string, input: ModuleInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = moduleSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { data, error } = await ctx.supabase.from("course_modules").update(parsed.data).eq("id", id).select("course_id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidateCourse((data[0] as { course_id: string }).course_id);
    return { ok: true, message: "Module saved" };
  });
}

export async function deleteModule(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("course_modules").delete().eq("id", id).select("course_id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidateCourse((data[0] as { course_id: string }).course_id);
    return { ok: true };
  });
}

export async function moveModule(id: string, direction: "up" | "down"): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const courseId = await courseOfModule(ctx, id);
    if (!courseId) return NOT_PERMITTED;
    const res = await moveRow(ctx.supabase, "course_modules", id, { course_id: courseId }, direction);
    if (res.ok) revalidateCourse(courseId);
    return res;
  });
}

// --- Lessons ---------------------------------------------------------------
export async function createLesson(moduleId: string, input: NewLessonInput): Promise<ActionResult<{ id: string; courseId: string }>> {
  return withStaff<{ id: string; courseId: string }>(async (ctx) => {
    const parsed = newLessonSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const courseId = await courseOfModule(ctx, moduleId);
    if (!courseId) return NOT_PERMITTED;
    const position = await nextPosition(ctx.supabase, "lessons", { module_id: moduleId });
    const { data, error } = await ctx.supabase
      .from("lessons")
      .insert({ ...parsed.data, module_id: moduleId, course_id: courseId, position, is_published: false })
      .select("id")
      .single<{ id: string }>();
    if (error) return dbError(error);
    revalidateCourse(courseId);
    return { ok: true, data: { id: data.id, courseId }, message: "Lesson created" };
  });
}

export async function saveLesson(id: string, input: LessonInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = lessonSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const { data, error } = await ctx.supabase
      .from("lessons")
      .update({ ...v, exercise: nn(v.exercise), video_url: nn(v.video_url) })
      .eq("id", id)
      .select("course_id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidateCourse((data[0] as { course_id: string }).course_id);
    return { ok: true, message: "Lesson saved" };
  });
}

export async function deleteLesson(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("lessons").delete().eq("id", id).select("course_id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidateCourse((data[0] as { course_id: string }).course_id);
    return { ok: true };
  });
}

export async function moveLesson(id: string, direction: "up" | "down"): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const ref = await lessonRef(ctx, id);
    if (!ref) return NOT_PERMITTED;
    const res = await moveRow(ctx.supabase, "lessons", id, { module_id: ref.module_id }, direction);
    if (res.ok) revalidateCourse(ref.course_id);
    return res;
  });
}

// --- Lesson resources ------------------------------------------------------
export async function createResource(lessonId: string, input: ResourceInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = resourceSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const ref = await lessonRef(ctx, lessonId);
    if (!ref) return NOT_PERMITTED;
    const position = await nextPosition(ctx.supabase, "lesson_resources", { lesson_id: lessonId });
    const { error } = await ctx.supabase.from("lesson_resources").insert({ ...parsed.data, lesson_id: lessonId, position });
    if (error) return dbError(error);
    revalidateCourse(ref.course_id);
    return { ok: true, message: "Resource added" };
  });
}

export async function updateResource(id: string, input: ResourceInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = resourceSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { data, error } = await ctx.supabase.from("lesson_resources").update(parsed.data).eq("id", id).select("lesson_id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    const ref = await lessonRef(ctx, (data[0] as { lesson_id: string }).lesson_id);
    revalidateCourse(ref?.course_id);
    return { ok: true, message: "Resource saved" };
  });
}

export async function deleteResource(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("lesson_resources").delete().eq("id", id).select("lesson_id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    const ref = await lessonRef(ctx, (data[0] as { lesson_id: string }).lesson_id);
    revalidateCourse(ref?.course_id);
    return { ok: true };
  });
}

export async function moveResource(id: string, direction: "up" | "down"): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data } = await ctx.supabase.from("lesson_resources").select("lesson_id").eq("id", id).maybeSingle<{ lesson_id: string }>();
    if (!data) return NOT_PERMITTED;
    const res = await moveRow(ctx.supabase, "lesson_resources", id, { lesson_id: data.lesson_id }, direction);
    if (res.ok) {
      const ref = await lessonRef(ctx, data.lesson_id);
      revalidateCourse(ref?.course_id);
    }
    return res;
  });
}
