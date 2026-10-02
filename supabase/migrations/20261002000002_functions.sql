-- =============================================================================
-- Rookie — functions & triggers
-- The activity system: domain tables fire triggers → log_activity() →
-- activity_logs → achievements/streaks/analytics all read from that one log.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Auth / permission helpers (security definer so they can be used inside RLS
-- policies without recursive policy evaluation on profiles).
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('instructor', 'admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.can_manage_course(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.courses c
    where c.id = p_course_id and c.instructor_id = auth.uid()
      and public.current_user_role() = 'instructor'
  )
$$;

create or replace function public.can_manage_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.classes k
    where k.id = p_class_id
      and public.current_user_role() = 'instructor'
      and (k.instructor_id = auth.uid()
           or (k.course_id is not null and public.can_manage_course(k.course_id)))
  )
$$;

create or replace function public.is_enrolled(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.course_enrollments
    where course_id = p_course_id and user_id = auth.uid()
  )
$$;

-- Can the current user see this class (roster member, open class, or staff)?
create or replace function public.can_view_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.classes k
    where k.id = p_class_id
      and (k.course_id is null or public.is_enrolled(k.course_id))
  )
$$;

-- ---------------------------------------------------------------------------
-- New auth user → profile
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins may change roles. Enforced in a trigger so it holds no matter
-- which policy allowed the update.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;
  if new.email is distinct from old.email and auth.uid() is not null and not public.is_admin() then
    new.email := old.email;
  end if;
  return new;
end $$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------------
-- lessons.course_id always follows module_id
-- ---------------------------------------------------------------------------
create or replace function public.sync_lesson_course()
returns trigger language plpgsql as $$
begin
  select course_id into new.course_id from public.course_modules where id = new.module_id;
  return new;
end $$;

create trigger lessons_sync_course
  before insert or update of module_id on public.lessons
  for each row execute function public.sync_lesson_course();

