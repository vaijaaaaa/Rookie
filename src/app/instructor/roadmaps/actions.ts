"use server";

import { revalidatePath } from "next/cache";
import { dbError, invalid, nn, NOT_PERMITTED, withStaff } from "@/services/instructor/context";
import { moveRow, nextPosition } from "@/services/instructor/reorder";
import { roadmapNodeSchema, roadmapSchema, type RoadmapInput, type RoadmapNodeInput } from "@/services/instructor/schemas";
import { splitList } from "@/services/instructor/utils";
import type { ActionResult } from "@/types";

function revalidate(id?: string) {
  revalidatePath("/instructor/roadmaps");
  if (id) revalidatePath(`/instructor/roadmaps/${id}`);
  revalidatePath("/roadmaps", "layout");
}

export async function saveRoadmap(id: string | null, input: RoadmapInput): Promise<ActionResult<{ id: string }>> {
  return withStaff<{ id: string }>(async (ctx) => {
    const parsed = roadmapSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const row = { ...v, goal: v.goal || null, prerequisites: splitList(v.prerequisites) };
    if (!id) {
      const { data, error } = await ctx.supabase
        .from("roadmaps")
        .insert({ ...row, created_by: ctx.profile.id })
        .select("id")
        .single<{ id: string }>();
      if (error) return dbError(error);
      revalidate();
      return { ok: true, data: { id: data.id }, message: "Roadmap created" };
    }
    const { data, error } = await ctx.supabase.from("roadmaps").update(row).eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate(id);
    return { ok: true, data: { id }, message: "Roadmap saved" };
  });
}

export async function deleteRoadmap(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("roadmaps").delete().eq("id", id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate();
    return { ok: true };
  });
}

export async function createNode(roadmapId: string, parentId: string | null, input: RoadmapNodeInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = roadmapNodeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const position = await nextPosition(ctx.supabase, "roadmap_nodes", { roadmap_id: roadmapId, parent_id: parentId });
    const { error } = await ctx.supabase.from("roadmap_nodes").insert({
      roadmap_id: roadmapId,
      parent_id: parentId,
      kind: parentId ? "topic" : "section",
      title: v.title,
      description: v.description,
      course_id: nn(v.course_id),
      lesson_id: parentId ? nn(v.lesson_id) : null,
      position,
    });
    if (error) return dbError(error);
    revalidate(roadmapId);
    return { ok: true, message: parentId ? "Topic added" : "Section added" };
  });
}

export async function updateNode(id: string, input: RoadmapNodeInput): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const parsed = roadmapNodeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const { data: node } = await ctx.supabase
      .from("roadmap_nodes")
      .select("roadmap_id, parent_id")
      .eq("id", id)
      .maybeSingle<{ roadmap_id: string; parent_id: string | null }>();
    if (!node) return NOT_PERMITTED;
    const { data, error } = await ctx.supabase
      .from("roadmap_nodes")
      .update({
        title: v.title,
        description: v.description,
        course_id: nn(v.course_id),
        lesson_id: node.parent_id ? nn(v.lesson_id) : null,
      })
      .eq("id", id)
      .select("id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate(node.roadmap_id);
    return { ok: true, message: "Saved" };
  });
}

export async function deleteNode(id: string): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data, error } = await ctx.supabase.from("roadmap_nodes").delete().eq("id", id).select("roadmap_id");
    if (error) return dbError(error);
    if (!data?.length) return NOT_PERMITTED;
    revalidate((data[0] as { roadmap_id: string }).roadmap_id);
    return { ok: true };
  });
}

export async function moveNode(id: string, direction: "up" | "down"): Promise<ActionResult> {
  return withStaff(async (ctx) => {
    const { data: node } = await ctx.supabase
      .from("roadmap_nodes")
      .select("roadmap_id, parent_id")
      .eq("id", id)
      .maybeSingle<{ roadmap_id: string; parent_id: string | null }>();
    if (!node) return NOT_PERMITTED;
    const res = await moveRow(ctx.supabase, "roadmap_nodes", id, { roadmap_id: node.roadmap_id, parent_id: node.parent_id }, direction);
    if (res.ok) revalidate(node.roadmap_id);
    return res;
  });
}
