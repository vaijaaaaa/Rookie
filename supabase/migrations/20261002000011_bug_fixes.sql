-- =============================================================================
-- Rookie — bug fixes (security, triggers, IST determinism, payments ledger)
-- Safe to re-run: create or replace / drop … if exists / guarded alters.
-- =============================================================================

set timezone = 'Asia/Kolkata';

-- ---------------------------------------------------------------------------
-- 1. Anonymous visitors: only open (course-less) upcoming classes, and never
--    the meeting / recording links. Column grants replace the table grant.
-- ---------------------------------------------------------------------------
drop policy if exists "classes: public upcoming read" on public.classes;
create policy "classes: public upcoming read" on public.classes for select to anon
  using (course_id is null and starts_at > now() - interval '1 day' and status <> 'cancelled');

revoke select on public.classes from anon;
grant select (id, title, description, agenda, course_id, module_id, instructor_id, starts_at,
              duration_minutes, resources, status, created_at, updated_at)
  on public.classes to anon;

-- ---------------------------------------------------------------------------
-- 2. Anonymous visitors can read staff profiles, but not their emails.
-- ---------------------------------------------------------------------------
revoke select on public.profiles from anon;
grant select (id, full_name, avatar_url, username, bio, role) on public.profiles to anon;

-- ---------------------------------------------------------------------------
-- 3. Changing a password signs the user out everywhere.
--    (auth.refresh_tokens cascade from auth.sessions.)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_password(p_user uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.assert_admin_or_service();
  if coalesce(length(p_password), 0) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_user;
  if not found then raise exception 'User not found'; end if;
  delete from auth.sessions where user_id = p_user;
end $$;

revoke execute on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Streaks: the RPC only answers for yourself (or staff). Internal callers
--    (achievement triggers, which may run without auth.uid()) use
--    compute_user_streak, which is not executable by API roles.
--    Future-dated activity is ignored.
-- ---------------------------------------------------------------------------
create or replace function public.compute_user_streak(p_user uuid)
returns table (current_streak int, longest_streak int, active_today boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text;
  v_today date;
begin
  select coalesce(timezone, 'Asia/Kolkata') into v_tz from public.profiles where id = p_user;
  v_today := (now() at time zone coalesce(v_tz, 'Asia/Kolkata'))::date;

  return query
  with days as (
    select distinct activity_date d from public.activity_logs
    where user_id = p_user and type <> 'achievement_unlocked' and activity_date <= v_today
  ), grouped as (
    select d, d - (row_number() over (order by d))::int as grp from days
  ), runs as (
    select min(d) as start_d, max(d) as end_d, count(*)::int as len from grouped group by grp
  )
  select
    coalesce((select len from runs where end_d >= v_today - 1 order by end_d desc limit 1), 0),
    coalesce((select max(len) from runs), 0),
    exists (select 1 from days where d = v_today);
end $$;

create or replace function public.user_streak(p_user uuid)
returns table (current_streak int, longest_streak int, active_today boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or (p_user is distinct from auth.uid() and not public.is_staff()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select * from public.compute_user_streak(p_user);
end $$;

create or replace function public.check_achievements(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a record;
  v_kind text;
  v_threshold int;
  v_value int;
  v_total int;
begin
  for a in
    select * from public.achievements x
    where not exists (select 1 from public.user_achievements ua where ua.user_id = p_user and ua.achievement_id = x.id)
  loop
    v_kind := a.criteria ->> 'kind';
    v_threshold := coalesce((a.criteria ->> 'threshold')::int, 1);
    v_value := 0;

    if v_kind = 'count' then
      select count(*) into v_value from public.activity_logs
      where user_id = p_user and type = (a.criteria ->> 'activity')::public.activity_type;
    elsif v_kind = 'streak' then
      select longest_streak into v_value from public.compute_user_streak(p_user);
    elsif v_kind = 'attendance_rate' then
      select count(*) filter (where status in ('present', 'late')), count(*)
        into v_value, v_total
      from public.attendance where user_id = p_user and status <> 'excused';
      if v_total >= coalesce((a.criteria ->> 'min_classes')::int, 5) then
        v_value := (v_value * 100) / greatest(v_total, 1);
      else
        v_value := 0;
      end if;
    end if;

    if v_value >= v_threshold then
      insert into public.user_achievements (user_id, achievement_id)
      values (p_user, a.id) on conflict do nothing;
    end if;
  end loop;
end $$;

revoke execute on function public.compute_user_streak(uuid) from public, anon, authenticated;
revoke execute on function public.user_streak(uuid) from public, anon;
grant execute on function public.user_streak(uuid) to authenticated;
-- only used inside security-definer triggers
revoke execute on function public.node_completed_by(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Students can't move a submission to another assignment / user.
-- ---------------------------------------------------------------------------
create or replace function public.before_assignment_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_staff boolean := public.is_staff();
begin
  if auth.uid() is null then
    return new; -- service role / SQL editor
  end if;
  if not v_staff then
    if tg_op = 'UPDATE' then
      if old.status = 'reviewed' then
        raise exception 'Reviewed submissions cannot be changed' using errcode = '42501';
      end if;
      new.assignment_id := old.assignment_id;
      new.user_id := old.user_id;
      new.grade := old.grade;
      new.feedback := old.feedback;
      new.reviewed_by := old.reviewed_by;
      new.reviewed_at := old.reviewed_at;
    else
      new.grade := null; new.feedback := null; new.reviewed_by := null; new.reviewed_at := null;
    end if;
    if new.status = 'reviewed' then
      raise exception 'Students cannot mark submissions reviewed' using errcode = '42501';
    end if;
    if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
      new.submitted_at := now();
    end if;
  else
    -- staff: only grading fields may change on someone else's work
    if tg_op = 'UPDATE' and new.user_id <> auth.uid() then
      new.content := old.content;
      new.url := old.url;
      new.submitted_at := old.submitted_at;
      if new.status = 'reviewed' and old.status <> 'reviewed' then
        new.reviewed_by := auth.uid();
        new.reviewed_at := now();
      end if;
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Code submissions only for published problems.
-- ---------------------------------------------------------------------------
drop policy if exists "code_submissions: insert own" on public.coding_submissions;
create policy "code_submissions: insert own" on public.coding_submissions for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.coding_problems p where p.id = problem_id and p.is_published));

-- ---------------------------------------------------------------------------
-- 7. Search: tag match was reversed; class times shown in IST.
-- ---------------------------------------------------------------------------
create or replace function public.search_content(p_query text)
returns table (kind text, id uuid, title text, subtitle text, href text)
language sql stable set search_path = public as $$
  with q as (select '%' || replace(replace(trim(p_query), '%', ''), '_', '') || '%' as pat)
  (select 'course', c.id, c.title, c.summary, '/courses/' || c.slug
     from public.courses c, q where c.is_published and (c.title ilike q.pat or c.summary ilike q.pat) limit 5)
  union all
  (select 'lesson', l.id, l.title, c.title, '/courses/' || c.slug || '/lessons/' || l.slug
     from public.lessons l join public.courses c on c.id = l.course_id, q
     where l.is_published and c.is_published and l.title ilike q.pat limit 8)
  union all
  (select 'roadmap', r.id, r.title, r.summary, '/roadmaps/' || r.slug
     from public.roadmaps r, q where r.is_published and r.title ilike q.pat limit 5)
  union all
  (select 'problem', p.id, p.title, initcap(p.difficulty::text) || ' · ' || p.topic, '/practice/' || p.slug
     from public.coding_problems p, q
     where p.is_published and (p.title ilike q.pat or p.topic ilike q.pat
                               or exists (select 1 from unnest(p.tags) t where t ilike q.pat)) limit 8)
  union all
  (select 'class', k.id, k.title, to_char(k.starts_at at time zone 'Asia/Kolkata', 'Mon DD HH24:MI'), '/class/' || k.id
     from public.classes k, q where k.title ilike q.pat order by k.starts_at desc limit 5)
$$;

-- ---------------------------------------------------------------------------
-- 8. Demoting to student sends the user through onboarding.
-- ---------------------------------------------------------------------------
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
  update public.profiles
     set role = p_role,
         onboarded_at = case when p_role = 'student' and role <> 'student' then null else onboarded_at end
   where id = p_user;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Progress percentages round like the app (Math.round), not truncate.
-- ---------------------------------------------------------------------------
create or replace function public.get_course_progress()
returns table (course_id uuid, total_lessons int, completed_lessons int, percent int)
language sql stable set search_path = public as $$
  select l.course_id,
         count(*)::int,
         count(sp.lesson_id)::int,
         (case when count(*) = 0 then 0 else round(count(sp.lesson_id) * 100.0 / count(*)) end)::int
  from public.lessons l
  left join public.student_progress sp
    on sp.lesson_id = l.id and sp.user_id = auth.uid() and sp.status = 'completed'
  where l.is_published
  group by l.course_id
$$;

create or replace function public.get_roadmaps_progress()
returns table (roadmap_id uuid, total_topics int, completed_topics int, percent int)
language sql stable set search_path = public as $$
  with t as (
    select n.roadmap_id, n.id,
      (exists (select 1 from public.roadmap_node_progress p where p.node_id = n.id and p.user_id = auth.uid())
       or exists (select 1 from public.student_progress sp
                  where sp.lesson_id = n.lesson_id and sp.user_id = auth.uid() and sp.status = 'completed')) as done
    from public.roadmap_nodes n where n.kind = 'topic'
  )
  select roadmap_id, count(*)::int, count(*) filter (where done)::int,
         round(count(*) filter (where done) * 100.0 / greatest(count(*), 1))::int
  from t group by roadmap_id
$$;

-- ---------------------------------------------------------------------------
-- 10. "Milestone reached" only when the topic was newly completed.
-- ---------------------------------------------------------------------------
create or replace function public.on_lesson_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_lesson record;
  v_node record;
  v_total int;
  v_done int;
  v_section record;
  v_was_done boolean;
begin
  if new.status <> 'completed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  select l.id, l.title, l.course_id, c.title as course_title
    into v_lesson
  from public.lessons l join public.courses c on c.id = l.course_id
  where l.id = new.lesson_id;

  perform public.log_activity(new.user_id, 'lesson_completed', new.lesson_id, v_lesson.title,
                              jsonb_build_object('course_id', v_lesson.course_id, 'course', v_lesson.course_title),
                              coalesce(new.completed_at, now()));

  -- course completion
  select count(*) into v_total from public.lessons where course_id = v_lesson.course_id and is_published;
  select count(*) into v_done
  from public.student_progress sp join public.lessons l on l.id = sp.lesson_id
  where sp.user_id = new.user_id and l.course_id = v_lesson.course_id and l.is_published
    and (sp.status = 'completed' or sp.lesson_id = new.lesson_id);
  if v_total > 0 and v_done >= v_total then
    perform public.log_activity(new.user_id, 'course_completed', v_lesson.course_id, v_lesson.course_title,
                                '{}'::jsonb, coalesce(new.completed_at, now()));
  end if;

  -- roadmap nodes linked to this lesson in roadmaps the user follows
  for v_node in
    select n.* from public.roadmap_nodes n
    join public.roadmap_enrollments e on e.roadmap_id = n.roadmap_id and e.user_id = new.user_id
    where n.lesson_id = new.lesson_id
  loop
    v_was_done := exists (
      select 1 from public.activity_logs a
      where a.user_id = new.user_id and a.type = 'roadmap_node_completed' and a.entity_id = v_node.id
    );
    perform public.log_activity(new.user_id, 'roadmap_node_completed', v_node.id, v_node.title,
                                jsonb_build_object('roadmap_id', v_node.roadmap_id),
                                coalesce(new.completed_at, now()));
    -- milestone: whole section done? (only the first time this topic completes)
    if v_node.parent_id is not null and not v_was_done then
      select s.id, s.title, r.slug into v_section
      from public.roadmap_nodes s join public.roadmaps r on r.id = s.roadmap_id
      where s.id = v_node.parent_id;
      if not exists (
        select 1 from public.roadmap_nodes t
        where t.parent_id = v_node.parent_id
          and not public.node_completed_by(t.id, new.user_id)
          and t.id <> v_node.id
      ) then
        perform public.notify_user(new.user_id, 'roadmap_milestone', '🎯 Milestone reached',
          'You completed "' || v_section.title || '"', '/roadmaps/' || v_section.slug);
      end if;
    end if;
  end loop;

  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 12. Deleting a user keeps their payments (ledger) with a name snapshot.
-- ---------------------------------------------------------------------------
alter table public.student_payments add column if not exists student_name text;
alter table public.student_payments alter column user_id drop not null;
alter table public.student_payments drop constraint if exists student_payments_user_id_fkey;
alter table public.student_payments
  add constraint student_payments_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

update public.student_payments sp
   set student_name = coalesce(nullif(p.full_name, ''), p.email)
  from public.profiles p
 where p.id = sp.user_id and sp.student_name is null;

create or replace function public.snapshot_payment_student_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null then
    select coalesce(nullif(p.full_name, ''), p.email, new.student_name)
      into new.student_name
      from public.profiles p where p.id = new.user_id;
  end if;
  return new;
end $$;

drop trigger if exists student_payments_student_name on public.student_payments;
create trigger student_payments_student_name
  before insert or update of user_id on public.student_payments
  for each row execute function public.snapshot_payment_student_name();

-- ---------------------------------------------------------------------------
-- B. Class notifications only for scheduled / live classes.
-- ---------------------------------------------------------------------------
create or replace function public.on_class_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.starts_at > now() and new.status in ('scheduled', 'live') then
    insert into public.notifications (user_id, type, title, body, link)
    select p.id, 'class_upcoming', 'Class scheduled: ' || new.title,
           to_char(new.starts_at at time zone 'Asia/Kolkata', 'Dy Mon DD, HH12:MI AM "IST"'),
           '/class/' || new.id
    from public.profiles p
    where p.role = 'student'
      and (new.course_id is null
           or exists (select 1 from public.course_enrollments e where e.user_id = p.id and e.course_id = new.course_id));
  end if;
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- C. Publishing a draft assignment notifies the course like a new one.
-- ---------------------------------------------------------------------------
create or replace function public.on_assignment_published()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_published and not old.is_published then
    insert into public.notifications (user_id, type, title, body, link)
    select e.user_id, 'assignment_new', 'New assignment: ' || new.title,
           'Due ' || to_char(new.due_at at time zone 'Asia/Kolkata', 'Mon DD, HH12:MI AM "IST"'),
           '/assignments/' || new.id
    from public.course_enrollments e where e.course_id = new.course_id;
  end if;
  return null;
end $$;

drop trigger if exists assignments_after_publish on public.assignments;
create trigger assignments_after_publish
  after update of is_published on public.assignments
  for each row execute function public.on_assignment_published();

-- ---------------------------------------------------------------------------
-- E. Deleting an attendance row retracts its class_attended activity.
-- ---------------------------------------------------------------------------
create or replace function public.on_attendance_deleted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.activity_logs
  where user_id = old.user_id and type = 'class_attended' and entity_id = old.class_id;
  return null;
end $$;

drop trigger if exists attendance_after_delete on public.attendance;
create trigger attendance_after_delete
  after delete on public.attendance
  for each row execute function public.on_attendance_deleted();

-- ---------------------------------------------------------------------------
-- F. Day / week bucketing in IST regardless of the session timezone.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_activity(p_days int default 84)
returns table (day date, count int)
language sql stable security definer set search_path = public as $$
  select activity_date, count(*)::int from public.activity_logs
  where user_id = auth.uid() and type <> 'achievement_unlocked'
    and activity_date >= (now() at time zone 'Asia/Kolkata')::date - p_days
  group by activity_date order by activity_date
$$;

create or replace function public.get_platform_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_week_start timestamptz := date_trunc('week', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  select jsonb_build_object(
    'total_students', (select count(*) from public.profiles where role = 'student'),
    'total_instructors', (select count(*) from public.profiles where role = 'instructor'),
    'active_courses', (select count(*) from public.courses where is_published),
    'classes_this_week', (select count(*) from public.classes
                          where starts_at >= v_week_start and starts_at < v_week_start + interval '7 days'),
    'avg_attendance', (select coalesce(round(100.0 * count(*) filter (where status in ('present','late'))
                              / nullif(count(*) filter (where status <> 'excused'), 0)), 0) from public.attendance),
    'assignments_completed', (select count(*) from public.assignment_submissions where status in ('submitted', 'reviewed')),
    'active_users_7d', (select count(distinct user_id) from public.activity_logs where occurred_at > now() - interval '7 days'),
    'student_growth', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w, 'count', c) order by w), '[]'::jsonb) from (
        select to_char(date_trunc('week', created_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD') w, count(*) c
        from public.profiles where role = 'student' and created_at > now() - interval '12 weeks' group by 1) s),
    'daily_activity', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb) from (
        select activity_date::text d, count(*) c from public.activity_logs
        where activity_date > v_today - 30 and type <> 'achievement_unlocked' group by 1) s),
    'attendance_by_week', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w, 'rate', r) order by w), '[]'::jsonb) from (
        select to_char(date_trunc('week', k.starts_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD') w,
               round(100.0 * count(*) filter (where a.status in ('present','late')) / nullif(count(*), 0)) r
        from public.attendance a join public.classes k on k.id = a.class_id
        where k.starts_at > now() - interval '10 weeks' and a.status <> 'excused' group by 1) s),
    'course_progress', (
      select coalesce(jsonb_agg(jsonb_build_object('course', title, 'enrolled', enrolled, 'completion', completion) order by title), '[]'::jsonb) from (
        select c.title,
               (select count(*) from public.course_enrollments e where e.course_id = c.id) enrolled,
               coalesce((select round(100.0 * count(sp.*) / nullif(
                   (select count(*) from public.lessons l2 where l2.course_id = c.id and l2.is_published)
                   * (select count(*) from public.course_enrollments e2 where e2.course_id = c.id), 0))
                 from public.student_progress sp join public.lessons l on l.id = sp.lesson_id
                 join public.course_enrollments e3 on e3.user_id = sp.user_id and e3.course_id = c.id
                 where l.course_id = c.id and sp.status = 'completed'), 0) completion
        from public.courses c where c.is_published) s)
  ) into v;
  return v;
