// Zod schemas for instructor mutations. Shared by client forms and server actions.
// Schemas are "idempotent" (no transforms) so the same values validate on both sides.
import { z } from "zod";
import {
  AGENDA_ITEM_TYPES, ATTENDANCE_STATUSES, CLASS_STATUSES, DIFFICULTIES, LEARNING_GOALS, PRIORITIES,
  PROBLEM_DIFFICULTIES, RESOURCE_KINDS, SUBMISSION_TYPES,
} from "./utils";

const title = z.string().trim().min(2, "Title is required").max(200, "Keep it under 200 characters");
const text = (max = 20000) => z.string().max(max, `Keep it under ${max} characters`);
const slug = z
  .string()
  .trim()
  .min(2, "Slug is required")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only");
export const urlOrEmpty = z.union([z.literal(""), z.url("Enter a valid URL")]);
/** "" = none, otherwise an id */
const optionalId = z.string();
const isoDate = z.string().min(1, "Required").refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");
const int = (min: number, max: number, label = "Value") =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

// --- Classes ---------------------------------------------------------------
export const classResourceSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  url: z.url("Enter a valid URL"),
});

export const classSchema = z.object({
  title,
  description: text(5000),
  agenda: text(),
  course_id: optionalId,
  module_id: optionalId,
  instructor_id: optionalId,
  starts_at: isoDate,
  duration_minutes: int(5, 1440, "Duration"),
  meeting_url: urlOrEmpty,
  recording_url: urlOrEmpty,
  resources: z.array(classResourceSchema).max(50),
  status: z.enum(CLASS_STATUSES),
});
export type ClassInput = z.infer<typeof classSchema>;

// --- Attendance ------------------------------------------------------------
export const attendanceSchema = z.object({
  class_id: z.string().min(1),
  rows: z
    .array(
      z.object({
        user_id: z.string().min(1),
        status: z.enum(ATTENDANCE_STATUSES),
        note: z.string().max(500),
      }),
    )
    .max(2000),
});
export type AttendanceInput = z.infer<typeof attendanceSchema>;

// --- Courses ---------------------------------------------------------------
export const courseSchema = z.object({
  title,
  slug,
  summary: text(500),
  description: text(),
  category: z.string().trim().min(1, "Category is required").max(60),
  difficulty: z.enum(DIFFICULTIES),
  estimated_hours: int(0, 10000, "Hours"),
  icon: z.string().max(60),
  is_published: z.boolean(),
  instructor_id: optionalId,
});
export type CourseInput = z.infer<typeof courseSchema>;

export const moduleSchema = z.object({
  title,
  description: text(2000),
});
export type ModuleInput = z.infer<typeof moduleSchema>;

export const newLessonSchema = z.object({ title, slug });
export type NewLessonInput = z.infer<typeof newLessonSchema>;

export const lessonSchema = z.object({
  title,
  slug,
  summary: text(500),
  content: text(200000),
  exercise: text(50000),
  video_url: urlOrEmpty,
  estimated_minutes: int(0, 1000, "Minutes"),
  is_published: z.boolean(),
});
export type LessonInput = z.infer<typeof lessonSchema>;

export const resourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  url: z.url("Enter a valid URL"),
  kind: z.enum(RESOURCE_KINDS),
});
export type ResourceInput = z.infer<typeof resourceSchema>;

// --- Roadmaps --------------------------------------------------------------
export const roadmapSchema = z.object({
  title,
  slug,
  summary: text(500),
  description: text(),
  difficulty: z.enum(DIFFICULTIES),
  estimated_weeks: int(1, 520, "Weeks"),
  goal: z.union([z.literal(""), z.enum(LEARNING_GOALS)]),
  /** comma separated */
  prerequisites: text(2000),
  is_published: z.boolean(),
});
export type RoadmapInput = z.infer<typeof roadmapSchema>;

export const roadmapNodeSchema = z.object({
  title,
  description: text(2000),
  course_id: optionalId,
  lesson_id: optionalId,
});
export type RoadmapNodeInput = z.infer<typeof roadmapNodeSchema>;

// --- Assignments -----------------------------------------------------------
export const assignmentSchema = z.object({
  course_id: z.string().min(1, "Pick a course"),
  lesson_id: optionalId,
  title,
  description: text(),
  due_at: isoDate,
  points: int(0, 10000, "Points"),
  submission_type: z.enum(SUBMISSION_TYPES),
  is_published: z.boolean(),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const gradeSchema = z.object({
  grade: int(0, 10000, "Grade"),
  feedback: text(10000),
});
export type GradeInput = z.infer<typeof gradeSchema>;

// --- Problems --------------------------------------------------------------
export const problemExampleSchema = z.object({
  input: z.string().trim().min(1, "Input required").max(5000),
  output: z.string().trim().min(1, "Output required").max(5000),
  explanation: z.string().max(5000),
});

export const problemSchema = z.object({
  title,
  slug,
  difficulty: z.enum(PROBLEM_DIFFICULTIES),
  topic: z.string().trim().min(1, "Topic is required").max(80),
  /** comma separated */
  tags: text(1000),
  description: text(),
  input_format: text(5000),
  output_format: text(5000),
  /** one per line */
  constraints: text(5000),
  examples: z.array(problemExampleSchema).max(20),
  function_name: z
    .string()
    .trim()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Must be a valid identifier"),
  starter_java: text(20000),
  starter_javascript: text(20000),
  starter_python: text(20000),
  solution_explanation: text(),
  is_published: z.boolean(),
});
export type ProblemInput = z.infer<typeof problemSchema>;

function jsonText(check?: (v: unknown) => boolean, message = "Invalid JSON") {
  return z
    .string()
    .min(1, "Required")
    .refine((v) => {
      try {
        const parsed: unknown = JSON.parse(v);
        return check ? check(parsed) : true;
      } catch {
        return false;
      }
    }, message);
}

export const testCaseSchema = z.object({
  input: jsonText(Array.isArray, "Must be a JSON array of arguments, e.g. [[1,2,3], 4]"),
  expected_output: jsonText(undefined, "Must be valid JSON, e.g. 5, \"abc\" or [1,2]"),
  is_sample: z.boolean(),
});
export type TestCaseInput = z.infer<typeof testCaseSchema>;

// --- Announcements ---------------------------------------------------------
export const announcementSchema = z.object({
  title,
  body: z.string().trim().min(1, "Write something").max(20000),
  course_id: optionalId,
  pinned: z.boolean(),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

// --- Agendas ---------------------------------------------------------------
const clock = z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time")]);

export const agendaItemSchema = z
  .object({
    course_id: z.string().min(1, "Pick a course"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    agenda_title: z.string().max(200),
    title,
    description: text(2000),
    type: z.enum(AGENDA_ITEM_TYPES),
    start_time: clock,
    end_time: clock,
    priority: z.enum(PRIORITIES),
    lesson_id: optionalId,
    class_id: optionalId,
    assignment_id: optionalId,
    problem_id: optionalId,
  })
  .refine((v) => !v.start_time || !v.end_time || v.end_time >= v.start_time, {
    message: "End must be after start",
    path: ["end_time"],
  });
export type AgendaItemInput = z.infer<typeof agendaItemSchema>;

/** Validates ids passed straight to actions. */
export const idSchema = z.string().min(1).max(64);
