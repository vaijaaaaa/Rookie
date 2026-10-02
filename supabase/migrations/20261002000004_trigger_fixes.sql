-- =============================================================================
-- Rookie — trigger fixes (safe to run on any database that has 0001–0003)
-- * activity rows use the real completion time (course / roadmap topics)
-- * submissions created already graded still count as assignment_submitted
-- Only `create or replace function`, so it is re-runnable.
-- =============================================================================

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

create or replace function public.on_node_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  select title into v_title from public.roadmap_nodes where id = new.node_id;
  perform public.log_activity(new.user_id, 'roadmap_node_completed', new.node_id, v_title,
                              '{}'::jsonb, new.completed_at);
  return null;
end $$;

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
