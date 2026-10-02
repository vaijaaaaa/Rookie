-- Delete every demo account created by seed.sql (all *@rookie.dev users).
-- Run in the Supabase SQL editor. Cascades remove each user's profile,
-- progress, submissions, attendance, notes, notifications and activity.
-- Courses, lessons, roadmaps, problems and classes are kept; their
-- instructor/author fields become empty.
--
-- Safety: aborts unless at least one real (non-demo) admin exists,
-- so you can't lock yourself out. Run supabase/bootstrap-admin.sql first.

do $$
declare
  v_admins int;
  v_deleted int;
begin
  select count(*) into v_admins
  from public.profiles
  where role = 'admin' and email not like '%@rookie.dev';

  if v_admins = 0 then
    raise exception 'No non-demo admin exists. Run supabase/bootstrap-admin.sql first, then re-run this.';
  end if;

  delete from auth.users where email like '%@rookie.dev';
  get diagnostics v_deleted = row_count;
  raise notice 'Deleted % demo users. % real admin(s) remain.', v_deleted, v_admins;
end $$;

-- Check what's left:
select email, role, created_at from public.profiles order by role, email;
