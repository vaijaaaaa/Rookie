import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { addDays, APP_TIME_ZONE, startOfWeek, dateInTz } from "@/components/agenda/tz";
import type { Achievement, ActivityType, ProblemDifficulty, Profile, UserAchievement } from "@/types";
import { getCourseProgress, getEnrolledCourses, getMyStats } from "./dashboard";

export { getMyStats };

const DIFFICULTIES: ProblemDifficulty[] = ["easy", "medium", "hard"];

/** Published problem counts per difficulty (head-only count queries). */
export const getProblemTotals = cache(async (): Promise<Record<ProblemDifficulty, number>> => {
  const supabase = await createClient();
  const results = await Promise.all(
    DIFFICULTIES.map((d) =>
      supabase
        .from("coding_problems")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .eq("difficulty", d),
    ),
  );
  return {
    easy: results[0].count ?? 0,
    medium: results[1].count ?? 0,
    hard: results[2].count ?? 0,
  };
});

export interface TopicProgress {
  topic: string;
  total: number;
  solved: number;
}

export async function getTopicProgress(): Promise<TopicProgress[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_topic_progress");
  return (data as TopicProgress[] | null) ?? [];
}

export interface ActivityCalendar {
  today: string;
  /** Monday of the first rendered week */
  start: string;
  weeks: { date: string; count: number; future: boolean }[][];
  total: number;
  activeDays: number;
  weekly: { week: string; count: number }[];
}

/** 12-week heatmap + 8-week weekly totals from get_my_activity. */
export async function getActivityCalendar(profile: Pick<Profile, "timezone">, weeks = 12): Promise<ActivityCalendar> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_activity", { p_days: weeks * 7 + 7 });
  const counts = new Map(((data as { day: string; count: number }[] | null) ?? []).map((r) => [r.day, r.count]));

  const today = dateInTz(new Date(), APP_TIME_ZONE);
  const start = addDays(startOfWeek(today), -(weeks - 1) * 7);
  const grid: ActivityCalendar["weeks"] = [];
  let total = 0;
  let activeDays = 0;
  for (let w = 0; w < weeks; w++) {
    const col: ActivityCalendar["weeks"][number] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const count = counts.get(date) ?? 0;
      const future = date > today;
      if (!future) {
        total += count;
        if (count > 0) activeDays++;
      }
      col.push({ date, count, future });
    }
    grid.push(col);
  }

  const weekly = grid.slice(-8).map((col) => ({
    week: col[0]!.date,
    count: col.reduce((s, c) => s + (c.future ? 0 : c.count), 0),
  }));

  return { today, start, weeks: grid, total, activeDays, weekly };
}

export interface CourseProgressItem {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
  completed: number;
  total: number;
  percent: number;
}

export async function getEnrolledCourseProgress(userId: string): Promise<CourseProgressItem[]> {
  const [courses, progress] = await Promise.all([getEnrolledCourses(userId), getCourseProgress()]);
  return courses.map((c) => {
    const p = progress.get(c.id);
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      icon: c.icon,
      completed: p?.completed_lessons ?? 0,
      total: p?.total_lessons ?? 0,
      percent: p?.percent ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface AchievementView {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  /** progress toward unlocking (null when not cheaply computable) */
  current: number | null;
  target: number;
  unit: string;
  note: string | null;
}

const COUNT_UNITS: Record<ActivityType, string> = {
  lesson_completed: "lessons",
  problem_solved: "problems",
  class_attended: "classes",
  assignment_submitted: "assignments",
  roadmap_node_completed: "topics",
  course_completed: "courses",
  achievement_unlocked: "achievements",
};

export async function getAchievements(userId: string): Promise<AchievementView[]> {
  const supabase = await createClient();
  const [defsRes, mineRes, stats] = await Promise.all([
    supabase
      .from("achievements")
      .select("*")
      .order("position")
      .overrideTypes<Achievement[], { merge: false }>(),
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", userId)
      .overrideTypes<Pick<UserAchievement, "achievement_id" | "unlocked_at">[], { merge: false }>(),
    getMyStats(),
  ]);
  const defs = defsRes.data ?? [];
  const unlocked = new Map((mineRes.data ?? []).map((u) => [u.achievement_id, u.unlocked_at]));

  // Exact per-activity counts (same source check_achievements uses), one head query per type.
  const activityTypes = [
    ...new Set(
      defs
        .filter((d) => !unlocked.has(d.id) && d.criteria?.kind === "count" && d.criteria.activity)
        .map((d) => d.criteria.activity as ActivityType),
    ),
  ];
  const countEntries = await Promise.all(
    activityTypes.map(async (type) => {
      const { count } = await supabase
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", type);
      return [type, count ?? 0] as const;
    }),
  );
  const counts = new Map(countEntries);

  return defs.map((d) => {
    const c = d.criteria ?? { kind: "count", threshold: 1 };
    const target = Math.max(1, Number(c.threshold) || 1);
    let current: number | null = null;
    let unit = "";
    let note: string | null = null;
    if (c.kind === "count" && c.activity) {
      current = counts.get(c.activity) ?? null;
      unit = COUNT_UNITS[c.activity] ?? "";
    } else if (c.kind === "streak") {
      current = stats.longest_streak;
      unit = "day streak";
    } else if (c.kind === "attendance_rate") {
      const min = c.min_classes ?? 5;
      unit = "% attendance";
      if (stats.classes_total >= min) {
        current = Math.floor((stats.classes_attended * 100) / Math.max(stats.classes_total, 1));
      } else {
        current = null;
        note = `${stats.classes_total} / ${min} classes needed to qualify`;
      }
    }
    return {
      id: d.id,
      code: d.code,
      title: d.title,
      description: d.description,
      icon: d.icon,
      unlockedAt: unlocked.get(d.id) ?? null,
      current: current === null ? null : Math.min(current, target),
      target,
      unit,
      note,
    };
  });
}
