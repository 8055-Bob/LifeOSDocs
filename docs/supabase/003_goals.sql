-- LifeOS goals: run after 001_initial_schema.sql.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  target_date date,
  progress smallint not null default 0 check (progress between 0 and 100),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_status_idx on public.goals(user_id, status, created_at desc);

alter table public.goals enable row level security;

drop policy if exists "users manage own goals" on public.goals;
create policy "users manage own goals" on public.goals
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.goals to authenticated;
