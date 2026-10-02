import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ClassStatus, Difficulty, LearningGoal, ProblemDifficulty } from "@/types";

export interface LandingRoadmap {
  id: string;
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  estimated_weeks: number;
  goal: LearningGoal | null;
  topic_count: number;
}

export interface LandingClass {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  status: ClassStatus;
  course_title: string | null;
  instructor_name: string | null;
}

export interface LandingData {
  roadmaps: LandingRoadmap[];
  roadmapGoals: Partial<Record<LearningGoal, number>>;
  classes: LandingClass[];
  problems: { total: number; byDifficulty: Record<ProblemDifficulty, number> };
}

type RoadmapRow = Omit<LandingRoadmap, "topic_count"> & { roadmap_nodes: { count: number }[] | null };
type ClassRow = Omit<LandingClass, "course_title" | "instructor_name"> & {
  course: { title: string } | null;
  instructor: { full_name: string } | null;
};

/** All landing queries in parallel. Every query degrades to an empty value on error. */
export async function getLandingData(): Promise<LandingData> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const problemCount = (difficulty?: ProblemDifficulty) => {
    let q = supabase.from("coding_problems").select("id", { count: "exact", head: true }).eq("is_published", true);
    if (difficulty) q = q.eq("difficulty", difficulty);
    return q;
  };

  const [roadmapsRes, goalsRes, classesRes, totalRes, easyRes, mediumRes, hardRes] = await Promise.all([
    supabase
      .from("roadmaps")
      .select("id, slug, title, summary, difficulty, estimated_weeks, goal, roadmap_nodes(count)")
      .eq("is_published", true)
      .eq("roadmap_nodes.kind", "topic")
      .order("created_at", { ascending: true })
      .limit(4)
      .overrideTypes<RoadmapRow[], { merge: false }>(),
    supabase
      .from("roadmaps")
      .select("goal")
      .eq("is_published", true)
      .not("goal", "is", null)
      .overrideTypes<{ goal: LearningGoal }[], { merge: false }>(),
    supabase
      .from("classes")
      .select(
        "id, title, starts_at, duration_minutes, status, course:courses!classes_course_id_fkey(title), instructor:profiles!classes_instructor_id_fkey(full_name)",
      )
      .gt("starts_at", nowIso)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true })
      .limit(3)
      .overrideTypes<ClassRow[], { merge: false }>(),
    problemCount(),
    problemCount("easy"),
    problemCount("medium"),
    problemCount("hard"),
  ]);

  const roadmaps: LandingRoadmap[] = (roadmapsRes.data ?? []).map(({ roadmap_nodes, ...r }) => ({
    ...r,
    topic_count: roadmap_nodes?.[0]?.count ?? 0,
  }));

  const roadmapGoals: Partial<Record<LearningGoal, number>> = {};
  for (const row of goalsRes.data ?? []) roadmapGoals[row.goal] = (roadmapGoals[row.goal] ?? 0) + 1;

  const classes: LandingClass[] = (classesRes.data ?? []).map(({ course, instructor, ...c }) => ({
    ...c,
    course_title: course?.title ?? null,
    instructor_name: instructor?.full_name ?? null,
  }));

  return {
    roadmaps,
    roadmapGoals,
    classes,
    problems: {
      total: totalRes.count ?? 0,
      byDifficulty: { easy: easyRes.count ?? 0, medium: mediumRes.count ?? 0, hard: hardRes.count ?? 0 },
    },
  };
}
