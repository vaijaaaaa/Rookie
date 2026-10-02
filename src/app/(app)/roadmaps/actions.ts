"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

const uuid = z.guid();
const slug = z.string().min(1).max(200);

/**
 * Form action: follow a roadmap (RPC enroll_in_roadmap). `primary=true` also
 * sets it as the user's current roadmap; this is also how "Set as current" works.
 */
export async function followRoadmapAction(formData: FormData): Promise<void> {
  const parsed = z
    .object({ roadmapId: uuid, roadmapSlug: slug, primary: z.enum(["true", "false"]) })
    .safeParse({
      roadmapId: formData.get("roadmapId"),
      roadmapSlug: formData.get("roadmapSlug"),
      primary: formData.get("primary") ?? "true",
    });
  if (!parsed.success) throw new Error("Invalid roadmap");
  const { roadmapId, roadmapSlug, primary } = parsed.data;

  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/roadmaps/${roadmapSlug}`)}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("enroll_in_roadmap", {
    p_roadmap_id: roadmapId,
    p_make_primary: primary === "true",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/roadmaps");
  revalidatePath(`/roadmaps/${roadmapSlug}`);
  revalidatePath("/dashboard");
}

const nodeSchema = z.object({ nodeId: uuid, roadmapSlug: slug, done: z.boolean() });

/** Manually mark a roadmap topic (one without a linked lesson) done / not done. */
export async function setRoadmapNodeDone(input: z.input<typeof nodeSchema>): Promise<ActionResult> {
  const parsed = nodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  const { nodeId, roadmapSlug, done } = parsed.data;

  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to track progress" };

  const supabase = await createClient();
  const { error } = done
    ? await supabase
        .from("roadmap_node_progress")
        .upsert({ user_id: user.id, node_id: nodeId }, { onConflict: "user_id,node_id", ignoreDuplicates: true })
    : await supabase.from("roadmap_node_progress").delete().eq("user_id", user.id).eq("node_id", nodeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/roadmaps/${roadmapSlug}`);
  revalidatePath("/roadmaps");
  return { ok: true };
}
