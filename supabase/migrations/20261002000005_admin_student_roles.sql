-- =============================================================================
-- Rookie — two roles only: admin and student
-- Instructors are merged into admins. Admins manage all content, classes,
-- attendance, assignments and users. The 'instructor' enum value is kept for
-- compatibility (removing an enum value would require rebuilding every policy
-- and function that references the type) but a check constraint forbids it.
-- Safe to re-run.
-- =============================================================================

-- 1. Existing instructors become admins.
--    (guard_profile_role only blocks role changes made by signed-in non-admins;
--    the SQL editor runs without auth.uid(), so this update is allowed.)
update public.profiles set role = 'admin' where role = 'instructor';

-- 2. No one can be an instructor any more.
alter table public.profiles drop constraint if exists profiles_role_two_roles;
alter table public.profiles add constraint profiles_role_two_roles check (role in ('student', 'admin'));

-- 3. Permission helpers: staff == admin. Every RLS policy goes through these,
--    so policies need no changes.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
$$;

create or replace function public.can_manage_course(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
$$;

create or replace function public.can_manage_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
$$;

-- 4. admin_set_role: only student/admin are valid targets.
create or replace function public.admin_set_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_role not in ('student', 'admin') then
    raise exception 'Role must be student or admin';
  end if;
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'You cannot demote yourself';
  end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

-- 5. Stats: "instructors" are now admins (key kept for API compatibility).
create or replace function public.get_student_overview()
returns table (
  user_id uuid, full_name text, email text, avatar_url text, joined_at timestamptz,
  lessons_completed int, problems_solved int, attendance_rate int, last_active timestamptz
) language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.email, p.avatar_url, p.created_at,
    (select count(*)::int from public.activity_logs a where a.user_id = p.id and a.type = 'lesson_completed'),
    (select count(*)::int from public.activity_logs a where a.user_id = p.id and a.type = 'problem_solved'),
    (select coalesce(round(100.0 * count(*) filter (where status in ('present','late'))
              / nullif(count(*) filter (where status <> 'excused'), 0)), 0)::int
       from public.attendance at where at.user_id = p.id),
    (select max(occurred_at) from public.activity_logs a where a.user_id = p.id)
  from public.profiles p
  where p.role = 'student' and public.is_admin()
  order by p.full_name
$$;
