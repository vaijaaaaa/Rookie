-- ---------------------------------------------------------------------------
-- Indian Standard Time everywhere.
--
-- * Database default timezone → Asia/Kolkata, so current_date, date_trunc(),
--   to_char() etc. bucket by IST days/weeks (applies to new connections).
-- * Every profile is IST (the app no longer offers a timezone picker).
-- * Activity days are recomputed in IST so streaks/heatmaps line up.
-- * Notification texts show IST instead of UTC.
-- ---------------------------------------------------------------------------

do $$ begin
  execute format('alter database %I set timezone to %L', current_database(), 'Asia/Kolkata');
end $$;
set timezone = 'Asia/Kolkata';

alter table public.profiles alter column timezone set default 'Asia/Kolkata';
update public.profiles set timezone = 'Asia/Kolkata' where timezone is distinct from 'Asia/Kolkata';

update public.activity_logs
   set activity_date = (occurred_at at time zone 'Asia/Kolkata')::date
 where activity_date is distinct from (occurred_at at time zone 'Asia/Kolkata')::date;
alter table public.activity_logs
  alter column activity_date set default ((now() at time zone 'Asia/Kolkata')::date);

alter table public.student_payments
  alter column paid_on set default ((now() at time zone 'Asia/Kolkata')::date);

create or replace function public.on_assignment_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_published then
    insert into public.notifications (user_id, type, title, body, link)
    select e.user_id, 'assignment_new', 'New assignment: ' || new.title,
           'Due ' || to_char(new.due_at at time zone 'Asia/Kolkata', 'Mon DD, HH12:MI AM "IST"'),
           '/assignments/' || new.id
    from public.course_enrollments e where e.course_id = new.course_id;
  end if;
  return null;
end $$;

create or replace function public.on_class_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.starts_at > now() then
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
