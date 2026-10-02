import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { addDays, APP_TIME_ZONE, dateInTz, diffDays } from "@/components/agenda/tz";

export interface DailyQuestion {
  id: string;
  question_date: string; // yyyy-MM-dd (IST day)
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface DailyAnswer {
  id: string;
  question_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type TrackDayState = "answered" | "missed" | "open" | "none";

export interface TrackDay {
  date: string;
  state: TrackDayState;
}

export interface DailyTrack {
  days: TrackDay[];
  streak: number;
  longest: number;
  answered: number;
  asked: number;
}

/** History window used for streaks and the "past questions" list. */
const HISTORY_DAYS = 365;

export function todayIST() {
  return dateInTz(new Date(), APP_TIME_ZONE);
}

/** A released question by IST date (RLS hides future ones from students). */
export async function getDailyQuestion(date: string): Promise<DailyQuestion | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_questions")
    .select("id, question_date, title, body, created_at, updated_at")
    .eq("question_date", date)
    .maybeSingle<DailyQuestion>();
  return data ?? null;
}

export async function getMyAnswer(userId: string, questionId: string): Promise<DailyAnswer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_question_answers")
    .select("id, question_id, user_id, content, created_at, updated_at")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle<DailyAnswer>();
  return data ?? null;
}

type HistoryRow = Pick<DailyQuestion, "id" | "question_date" | "title">;

/** Released questions of the last year plus which ones this user answered. */
export const getDailyHistory = cache(async (userId: string) => {
  const supabase = await createClient();
  const today = todayIST();
  const [questionsRes, answersRes] = await Promise.all([
    supabase
      .from("daily_questions")
      .select("id, question_date, title")
      .gte("question_date", addDays(today, -HISTORY_DAYS))
      .lte("question_date", today)
      .order("question_date", { ascending: false })
      .overrideTypes<HistoryRow[], { merge: false }>(),
    supabase
      .from("daily_question_answers")
      .select("question_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_DAYS + 30)
      .overrideTypes<{ question_id: string }[], { merge: false }>(),
  ]);
  const answeredIds = new Set((answersRes.data ?? []).map((a) => a.question_id));
  const questions = (questionsRes.data ?? []).map((q) => ({ ...q, answered: answeredIds.has(q.id) }));
  return { today, questions };
});

/**
 * Last `days` days as a track, plus streaks. Days without a question don't break a
 * streak; today's question doesn't break it until the day is over.
 */
export function buildTrack(
  today: string,
  questions: { question_date: string; answered: boolean }[],
  days = 30,
): DailyTrack {
  const byDate = new Map(questions.map((q) => [q.question_date, q.answered]));
  const track: TrackDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const q = byDate.get(date);
    const state: TrackDayState = q === undefined ? "none" : q ? "answered" : date === today ? "open" : "missed";
    track.push({ date, state });
  }

  // Oldest → newest over the whole history.
  const asc = [...questions].sort((a, b) => diffDays(a.question_date, b.question_date));
  let run = 0;
  let longest = 0;
  for (const q of asc) {
    if (q.answered) longest = Math.max(longest, ++run);
    else if (q.question_date !== today) run = 0;
  }
  return {
    days: track,
    streak: run,
    longest,
    answered: questions.filter((q) => q.answered).length,
    asked: questions.length,
  };
}
