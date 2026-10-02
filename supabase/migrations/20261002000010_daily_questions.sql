-- ---------------------------------------------------------------------------
-- Daily questions: an admin posts one question per (IST) day; students write
-- their answer like a note, and their answered days form a daily track.
-- ---------------------------------------------------------------------------

create table if not exists public.daily_questions (
  id uuid primary key default gen_random_uuid(),
  question_date date not null unique,
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 50000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists daily_questions_date_idx on public.daily_questions (question_date desc);

create table if not exists public.daily_question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.daily_questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, user_id)
);
create index if not exists daily_question_answers_user_idx on public.daily_question_answers (user_id, created_at desc);

drop trigger if exists daily_questions_updated_at on public.daily_questions;
create trigger daily_questions_updated_at before update on public.daily_questions
  for each row execute function public.set_updated_at();
drop trigger if exists daily_question_answers_updated_at on public.daily_question_answers;
create trigger daily_question_answers_updated_at before update on public.daily_question_answers
  for each row execute function public.set_updated_at();

alter table public.daily_questions enable row level security;
alter table public.daily_question_answers enable row level security;

-- Students see questions up to today (IST) — future questions stay hidden until their day.
drop policy if exists "daily_questions: read released" on public.daily_questions;
create policy "daily_questions: read released" on public.daily_questions for select to authenticated
  using (public.is_admin() or question_date <= (now() at time zone 'Asia/Kolkata')::date);
drop policy if exists "daily_questions: admin write" on public.daily_questions;
create policy "daily_questions: admin write" on public.daily_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Answers: own rows only; admins can read everyone's.
drop policy if exists "daily_answers: read own or admin" on public.daily_question_answers;
create policy "daily_answers: read own or admin" on public.daily_question_answers for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "daily_answers: insert own released" on public.daily_question_answers;
create policy "daily_answers: insert own released" on public.daily_question_answers for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.daily_questions q
                where q.id = question_id and q.question_date <= (now() at time zone 'Asia/Kolkata')::date)
  );
drop policy if exists "daily_answers: update own" on public.daily_question_answers;
create policy "daily_answers: update own" on public.daily_question_answers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "daily_answers: delete own" on public.daily_question_answers;
create policy "daily_answers: delete own" on public.daily_question_answers for delete to authenticated
  using (user_id = auth.uid());

-- An answer can't be moved to another question or user.
create or replace function public.pin_daily_answer()
returns trigger language plpgsql as $$
begin
  new.question_id := old.question_id;
  new.user_id := old.user_id;
  return new;
end $$;
drop trigger if exists daily_question_answers_pin on public.daily_question_answers;
create trigger daily_question_answers_pin before update on public.daily_question_answers
  for each row execute function public.pin_daily_answer();

grant select, insert, update, delete on public.daily_questions to authenticated;
grant select, insert, update, delete on public.daily_question_answers to authenticated;
