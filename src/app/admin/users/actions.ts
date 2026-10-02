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

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a name").max(80, "Name is too long"),
  email: z.email("Enter a valid email").transform((e) => e.trim().toLowerCase()),
  role: z.enum(["student", "admin"]),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
});

/** Admin-only account creation. The DB function re-checks is_admin(). */
export async function createUser(input: z.input<typeof createSchema>): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin"]);
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { fullName, email, role, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_user", {
    p_email: email,
    p_full_name: fullName,
    p_password: password,
    p_role: role,
  });
  if (error) return { ok: false, error: errorMessage(error) };

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true, data: { id: data as string }, message: `${fullName} can now log in` };
}

const passwordSchema = z.object({
  userId: z.guid(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
});

export async function resetUserPassword(input: { userId: string; password: string }): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_password", {
    p_user: parsed.data.userId,
    p_password: parsed.data.password,
  });
  if (error) return { ok: false, error: errorMessage(error) };
  return { ok: true, message: "Password updated" };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const me = await requireRole(["admin"]);
  const id = z.guid().safeParse(userId);
  if (!id.success) return { ok: false, error: "Invalid user" };
  if (id.data === me.id) return { ok: false, error: "You cannot delete your own account" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_user", { p_user: id.data });
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true, message: "User deleted" };
}
