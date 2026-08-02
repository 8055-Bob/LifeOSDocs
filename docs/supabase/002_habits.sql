-- LifeOS habits: run after 001_initial_schema.sql.

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  frequency text not null default 'daily' check (frequency = 'daily'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (habit_id, completed_on)
);

create index if not exists habits_user_active_idx on public.habits(user_id, is_active, created_at desc);
create index if not exists habit_completions_habit_day_idx on public.habit_completions(habit_id, completed_on desc);

alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

drop policy if exists "users manage own habits" on public.habits;
drop policy if exists "users manage own habit completions" on public.habit_completions;

create policy "users manage own habits" on public.habits
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users manage own habit completions" on public.habit_completions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.habits, public.habit_completions to authenticated;
