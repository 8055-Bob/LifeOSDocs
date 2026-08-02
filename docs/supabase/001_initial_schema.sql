-- LifeOS initial schema. Run this in the Supabase SQL Editor once per project.
-- Every personal-data table has Row Level Security enabled.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.life_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('text', 'voice')),
  raw_text text,
  transcript text,
  media_path text,
  mood smallint check (mood between 1 and 5),
  status text not null default 'draft' check (status in ('draft', 'queued', 'processing', 'processed', 'failed', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((source_type = 'text' and raw_text is not null) or (source_type = 'voice' and media_path is not null))
);

create table if not exists public.record_artifacts (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.life_records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_name text not null,
  schema_version text not null,
  model_version text not null,
  result jsonb not null,
  confidence numeric not null check (confidence between 0 and 1),
  created_at timestamptz not null default now()
);

create table if not exists public.memory_proposals (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.life_records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (operation in ('add', 'supersede', 'retract')),
  assertion_type text not null,
  value text not null,
  confidence numeric not null check (confidence between 0 and 1),
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_assertions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assertion_type text not null,
  value text not null,
  confidence numeric not null check (confidence between 0 and 1),
  evidence_record_ids uuid[] not null,
  status text not null default 'active' check (status in ('active', 'superseded', 'retracted')),
  created_at timestamptz not null default now(),
  retracted_at timestamptz
);

create table if not exists public.knowledge_audit_events (
  id uuid primary key default gen_random_uuid(),
  assertion_id uuid not null references public.knowledge_assertions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  source_record_id uuid references public.life_records(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists life_records_user_created_idx on public.life_records(user_id, created_at desc);
create index if not exists record_artifacts_record_idx on public.record_artifacts(record_id, created_at);
create index if not exists knowledge_assertions_user_status_idx on public.knowledge_assertions(user_id, status);

alter table public.profiles enable row level security;
alter table public.life_records enable row level security;
alter table public.record_artifacts enable row level security;
alter table public.memory_proposals enable row level security;
alter table public.knowledge_assertions enable row level security;
alter table public.knowledge_audit_events enable row level security;

-- Safe to rerun after a partially successful execution: replace existing policies.
drop policy if exists "users manage own profile" on public.profiles;
drop policy if exists "users manage own life records" on public.life_records;
drop policy if exists "users read own record artifacts" on public.record_artifacts;
drop policy if exists "users read own memory proposals" on public.memory_proposals;
drop policy if exists "users read own knowledge assertions" on public.knowledge_assertions;
drop policy if exists "users read own knowledge audit" on public.knowledge_audit_events;

create policy "users manage own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "users manage own life records" on public.life_records for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users read own record artifacts" on public.record_artifacts for select to authenticated using (user_id = auth.uid());
create policy "users read own memory proposals" on public.memory_proposals for select to authenticated using (user_id = auth.uid());
create policy "users read own knowledge assertions" on public.knowledge_assertions for select to authenticated using (user_id = auth.uid());
create policy "users read own knowledge audit" on public.knowledge_audit_events for select to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.profiles, public.life_records to authenticated;
grant select on public.record_artifacts, public.memory_proposals, public.knowledge_assertions, public.knowledge_audit_events to authenticated;

insert into storage.buckets (id, name, public) values ('life-media', 'life-media', false) on conflict (id) do nothing;
drop policy if exists "users manage own private media" on storage.objects;
create policy "users manage own private media" on storage.objects for all to authenticated
  using (bucket_id = 'life-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'life-media' and (storage.foldername(name))[1] = auth.uid()::text);
