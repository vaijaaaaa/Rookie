-- =============================================================================
-- Rookie — core schema
-- Tables, enums, indexes. Business logic lives in 0002, RLS in 0003.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'instructor', 'admin');
create type public.learning_goal as enum (
  'software_developer', 'full_stack_developer', 'backend_developer',
  'frontend_developer', 'data_engineer', 'ai_engineer', 'cs_fundamentals'
);
create type public.experience_level as enum ('beginner', 'some_experience', 'intermediate');
create type public.difficulty as enum ('beginner', 'intermediate', 'advanced');
create type public.problem_difficulty as enum ('easy', 'medium', 'hard');
create type public.progress_status as enum ('not_started', 'in_progress', 'completed');
create type public.class_status as enum ('scheduled', 'live', 'completed', 'cancelled');
create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');
create type public.submission_type as enum ('text', 'url', 'code');
create type public.submission_status as enum ('in_progress', 'submitted', 'reviewed');
create type public.code_language as enum ('java', 'javascript', 'python');
create type public.code_verdict as enum (
  'pending', 'accepted', 'wrong_answer', 'runtime_error', 'compile_error', 'time_limit'
);
create type public.agenda_item_type as enum ('task', 'class', 'assignment', 'problem', 'study', 'revision');
create type public.agenda_status as enum ('todo', 'in_progress', 'done', 'skipped');
create type public.priority as enum ('low', 'medium', 'high');
create type public.resource_kind as enum ('article', 'video', 'docs', 'repo', 'slides', 'other');
create type public.roadmap_node_kind as enum ('section', 'topic');
create type public.notification_type as enum (
  'class_upcoming', 'assignment_new', 'assignment_due', 'assignment_reviewed',
  'announcement', 'achievement', 'roadmap_milestone', 'system'
);
create type public.activity_type as enum (
  'lesson_completed', 'problem_solved', 'class_attended', 'assignment_submitted',
  'roadmap_node_completed', 'course_completed', 'achievement_unlocked'
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users). Role lives here; see 0003 for how role
-- changes are locked down to admins.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  username text unique,
  avatar_url text,
  bio text,
  role public.user_role not null default 'student',
  learning_goal public.learning_goal,
  experience public.experience_level,
  interests text[] not null default '{}',
  primary_roadmap_id uuid,
  timezone text not null default 'UTC',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Courses → Modules → Lessons
-- ---------------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  description text not null default '',
  category text not null default 'fundamentals',
  difficulty public.difficulty not null default 'beginner',
  estimated_hours int not null default 0 check (estimated_hours >= 0),
  icon text,
  instructor_id uuid references public.profiles (id) on delete set null,
  is_published boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_instructor_idx on public.courses (instructor_id);
create index courses_published_idx on public.courses (is_published, position);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index course_modules_course_idx on public.course_modules (course_id, position);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  -- course_id is derived from module_id by trigger; kept for cheap progress
  -- aggregation and RLS checks without a join.
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null,
  title text not null,
  summary text not null default '',
  content text not null default '',
  exercise text,
  video_url text,
  estimated_minutes int not null default 10 check (estimated_minutes >= 0),
  position int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);
create index lessons_module_idx on public.lessons (module_id, position);
create index lessons_course_idx on public.lessons (course_id);

create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null,
  url text not null,
  kind public.resource_kind not null default 'article',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lesson_resources_lesson_idx on public.lesson_resources (lesson_id);

create table public.course_enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
create index course_enrollments_course_idx on public.course_enrollments (course_id);

-- Lesson completion per student.
create table public.student_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status public.progress_status not null default 'in_progress',
  completed_at timestamptz,
  last_viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index student_progress_lesson_idx on public.student_progress (lesson_id);

