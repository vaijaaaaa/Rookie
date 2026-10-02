-- ⚠️ FULL RESET — deletes ALL users (including admins) and ALL app data:
-- courses, lessons, roadmaps, problems, classes, attendance, assignments,
-- agendas, notes, announcements, notifications and activity.
-- Keeps: the schema, achievement definitions and platform settings.
-- This cannot be undone. Afterwards, run supabase/bootstrap-admin.sql to
-- create your admin account again.

begin;

-- 1. Every account (cascades to profiles and all per-user data).
delete from auth.users;

-- 2. All content and everything hanging off it.
truncate table
  public.courses,
  public.course_modules,
  public.lessons,
  public.lesson_resources,
  public.course_enrollments,
  public.student_progress,
  public.roadmaps,
  public.roadmap_nodes,
  public.roadmap_enrollments,
  public.roadmap_node_progress,
  public.classes,
  public.attendance,
  public.assignments,
  public.assignment_submissions,
  public.coding_problems,
  public.coding_problem_test_cases,
  public.coding_submissions,
  public.daily_agendas,
  public.agenda_items,
  public.agenda_item_progress,
  public.notes,
  public.announcements,
  public.notifications,
  public.user_achievements,
  public.activity_logs
cascade;

commit;

-- Verify: every count should be 0.
select
  (select count(*) from auth.users)            as users,
  (select count(*) from public.profiles)       as profiles,
  (select count(*) from public.courses)        as courses,
  (select count(*) from public.roadmaps)       as roadmaps,
  (select count(*) from public.coding_problems) as problems,
  (select count(*) from public.classes)        as classes,
  (select count(*) from public.notifications)  as notifications;
