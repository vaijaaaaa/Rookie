"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { INTEREST_OPTIONS } from "@/components/onboarding/options";
import type { ActionResult, Difficulty } from "@/types";

const schema = z.object({
  goal: z.enum([
    "software_developer",
    "full_stack_developer",
    "backend_developer",
    "frontend_developer",
    "data_engineer",
    "ai_engineer",
    "cs_fundamentals",
  ]),
  experience: z.enum(["beginner", "some_experience", "intermediate"]),
  interests: z.array(z.enum(INTEREST_OPTIONS)).max(INTEREST_OPTIONS.length),
});
export type OnboardingInput = z.infer<typeof schema>;

export interface RecommendedRoadmap {
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  estimated_weeks: number;
  topic_count: number;
}

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<ActionResult<{ roadmap: RecommendedRoadmap | null }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please answer every question." };

  const user = await getUser();
  if (!user) return { ok: false, error: "Your session expired. Log in again." };

  const supabase = await createClient();
  const { data: slug, error } = await supabase.rpc("complete_onboarding", {
    p_goal: parsed.data.goal,
    p_experience: parsed.data.experience,
    p_interests: parsed.data.interests,
  });
  if (error) return { ok: false, error: "Couldn't save your answers. Please try again." };

  let roadmap: RecommendedRoadmap | null = null;
  if (typeof slug === "string" && slug) {
    const { data } = await supabase
      .from("roadmaps")
      .select("slug, title, summary, difficulty, estimated_weeks, roadmap_nodes(count)")
      .eq("slug", slug)
      .eq("roadmap_nodes.kind", "topic")
      .maybeSingle<Omit<RecommendedRoadmap, "topic_count"> & { roadmap_nodes: { count: number }[] | null }>();
    if (data) {
      const { roadmap_nodes, ...rest } = data;
      roadmap = { ...rest, topic_count: roadmap_nodes?.[0]?.count ?? 0 };
    }
  }

  // No revalidatePath here: it would re-render /onboarding, which redirects onboarded users
  // away before the result screen shows. All app routes are dynamic, so they read fresh data.
  return { ok: true, data: { roadmap } };
}
