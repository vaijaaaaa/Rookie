"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";
import type { ActionResult, UserRole } from "@/types";

const schema = z.object({
  userId: z.guid(),
  role: z.enum(["student", "admin"]),
});

export async function setUserRole(input: { userId: string; role: UserRole }): Promise<ActionResult> {
  const me = await requireRole(["admin"]);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid role change request" };
  const { userId, role } = parsed.data;

  if (userId === me.id && role !== "admin") {
    return { ok: false, error: "You cannot demote yourself" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });
  if (error) return { ok: false, error: errorMessage(error) };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin");
  return { ok: true, message: `Role updated to ${role}` };
}
