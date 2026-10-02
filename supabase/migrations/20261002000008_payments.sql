-- =============================================================================
-- Rookie — student payments ledger
-- Admins record monthly fee payments received from students (cash, UPI,
-- bank transfer…). This is a record-keeping ledger, not a payment gateway.
-- Students can read their own payments; only admins can write. Safe to re-run.
-- =============================================================================

do $$ begin
  create type public.payment_method as enum ('cash', 'upi', 'bank_transfer', 'card', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.student_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- billing month, always stored as the 1st of the month
  period date not null check (extract(day from period) = 1),
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  method public.payment_method not null default 'upi',
  paid_on date not null default current_date,
  reference text,
  note text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_payments_period_idx on public.student_payments (period, user_id);
create index if not exists student_payments_user_idx on public.student_payments (user_id, period desc);

drop trigger if exists student_payments_updated_at on public.student_payments;
create trigger student_payments_updated_at
  before update on public.student_payments
  for each row execute function public.set_updated_at();

alter table public.student_payments enable row level security;

drop policy if exists "payments: read own or admin" on public.student_payments;
create policy "payments: read own or admin" on public.student_payments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "payments: admin write" on public.student_payments;
create policy "payments: admin write" on public.student_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
