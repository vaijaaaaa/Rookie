import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Roadmap, RoadmapNode, RoadmapProgressRow } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoadmapCard = Pick<
  Roadmap,
  "id" | "slug" | "title" | "summary" | "difficulty" | "estimated_weeks" | "goal"
> & {
  sectionCount: number;
  topicCount: number;
  completedTopics: number;
  percent: number;
  following: boolean;
  current: boolean;
};

export type RoadmapDetail = Pick<
  Roadmap,
  "id" | "slug" | "title" | "summary" | "description" | "difficulty" | "estimated_weeks" | "goal" | "prerequisites"
>;

export type TopicState = "completed" | "current" | "upcoming";

export interface RoadmapTopic {
  id: string;
  title: string;
  description: string;
  /** Link target when the topic maps to a lesson (or course). */
  href: string | null;
  /** Lesson-linked topics complete automatically; others are marked manually. */
  manual: boolean;
  completed: boolean;
  state: TopicState;
}

export interface RoadmapSection {
  id: string;
  title: string;
  description: string;
  href: string | null;
  topics: RoadmapTopic[];
  completedTopics: number;
  percent: number;
}

export interface RoadmapPath {
  roadmap: RoadmapDetail;
  sections: RoadmapSection[];
  totalTopics: number;
  completedTopics: number;
  percent: number;
  /** Id of the first incomplete topic, if any. */
  currentTopicId: string | null;
}

type NodeRow = Pick<RoadmapNode, "id" | "parent_id" | "kind" | "title" | "description" | "position" | "lesson_id" | "course_id"> & {
  lesson: { slug: string; course: { slug: string } | null } | null;
  course: { slug: string } | null;
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Per-roadmap topic totals + current user's completion (RPC). Memoized per request. */
export const getRoadmapsProgress = cache(async (): Promise<Map<string, RoadmapProgressRow>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_roadmaps_progress");
  const rows = (data ?? []) as RoadmapProgressRow[];
  return new Map(rows.map((r) => [r.roadmap_id, r]));
});

export async function getFollowedRoadmapIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roadmap_enrollments")
    .select("roadmap_id")
    .eq("user_id", userId)
    .overrideTypes<{ roadmap_id: string }[], { merge: false }>();
  return new Set((data ?? []).map((r) => r.roadmap_id));
}

/** Published roadmaps as cards. Pass the signed-in profile to include progress/follow state. */
export async function listRoadmapCards(
  viewer: { id: string; primary_roadmap_id: string | null } | null,
): Promise<RoadmapCard[]> {
  const supabase = await createClient();
  const [{ data: roadmaps }, progress, followed] = await Promise.all([
    supabase
      .from("roadmaps")
      .select("id,slug,title,summary,difficulty,estimated_weeks,goal,created_at,roadmap_nodes(kind)")
      .eq("is_published", true)
      .order("created_at", { ascending: true })
      .overrideTypes<
        (RoadmapCard & { roadmap_nodes: { kind: RoadmapNode["kind"] }[] | null })[],
        { merge: false }
      >(),
    getRoadmapsProgress(),
    viewer ? getFollowedRoadmapIds(viewer.id) : Promise.resolve(new Set<string>()),
  ]);

  return (roadmaps ?? []).map(({ roadmap_nodes, ...r }) => {
    const nodes = roadmap_nodes ?? [];
    const p = progress.get(r.id);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      difficulty: r.difficulty,
      estimated_weeks: r.estimated_weeks,
      goal: r.goal,
      sectionCount: nodes.filter((n) => n.kind === "section").length,
      topicCount: nodes.filter((n) => n.kind === "topic").length,
      completedTopics: viewer ? (p?.completed_topics ?? 0) : 0,
      percent: viewer ? (p?.percent ?? 0) : 0,
      following: followed.has(r.id),
      current: viewer?.primary_roadmap_id === r.id,
    };
  });
}

export const getRoadmapBySlug = cache(async (slug: string): Promise<RoadmapDetail | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roadmaps")
    .select("id,slug,title,summary,description,difficulty,estimated_weeks,goal,prerequisites")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle<RoadmapDetail>();
  return data ?? null;
});

export async function isFollowingRoadmap(userId: string, roadmapId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("roadmap_enrollments")
    .select("roadmap_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("roadmap_id", roadmapId);
  return (count ?? 0) > 0;
}

/**
 * Builds the visual path: ordered sections → topics with completion and
 * current/upcoming state. Completion comes from get_roadmap_progress.
 */
export async function getRoadmapPath(roadmap: RoadmapDetail, signedIn: boolean): Promise<RoadmapPath> {
  const supabase = await createClient();
  const [{ data: nodes }, { data: progressRows }] = await Promise.all([
    supabase
      .from("roadmap_nodes")
      .select(
        "id,parent_id,kind,title,description,position,lesson_id,course_id," +
          "lesson:lessons!roadmap_nodes_lesson_id_fkey(slug,course:courses!lessons_course_id_fkey(slug)),course:courses!roadmap_nodes_course_id_fkey(slug)",
      )
      .eq("roadmap_id", roadmap.id)
      .order("position", { ascending: true })
      .overrideTypes<NodeRow[], { merge: false }>(),
    signedIn
      ? supabase.rpc("get_roadmap_progress", { p_roadmap_id: roadmap.id })
      : Promise.resolve({ data: [] }),
  ]);

  const rows = (progressRows ?? []) as { node_id: string; completed: boolean }[];
  const done = new Set(rows.filter((r) => r.completed).map((r) => r.node_id));
  const all = nodes ?? [];

  const hrefFor = (n: NodeRow): string | null => {
    if (n.lesson?.course?.slug) return `/courses/${n.lesson.course.slug}/lessons/${n.lesson.slug}`;
    if (n.course?.slug) return `/courses/${n.course.slug}`;
    return null;
  };

  const sectionsRaw = all.filter((n) => n.kind === "section" && !n.parent_id);
  let currentTopicId: string | null = null;
  let totalTopics = 0;
  let completedTopics = 0;

  const sections: RoadmapSection[] = sectionsRaw.map((s) => {
    const topics: RoadmapTopic[] = all
      .filter((n) => n.parent_id === s.id)
      .map((t) => {
        const completed = done.has(t.id);
        totalTopics += 1;
        if (completed) completedTopics += 1;
        let state: TopicState = completed ? "completed" : "upcoming";
        if (!completed && signedIn && currentTopicId === null) {
          currentTopicId = t.id;
          state = "current";
        }
        return {
          id: t.id,
          title: t.title,
          description: t.description,
          href: hrefFor(t),
          // Lesson-linked topics follow lesson completion; everything else is manual — including topics whose
          // lesson the viewer can't see (RLS hides it), which would otherwise be impossible to complete.
          manual: !t.lesson_id || !t.lesson,
          completed,
          state,
        };
      });
    const sectionDone = topics.filter((t) => t.completed).length;
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      href: hrefFor(s),
      topics,
      completedTopics: sectionDone,
      percent: topics.length > 0 ? Math.round((sectionDone / topics.length) * 100) : 0,
    };
  });

  return {
    roadmap,
    sections,
    totalTopics,
    completedTopics,
    percent: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
    currentTopicId,
  };
}
