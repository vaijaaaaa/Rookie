import "server-only";
import type { Roadmap, RoadmapNode } from "@/types";
import type { StaffContext } from "./context";

export async function getManagedRoadmap(ctx: StaffContext, id: string): Promise<Roadmap | null> {
  const { data } = await ctx.supabase.from("roadmaps").select("*").eq("id", id).maybeSingle<Roadmap>();
  if (!data) return null;
  if (!ctx.isAdmin && data.created_by !== ctx.profile.id) return null;
  return data;
}

export interface SectionWithTopics extends RoadmapNode {
  topics: RoadmapNode[];
}

export async function getRoadmapTree(ctx: StaffContext, roadmapId: string): Promise<SectionWithTopics[]> {
  const { data } = await ctx.supabase
    .from("roadmap_nodes")
    .select("id, roadmap_id, parent_id, kind, title, description, course_id, lesson_id, position, created_at")
    .eq("roadmap_id", roadmapId)
    .order("position")
    .order("created_at")
    .overrideTypes<RoadmapNode[], { merge: false }>();
  const nodes = data ?? [];
  const sections = nodes.filter((n) => n.parent_id === null);
  return sections.map((s) => ({ ...s, topics: nodes.filter((n) => n.parent_id === s.id) }));
}
