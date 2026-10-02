import { z } from "zod";

// Shared by the settings forms (client) and server actions. No transforms so
// react-hook-form input/output types match; normalization happens in actions.

export const GOAL_VALUES = [
  "software_developer",
  "full_stack_developer",
  "backend_developer",
  "frontend_developer",
  "data_engineer",
  "ai_engineer",
  "cs_fundamentals",
] as const;

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(80, "Name is too long"),
  username: z
    .string()
    .trim()
    .max(24, "At most 24 characters")
    .regex(/^([a-z0-9_]{3,24})?$/, "3–24 characters: lowercase letters, numbers and underscores"),
  bio: z.string().max(280, "Keep it under 280 characters"),
  avatar_url: z.union([z.literal(""), z.url("Enter a valid URL").max(500).regex(/^https:\/\//, "Use an https:// URL")]),
  learning_goal: z.union([z.literal(""), z.enum(GOAL_VALUES)]),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Use at most 72 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
export type PasswordValues = z.infer<typeof passwordSchema>;

