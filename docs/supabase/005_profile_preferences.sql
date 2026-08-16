-- LifeOS profile preferences: run after 001_initial_schema.sql.
-- These fields are optional and belong only to the signed-in user via existing RLS.

alter table public.profiles
  add column if not exists current_focus text,
  add column if not exists timezone text,
  add column if not exists communication_style text not null default 'supportive'
    check (communication_style in ('supportive', 'balanced', 'direct'));
