// Domain types mirroring supabase/migrations. Keep in sync with the schema.

export type UserRole = "student" | "admin";
export type LearningGoal =
  | "software_developer" | "full_stack_developer" | "backend_developer"
  | "frontend_developer" | "data_engineer" | "ai_engineer" | "cs_fundamentals";
export type ExperienceLevel = "beginner" | "some_experience" | "intermediate";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type ProblemDifficulty = "easy" | "medium" | "hard";
export type ProgressStatus = "not_started" | "in_progress" | "completed";
export type ClassStatus = "scheduled" | "live" | "completed" | "cancelled";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type SubmissionType = "text" | "url" | "code";
export type SubmissionStatus = "in_progress" | "submitted" | "reviewed";
export type CodeLanguage = "java" | "javascript" | "python";
export type CodeVerdict =
  | "pending" | "accepted" | "wrong_answer" | "runtime_error" | "compile_error" | "time_limit";
export type AgendaItemType = "task" | "class" | "assignment" | "problem" | "study" | "revision";
export type AgendaStatus = "todo" | "in_progress" | "done" | "skipped";
export type Priority = "low" | "medium" | "high";
export type ResourceKind = "article" | "video" | "docs" | "repo" | "slides" | "other";
export type RoadmapNodeKind = "section" | "topic";
export type NotificationType =
  | "class_upcoming" | "assignment_new" | "assignment_due" | "assignment_reviewed"
  | "announcement" | "achievement" | "roadmap_milestone" | "system";
export type ActivityType =
  | "lesson_completed" | "problem_solved" | "class_attended" | "assignment_submitted"
  | "roadmap_node_completed" | "course_completed" | "achievement_unlocked";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  learning_goal: LearningGoal | null;
  experience: ExperienceLevel | null;
  interests: string[];
  primary_roadmap_id: string | null;
  timezone: string;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  estimated_hours: number;
  icon: string | null;
  instructor_id: string | null;
  is_published: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  course_id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  exercise: string | null;
  video_url: string | null;
  estimated_minutes: number;
  position: number;
  is_published: boolean;
}

export interface LessonResource {
  id: string;
  lesson_id: string;
  title: string;
  url: string;
  kind: ResourceKind;
  position: number;
}

export interface StudentProgress {
  user_id: string;
  lesson_id: string;
  status: ProgressStatus;
  completed_at: string | null;
  last_viewed_at: string;
}

export interface Roadmap {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  difficulty: Difficulty;
  estimated_weeks: number;
  goal: LearningGoal | null;
  prerequisites: string[];
  created_by: string | null;
  is_published: boolean;
  created_at: string;
}

export interface RoadmapNode {
  id: string;
  roadmap_id: string;
  parent_id: string | null;
  kind: RoadmapNodeKind;
  title: string;
  description: string;
  course_id: string | null;
  lesson_id: string | null;
  position: number;
}

export interface ClassResource {
  title: string;
  url: string;
}

export interface ClassSession {
  id: string;
  title: string;
  description: string;
  agenda: string;
  course_id: string | null;
  module_id: string | null;
  instructor_id: string | null;
  starts_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  recording_url: string | null;
  resources: ClassResource[];
  status: ClassStatus;
  created_at: string;
}

export interface Attendance {
  id: string;
  class_id: string;
  user_id: string;
  status: AttendanceStatus;
  note: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string;
  due_at: string;
  points: number;
  submission_type: SubmissionType;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  user_id: string;
  content: string;
  url: string | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  grade: number | null;
  feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Display status for an assignment from the student's perspective. */
export type AssignmentDisplayStatus = "not_started" | "in_progress" | "submitted" | "reviewed" | "late";

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodingProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  tags: string[];
  description: string;
  input_format: string;
  output_format: string;
  constraints: string[];
  examples: ProblemExample[];
  function_name: string;
  starter_code: Partial<Record<CodeLanguage, string>>;
  solution_explanation: string;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
}

export interface TestCase {
  id: string;
  problem_id: string;
  input: unknown[];
  expected_output: unknown;
  is_sample: boolean;
  position: number;
}

export interface CodingSubmission {
  id: string;
  user_id: string;
  problem_id: string;
  language: CodeLanguage;
  code: string;
  verdict: CodeVerdict;
  passed_count: number;
  total_count: number;
  runtime_ms: number | null;
  created_at: string;
}

export interface DailyAgenda {
  id: string;
  owner_id: string | null;
  course_id: string | null;
  date: string;
  title: string | null;
}

export interface AgendaItem {
  id: string;
  agenda_id: string;
  title: string;
  description: string;
  type: AgendaItemType;
  start_time: string | null;
  end_time: string | null;
  priority: Priority;
  course_id: string | null;
  lesson_id: string | null;
  class_id: string | null;
  assignment_id: string | null;
  problem_id: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  course_id: string | null;
  lesson_id: string | null;
  problem_id: string | null;
  class_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  course_id: string | null;
  author_id: string | null;
  pinned: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  criteria: { kind: "count" | "streak" | "attendance_rate"; activity?: ActivityType; threshold: number; min_classes?: number };
  position: number;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  type: ActivityType;
  entity_id: string | null;
  title: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
  activity_date: string;
}

// RPC return shapes
export interface CourseProgressRow {
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  percent: number;
}

export interface RoadmapProgressRow {
  roadmap_id: string;
  total_topics: number;
  completed_topics: number;
  percent: number;
}

export interface MyStats {
  lessons_completed: number;
  problems_solved: number;
  problems_attempted: number;
  courses_completed: number;
  assignments_submitted: number;
  classes_attended: number;
  classes_total: number;
  current_streak: number;
  longest_streak: number;
  active_today: boolean;
  solved_by_difficulty: Partial<Record<ProblemDifficulty, number>>;
  language_usage: Partial<Record<CodeLanguage, number>>;
}

export interface SearchResult {
  kind: "course" | "lesson" | "roadmap" | "problem" | "class";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

/** Standard return shape for server actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "card" | "other";

export interface StudentPayment {
  id: string;
  /** null once the student's account has been deleted (see student_name). */
  user_id: string | null;
  /** Snapshot of the student's name, kept after their account is deleted. */
  student_name: string | null;
  /** yyyy-MM-01 */
  period: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paid_on: string;
  reference: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}