end $$;

create or replace function public.get_instructor_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := public.is_admin();
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v jsonb;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  with my_courses as (
    select id from public.courses where v_admin or instructor_id = v_uid
  ), my_students as (
    select distinct user_id from public.course_enrollments where course_id in (select id from my_courses)
  ), my_classes as (
    select id from public.classes where v_admin or instructor_id = v_uid or course_id in (select id from my_courses)
  )
  select jsonb_build_object(
    'courses', (select count(*) from my_courses),
    'students', (select count(*) from my_students),
    'classes_upcoming', (select count(*) from public.classes where id in (select id from my_classes) and starts_at > now()),
    'attendance_rate', (select coalesce(round(100.0 * count(*) filter (where status in ('present','late'))
                         / nullif(count(*) filter (where status <> 'excused'), 0)), 0)
                        from public.attendance where class_id in (select id from my_classes)),
    'pending_reviews', (select count(*) from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id
                        where a.course_id in (select id from my_courses) and s.status = 'submitted'),
    'assignment_completion', (
      select coalesce(round(100.0 * count(s.*) filter (where s.status in ('submitted','reviewed'))
               / nullif((select count(*) from public.assignments a2
                         join public.course_enrollments e on e.course_id = a2.course_id
                         where a2.course_id in (select id from my_courses) and a2.due_at < now()), 0)), 0)
      from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id
      where a.course_id in (select id from my_courses) and a.due_at < now()),
    'active_students_7d', (select count(distinct user_id) from public.activity_logs
                           where user_id in (select user_id from my_students) and occurred_at > now() - interval '7 days'),
    'daily_activity', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb) from (
        select activity_date::text d, count(*) c from public.activity_logs
        where user_id in (select user_id from my_students) and activity_date > v_today - 14
          and type <> 'achievement_unlocked' group by 1) s)
  ) into v;
  return v;
end $$;