-- ---------------------------------------------------------------------------
-- Roadmaps
-- ---------------------------------------------------------------------------
create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  description text not null default '',
  difficulty public.difficulty not null default 'beginner',
  estimated_weeks int not null default 12,
  goal public.learning_goal,
  prerequisites text[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_primary_roadmap_fk
  foreign key (primary_roadmap_id) references public.roadmaps (id) on delete set null;

-- Sections (parent_id null) contain topics. A topic may link to a lesson; its
-- completion then follows lesson completion automatically.
create table public.roadmap_nodes (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps (id) on delete cascade,
  parent_id uuid references public.roadmap_nodes (id) on delete cascade,
  kind public.roadmap_node_kind not null default 'topic',
  title text not null,
  description text not null default '',
  course_id uuid references public.courses (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index roadmap_nodes_roadmap_idx on public.roadmap_nodes (roadmap_id, parent_id, position);
create index roadmap_nodes_lesson_idx on public.roadmap_nodes (lesson_id);

create table public.roadmap_enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  roadmap_id uuid not null references public.roadmaps (id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (user_id, roadmap_id)
);
create index roadmap_enrollments_roadmap_idx on public.roadmap_enrollments (roadmap_id);

-- Manual completion of topics that have no linked lesson.
create table public.roadmap_node_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  node_id uuid not null references public.roadmap_nodes (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

-- ---------------------------------------------------------------------------
-- Classes & attendance
-- Class roster = students enrolled in the class's course. Classes with no
-- course are open sessions visible to every student.
-- ---------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  agenda text not null default '',
  course_id uuid references public.courses (id) on delete set null,
  module_id uuid references public.course_modules (id) on delete set null,
  instructor_id uuid references public.profiles (id) on delete set null,
  starts_at timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  meeting_url text,
  recording_url text,
  resources jsonb not null default '[]'::jsonb,
  status public.class_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index classes_starts_idx on public.classes (starts_at);
create index classes_course_idx on public.classes (course_id, starts_at);
create index classes_instructor_idx on public.classes (instructor_id, starts_at);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.attendance_status not null,
  note text,
  marked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, user_id)
);
create index attendance_user_idx on public.attendance (user_id);

-- ---------------------------------------------------------------------------
-- Assignments
-- "Not started" = no submission row. "Late" = derived from due_at.
-- ---------------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null,
  description text not null default '',
  due_at timestamptz not null,
  points int not null default 100 check (points >= 0),
  submission_type public.submission_type not null default 'text',
  is_published boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assignments_course_idx on public.assignments (course_id, due_at);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '',
  url text,
  status public.submission_status not null default 'in_progress',
  submitted_at timestamptz,
  grade int check (grade >= 0),
  feedback text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);
create index assignment_submissions_user_idx on public.assignment_submissions (user_id);

-- ---------------------------------------------------------------------------
-- Coding problems
-- Problems are function-based: tests call `function_name(...args)` with JSON
-- args and compare against JSON expected output. See src/services/execution.
-- ---------------------------------------------------------------------------
create table public.coding_problems (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  difficulty public.problem_difficulty not null,
  topic text not null,
  tags text[] not null default '{}',
  description text not null default '',
  input_format text not null default '',
  output_format text not null default '',
  constraints text[] not null default '{}',
  examples jsonb not null default '[]'::jsonb,
  function_name text not null,
  starter_code jsonb not null default '{}'::jsonb,
  solution_explanation text not null default '',
  is_published boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coding_problems_topic_idx on public.coding_problems (topic, difficulty);

create table public.coding_problem_test_cases (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.coding_problems (id) on delete cascade,
  input jsonb not null,           -- array of arguments
  expected_output jsonb not null,
  is_sample boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coding_test_cases_problem_idx on public.coding_problem_test_cases (problem_id, position);

create table public.coding_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.coding_problems (id) on delete cascade,
  language public.code_language not null,
  code text not null,
  verdict public.code_verdict not null default 'pending',
  passed_count int not null default 0,
  total_count int not null default 0,
  runtime_ms int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coding_submissions_user_idx on public.coding_submissions (user_id, created_at desc);
create index coding_submissions_problem_idx on public.coding_submissions (problem_id, user_id);

-- ---------------------------------------------------------------------------
-- Daily agenda
-- An agenda belongs either to one student (owner_id) or to a course cohort
-- (course_id, created by staff). Per-student status lives in
-- agenda_item_progress so cohort items can be completed individually.
-- ---------------------------------------------------------------------------
create table public.daily_agendas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  date date not null,
  title text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((owner_id is not null) <> (course_id is not null))
);
create unique index daily_agendas_owner_date_idx on public.daily_agendas (owner_id, date) where owner_id is not null;
create unique index daily_agendas_course_date_idx on public.daily_agendas (course_id, date) where course_id is not null;

create table public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid not null references public.daily_agendas (id) on delete cascade,
  title text not null,
  description text not null default '',
  type public.agenda_item_type not null default 'task',
  start_time time,
  end_time time,
  priority public.priority not null default 'medium',
  course_id uuid references public.courses (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  class_id uuid references public.classes (id) on delete set null,
  assignment_id uuid references public.assignments (id) on delete set null,
  problem_id uuid references public.coding_problems (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time >= start_time)
);
create index agenda_items_agenda_idx on public.agenda_items (agenda_id, start_time);

create table public.agenda_item_progress (
  item_id uuid not null references public.agenda_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.agenda_status not null default 'todo',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Notes, announcements, notifications
-- ---------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled note',
  content text not null default '',
  course_id uuid references public.courses (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  problem_id uuid references public.coding_problems (id) on delete set null,
  class_id uuid references public.classes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_idx on public.notes (user_id, updated_at desc);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  course_id uuid references public.courses (id) on delete cascade, -- null = platform-wide
  author_id uuid references public.profiles (id) on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index announcements_created_idx on public.announcements (created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Achievements & activity
-- ---------------------------------------------------------------------------
-- criteria examples:
--   {"kind":"count","activity":"lesson_completed","threshold":1}
--   {"kind":"streak","threshold":7}
--   {"kind":"attendance_rate","threshold":100,"min_classes":5}
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null default '',
  icon text not null default '🏅',
  criteria jsonb not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- Append-only event log written exclusively by triggers. One row per
-- (user, type, entity) so repeated toggling can't farm activity.
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.activity_type not null,
  entity_id uuid,
  title text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  activity_date date not null default current_date,
  unique (user_id, type, entity_id)
);
create index activity_logs_user_date_idx on public.activity_logs (user_id, activity_date desc);
create index activity_logs_occurred_idx on public.activity_logs (occurred_at desc);

-- Platform settings (key/value), admin only.
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','courses','course_modules','lessons','lesson_resources','student_progress',
    'roadmaps','roadmap_nodes','classes','attendance','assignments','assignment_submissions',
    'coding_problems','coding_problem_test_cases','coding_submissions','daily_agendas',
    'agenda_items','agenda_item_progress','notes','announcements','achievements','platform_settings'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
  end loop;
end $$;
