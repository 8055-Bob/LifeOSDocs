-- LifeOS durable processing queue. Run once in Supabase SQL Editor.
-- Jobs deliberately do not contain raw diary text; they only reference a Life Record.

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null unique references public.life_records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'processed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists processing_jobs_status_created_idx on public.processing_jobs(status, created_at);
create index if not exists processing_jobs_user_created_idx on public.processing_jobs(user_id, created_at desc);

alter table public.processing_jobs enable row level security;
drop policy if exists "users read own processing jobs" on public.processing_jobs;
create policy "users read own processing jobs" on public.processing_jobs
  for select to authenticated using (user_id = auth.uid());
grant select on public.processing_jobs to authenticated;

-- This function is for the server-side worker only. `skip locked` means two workers
-- cannot claim the same queued task at the same time.
create or replace function public.claim_processing_job()
returns table (
  id uuid,
  record_id uuid,
  user_id uuid,
  status text,
  attempt_count integer,
  last_error_code text,
  created_at timestamptz,
  updated_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with next_job as (
    select job.id
    from public.processing_jobs as job
    where job.status = 'queued'
    order by job.created_at asc
    for update skip locked
    limit 1
  ), claimed_job as (
    update public.processing_jobs as job
    set status = 'processing',
        attempt_count = job.attempt_count + 1,
        started_at = now(),
        updated_at = now(),
        last_error_code = null
    from next_job
    where job.id = next_job.id
    returning job.*
  )
  select job.id, job.record_id, job.user_id, job.status, job.attempt_count,
    job.last_error_code, job.created_at, job.updated_at, job.started_at, job.completed_at
  from claimed_job as job;
end;
$$;

revoke all on function public.claim_processing_job() from public;
grant execute on function public.claim_processing_job() to service_role;

-- Verification after running the migration:
-- select id, record_id, user_id, status, attempt_count
-- from public.processing_jobs order by created_at desc limit 10;