-- ---------------------------------------------------------------------------
-- Notifications helper
-- ---------------------------------------------------------------------------
create or replace function public.notify_user(
  p_user uuid, p_type public.notification_type, p_title text, p_body text, p_link text
) returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, coalesce(p_body, ''), p_link)
$$;

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------
create or replace function public.log_activity(
  p_user uuid, p_type public.activity_type, p_entity uuid, p_title text,
  p_metadata jsonb default '{}'::jsonb, p_at timestamptz default now()
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_tz text;
begin
  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = p_user;
  begin
    insert into public.activity_logs (user_id, type, entity_id, title, metadata, occurred_at, activity_date)
    values (p_user, p_type, p_entity, coalesce(p_title, ''), coalesce(p_metadata, '{}'::jsonb), p_at,
            (p_at at time zone coalesce(v_tz, 'UTC'))::date)
    on conflict (user_id, type, entity_id) do nothing;
  exception when invalid_parameter_value then
    -- bad timezone string: fall back to UTC
    insert into public.activity_logs (user_id, type, entity_id, title, metadata, occurred_at, activity_date)
    values (p_user, p_type, p_entity, coalesce(p_title, ''), coalesce(p_metadata, '{}'::jsonb), p_at,
            (p_at at time zone 'UTC')::date)
    on conflict (user_id, type, entity_id) do nothing;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Streaks — computed from meaningful activity only (achievements excluded).
-- ---------------------------------------------------------------------------
create or replace function public.user_streak(p_user uuid)
returns table (current_streak int, longest_streak int, active_today boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text;
  v_today date;
begin
  if p_user is distinct from auth.uid() and not public.is_staff() and auth.uid() is not null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = p_user;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  return query
  with days as (
    select distinct activity_date d from public.activity_logs
    where user_id = p_user and type <> 'achievement_unlocked'
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

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
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
      select longest_streak into v_value from public.user_streak(p_user);
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

create or replace function public.on_activity_logged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type <> 'achievement_unlocked' then
    perform public.check_achievements(new.user_id);
  end if;
  return null;
end $$;

create trigger activity_logs_after_insert
  after insert on public.activity_logs
  for each row execute function public.on_activity_logged();

create or replace function public.on_achievement_unlocked()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_icon text;
begin
  select title, icon into v_title, v_icon from public.achievements where id = new.achievement_id;
  perform public.log_activity(new.user_id, 'achievement_unlocked', new.achievement_id, v_title,
                              jsonb_build_object('icon', v_icon), new.unlocked_at);
  perform public.notify_user(new.user_id, 'achievement', v_icon || ' Achievement unlocked',
                             v_title, '/achievements');
  return null;
end $$;

create trigger user_achievements_after_insert
  after insert on public.user_achievements
  for each row execute function public.on_achievement_unlocked();

-- ---------------------------------------------------------------------------
-- Domain triggers → activity
-- ---------------------------------------------------------------------------

-- Lesson completed → lesson_completed, roadmap_node_completed, course_completed
create or replace function public.on_lesson_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_lesson record;
  v_node record;
  v_total int;
  v_done int;
  v_section record;
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
    perform public.log_activity(new.user_id, 'roadmap_node_completed', v_node.id, v_node.title,
                                jsonb_build_object('roadmap_id', v_node.roadmap_id),
                                coalesce(new.completed_at, now()));
    -- milestone: whole section done?
    if v_node.parent_id is not null then
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

-- node is complete if its lesson is complete or it was marked manually
create or replace function public.node_completed_by(p_node uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.roadmap_node_progress where node_id = p_node and user_id = p_user)
      or exists (
        select 1 from public.roadmap_nodes n
        join public.student_progress sp on sp.lesson_id = n.lesson_id and sp.user_id = p_user
        where n.id = p_node and sp.status = 'completed'
      )
$$;

create or replace function public.before_lesson_progress()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger student_progress_before
  before insert or update on public.student_progress
  for each row execute function public.before_lesson_progress();

create trigger student_progress_after
  after insert or update on public.student_progress
  for each row execute function public.on_lesson_progress();

create or replace function public.on_node_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  select title into v_title from public.roadmap_nodes where id = new.node_id;
  perform public.log_activity(new.user_id, 'roadmap_node_completed', new.node_id, v_title,
                              '{}'::jsonb, new.completed_at);
  return null;
end $$;

create trigger roadmap_node_progress_after
  after insert on public.roadmap_node_progress
  for each row execute function public.on_node_progress();

-- Coding: first accepted submission per problem → problem_solved
create or replace function public.on_coding_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_problem record;
begin
  if new.verdict = 'accepted' then
    select title, difficulty, topic into v_problem from public.coding_problems where id = new.problem_id;
    perform public.log_activity(new.user_id, 'problem_solved', new.problem_id, v_problem.title,
      jsonb_build_object('difficulty', v_problem.difficulty, 'topic', v_problem.topic, 'language', new.language),
      new.created_at);
  end if;
  return null;
end $$;

create trigger coding_submissions_after
  after insert or update of verdict on public.coding_submissions
  for each row execute function public.on_coding_submission();

-- Attendance: present/late → class_attended (dated on the class day)
create or replace function public.on_attendance()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_class record;
begin
  select title, starts_at into v_class from public.classes where id = new.class_id;
  if new.status in ('present', 'late') then
    perform public.log_activity(new.user_id, 'class_attended', new.class_id, v_class.title,
                                '{}'::jsonb, v_class.starts_at);
  else
    -- correction (e.g. present → absent): retract the event
    delete from public.activity_logs
    where user_id = new.user_id and type = 'class_attended' and entity_id = new.class_id;
  end if;
  -- attendance-based achievements can only be evaluated here
  perform public.check_achievements(new.user_id);
  return null;
end $$;

create trigger attendance_after
  after insert or update of status on public.attendance
  for each row execute function public.on_attendance();

-- Assignment submissions: students can't grade themselves; submit → activity
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

create trigger assignment_submissions_before
  before insert or update on public.assignment_submissions
  for each row execute function public.before_assignment_submission();

create or replace function public.on_assignment_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  select title into v_title from public.assignments where id = new.assignment_id;
  if new.status in ('submitted', 'reviewed') and (tg_op = 'INSERT' or old.status = 'in_progress') then
    perform public.log_activity(new.user_id, 'assignment_submitted', new.assignment_id, v_title,
                                '{}'::jsonb, coalesce(new.submitted_at, now()));
  end if;
  if tg_op = 'UPDATE' and new.status = 'reviewed' and old.status <> 'reviewed' then
    perform public.notify_user(new.user_id, 'assignment_reviewed', 'Assignment reviewed',
      v_title || coalesce(' — ' || new.grade || ' pts', ''), '/assignments/' || new.assignment_id);
  end if;
  return null;
end $$;

create trigger assignment_submissions_after
  after insert or update of status on public.assignment_submissions
  for each row execute function public.on_assignment_submission();

-- ---------------------------------------------------------------------------
-- Fan-out notifications
-- ---------------------------------------------------------------------------
create or replace function public.on_announcement_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'announcement', new.title, left(new.body, 240), '/dashboard'
  from public.profiles p
  where p.role = 'student'
    and (new.course_id is null
         or exists (select 1 from public.course_enrollments e where e.user_id = p.id and e.course_id = new.course_id));
  return null;
end $$;

create trigger announcements_after_insert
  after insert on public.announcements
  for each row execute function public.on_announcement_created();

create or replace function public.on_assignment_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_published then
    insert into public.notifications (user_id, type, title, body, link)
    select e.user_id, 'assignment_new', 'New assignment: ' || new.title,
           'Due ' || to_char(new.due_at at time zone 'UTC', 'Mon DD, HH24:MI "UTC"'),
           '/assignments/' || new.id
    from public.course_enrollments e where e.course_id = new.course_id;
  end if;
  return null;
end $$;

create trigger assignments_after_insert
  after insert on public.assignments
  for each row execute function public.on_assignment_created();

create or replace function public.on_class_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.starts_at > now() then
    insert into public.notifications (user_id, type, title, body, link)
    select p.id, 'class_upcoming', 'Class scheduled: ' || new.title,
           to_char(new.starts_at at time zone 'UTC', 'Dy Mon DD, HH24:MI "UTC"'),
           '/class/' || new.id
    from public.profiles p
    where p.role = 'student'
      and (new.course_id is null
           or exists (select 1 from public.course_enrollments e where e.user_id = p.id and e.course_id = new.course_id));
  end if;
  return null;
end $$;

create trigger classes_after_insert
  after insert on public.classes
  for each row execute function public.on_class_created();

-- ---------------------------------------------------------------------------
-- Read RPCs (security invoker → RLS applies)
-- ---------------------------------------------------------------------------

-- Per-course progress for the current user
create or replace function public.get_course_progress()
returns table (course_id uuid, total_lessons int, completed_lessons int, percent int)
language sql stable set search_path = public as $$
  select l.course_id,
         count(*)::int,
         count(sp.lesson_id)::int,
         (case when count(*) = 0 then 0 else (count(sp.lesson_id) * 100 / count(*)) end)::int
  from public.lessons l
  left join public.student_progress sp
    on sp.lesson_id = l.id and sp.user_id = auth.uid() and sp.status = 'completed'
  where l.is_published
  group by l.course_id
$$;

-- Topic-level progress for a roadmap for the current user
create or replace function public.get_roadmap_progress(p_roadmap_id uuid)
returns table (node_id uuid, completed boolean)
language sql stable set search_path = public as $$
  select n.id,
         exists (select 1 from public.roadmap_node_progress p where p.node_id = n.id and p.user_id = auth.uid())
         or exists (select 1 from public.student_progress sp
                    where sp.lesson_id = n.lesson_id and sp.user_id = auth.uid() and sp.status = 'completed')
  from public.roadmap_nodes n
  where n.roadmap_id = p_roadmap_id and n.kind = 'topic'
$$;

-- Percentage per roadmap the user follows (or every published roadmap)
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
         (count(*) filter (where done) * 100 / greatest(count(*), 1))::int
  from t group by roadmap_id
$$;

create or replace function public.get_my_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_streak record;
  v_result jsonb;
begin
  if v_uid is null then return null; end if;
  select * into v_streak from public.user_streak(v_uid);
  select jsonb_build_object(
    'lessons_completed', (select count(*) from public.activity_logs where user_id = v_uid and type = 'lesson_completed'),
    'problems_solved', (select count(*) from public.activity_logs where user_id = v_uid and type = 'problem_solved'),
    'problems_attempted', (select count(distinct problem_id) from public.coding_submissions where user_id = v_uid),
    'courses_completed', (select count(*) from public.activity_logs where user_id = v_uid and type = 'course_completed'),
    'assignments_submitted', (select count(*) from public.activity_logs where user_id = v_uid and type = 'assignment_submitted'),
    'classes_attended', (select count(*) from public.attendance where user_id = v_uid and status in ('present', 'late')),
    'classes_total', (select count(*) from public.attendance where user_id = v_uid and status <> 'excused'),
    'current_streak', v_streak.current_streak,
    'longest_streak', v_streak.longest_streak,
    'active_today', v_streak.active_today,
    'solved_by_difficulty', (
      select coalesce(jsonb_object_agg(d, c), '{}'::jsonb) from (
        select metadata ->> 'difficulty' d, count(*) c from public.activity_logs
        where user_id = v_uid and type = 'problem_solved' group by 1) s),
    'language_usage', (
      select coalesce(jsonb_object_agg(language, c), '{}'::jsonb) from (
        select language, count(*) c from public.coding_submissions where user_id = v_uid group by 1) s)
  ) into v_result;
  return v_result;
end $$;

-- Activity heatmap / weekly chart for the current user
create or replace function public.get_my_activity(p_days int default 84)
returns table (day date, count int)
language sql stable security definer set search_path = public as $$
  select activity_date, count(*)::int from public.activity_logs
  where user_id = auth.uid() and type <> 'achievement_unlocked'
    and activity_date >= current_date - p_days
  group by activity_date order by activity_date
$$;

-- Topic progress for coding practice
create or replace function public.get_topic_progress()
returns table (topic text, total int, solved int)
language sql stable security definer set search_path = public as $$
  select p.topic, count(*)::int,
         count(*) filter (where exists (
           select 1 from public.activity_logs a
           where a.user_id = auth.uid() and a.type = 'problem_solved' and a.entity_id = p.id))::int
  from public.coding_problems p where p.is_published
  group by p.topic order by p.topic
$$;

-- ---------------------------------------------------------------------------
-- Write RPCs
-- ---------------------------------------------------------------------------
create or replace function public.enroll_in_roadmap(p_roadmap_id uuid, p_make_primary boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.roadmaps where id = p_roadmap_id and is_published) then
    raise exception 'roadmap not found';
  end if;
  insert into public.roadmap_enrollments (user_id, roadmap_id) values (v_uid, p_roadmap_id)
  on conflict do nothing;
  insert into public.course_enrollments (user_id, course_id)
  select distinct v_uid, n.course_id from public.roadmap_nodes n
  join public.courses c on c.id = n.course_id and c.is_published
  where n.roadmap_id = p_roadmap_id and n.course_id is not null
  on conflict do nothing;
  if p_make_primary then
    update public.profiles set primary_roadmap_id = p_roadmap_id where id = v_uid;
  end if;
end $$;

create or replace function public.complete_onboarding(
  p_goal public.learning_goal, p_experience public.experience_level, p_interests text[]
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_roadmap record;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;

  -- Recommend: exact goal match, prefer difficulty matching experience
  select r.id, r.slug into v_roadmap from public.roadmaps r
  where r.is_published
  order by (r.goal = p_goal) desc nulls last,
           (r.difficulty = case p_experience when 'beginner' then 'beginner'::public.difficulty
                                              when 'some_experience' then 'intermediate'::public.difficulty
                                              else 'advanced'::public.difficulty end) desc,
           r.created_at
  limit 1;

  update public.profiles
     set learning_goal = p_goal, experience = p_experience,
         interests = coalesce(p_interests, '{}'), onboarded_at = now()
   where id = v_uid;

  if v_roadmap.id is not null then
    perform public.enroll_in_roadmap(v_roadmap.id, true);
  end if;
  return v_roadmap.slug;
end $$;

create or replace function public.enroll_in_course(p_course_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.courses where id = p_course_id and is_published) then
    raise exception 'course not found';
  end if;
  insert into public.course_enrollments (user_id, course_id) values (auth.uid(), p_course_id)
  on conflict do nothing;
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'You cannot demote yourself';
  end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

-- ---------------------------------------------------------------------------
-- Search
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
     where p.is_published and (p.title ilike q.pat or p.topic ilike q.pat or q.pat ilike any (p.tags)) limit 8)
  union all
  (select 'class', k.id, k.title, to_char(k.starts_at, 'Mon DD HH24:MI'), '/class/' || k.id
     from public.classes k, q where k.title ilike q.pat order by k.starts_at desc limit 5)
$$;

-- ---------------------------------------------------------------------------
-- Staff analytics
-- ---------------------------------------------------------------------------
create or replace function public.get_platform_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  select jsonb_build_object(
    'total_students', (select count(*) from public.profiles where role = 'student'),
    'total_instructors', (select count(*) from public.profiles where role = 'instructor'),
    'active_courses', (select count(*) from public.courses where is_published),
    'classes_this_week', (select count(*) from public.classes
                          where starts_at >= date_trunc('week', now()) and starts_at < date_trunc('week', now()) + interval '7 days'),
    'avg_attendance', (select coalesce(round(100.0 * count(*) filter (where status in ('present','late'))
                              / nullif(count(*) filter (where status <> 'excused'), 0)), 0) from public.attendance),
    'assignments_completed', (select count(*) from public.assignment_submissions where status in ('submitted', 'reviewed')),
    'active_users_7d', (select count(distinct user_id) from public.activity_logs where occurred_at > now() - interval '7 days'),
    'student_growth', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w, 'count', c) order by w), '[]'::jsonb) from (
        select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') w, count(*) c
        from public.profiles where role = 'student' and created_at > now() - interval '12 weeks' group by 1) s),
    'daily_activity', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb) from (
        select activity_date::text d, count(*) c from public.activity_logs
        where activity_date > current_date - 30 and type <> 'achievement_unlocked' group by 1) s),
    'attendance_by_week', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w, 'rate', r) order by w), '[]'::jsonb) from (
        select to_char(date_trunc('week', k.starts_at), 'YYYY-MM-DD') w,
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
        where user_id in (select user_id from my_students) and activity_date > current_date - 14
          and type <> 'achievement_unlocked' group by 1) s)
  ) into v;
  return v;
end $$;

-- Per-student summary for instructors
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
  where p.role = 'student' and public.is_staff()
    and (public.is_admin() or exists (
      select 1 from public.course_enrollments e join public.courses c on c.id = e.course_id
      where e.user_id = p.id and c.instructor_id = auth.uid()))
  order by p.full_name
$$;
