# Durable Processing Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Supabase-backed queue adapter that stores processing jobs safely across API restarts.

**Architecture:** Add a `processing_jobs` table with one task per Life Record, then implement a small `SupabaseProcessingQueue` adapter in the workers app. The adapter calls Supabase REST for enqueue/status changes and a database RPC for atomic job claiming; it never stores journal text or secret keys in results.

**Tech Stack:** Supabase PostgreSQL/RLS/RPC, Node.js ESM, Node test runner, existing fetch-based adapter pattern.

## Global Constraints

- A job references a Life Record and contains no raw journal text.
- One Life Record maps to no more than one active processing job.
- Errors expose a safe code only; they must not expose provider responses or diary content.
- User-facing writes require the existing authenticated user boundary.
- New behaviour is implemented test-first; each task ends with a passing test run.

---

## File Structure

- Create: `docs/supabase/004_processing_jobs.sql` — idempotent queue table, RLS and atomic claim function.
- Create: `apps/workers/src/supabase-processing-queue.js` — durable queue adapter.
- Create: `apps/workers/test/supabase-processing-queue.test.mjs` — adapter contract tests using a fake fetch implementation.
- Modify: `apps/workers/src/processing-queue.js` — document interface parity only if required by adapter tests.
- Modify: `docs/superpowers/plans/2026-08-01-lifeos-mvp-remaining-work.md` — mark the durable queue adapter delivered after manual SQL migration validation.

### Task 1: Queue database migration

**Files:**
- Create: `docs/supabase/004_processing_jobs.sql`

**Interfaces:**
- Produces table `public.processing_jobs` and RPC `public.claim_processing_job()`.
- `claim_processing_job()` returns one row with `id`, `record_id`, `user_id`, `status`, `attempt_count` or no rows.

- [ ] **Step 1: Add a migration acceptance query**

Add a commented verification query that selects exactly the queue fields and verifies the unique `record_id` constraint after migration.

```sql
select id, record_id, user_id, status, attempt_count
from public.processing_jobs
order by created_at desc
limit 10;
```

- [ ] **Step 2: Write the SQL migration**

Create an idempotent migration with this core shape:

```sql
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
```

- [ ] **Step 3: Add RLS and atomic claim RPC**

Use user-owned select policy and a `security definer` RPC that selects one `queued` row using `for update skip locked`, updates it to `processing`, increments attempts and returns the claimed row.

- [ ] **Step 4: Validate migration syntax**

Run: `rg -n "processing_jobs|claim_processing_job|raw_text" docs/supabase/004_processing_jobs.sql`

Expected: the file declares the queue, atomic claim function, and has no `raw_text` field.

- [ ] **Step 5: Commit migration**

```powershell
git add docs/supabase/004_processing_jobs.sql
git commit -m "Add durable processing job schema"
```

### Task 2: Supabase queue adapter

**Files:**
- Create: `apps/workers/src/supabase-processing-queue.js`
- Create: `apps/workers/test/supabase-processing-queue.test.mjs`

**Interfaces:**
- Consumes: `{ url, secretKey, fetchImpl? }` in `new SupabaseProcessingQueue(...)`.
- Produces `enqueue({ recordId, userId })`, `claimNext()`, `complete({ recordId })`, `fail({ recordId, errorCode })`, and `get({ recordId })`.

- [ ] **Step 1: Write a failing enqueue test**

```js
test('creates one queued job without journal content', async () => {
  const queue = new SupabaseProcessingQueue({ url: 'https://lifeos.supabase.co', secretKey: 'server-key', fetchImpl });
  await queue.enqueue({ recordId: 'record_1', userId: 'user_1' });
  assert.match(calls[0].url, /processing_jobs/);
  assert.deepEqual(JSON.parse(calls[0].options.body), { record_id: 'record_1', user_id: 'user_1', status: 'queued' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/workers test -- supabase-processing-queue.test.mjs`

Expected: FAIL because `SupabaseProcessingQueue` does not yet exist.

- [ ] **Step 3: Implement minimal enqueue and get behaviour**

Use `POST /rest/v1/processing_jobs?on_conflict=record_id` with `resolution=ignore-duplicates`, and `GET /rest/v1/processing_jobs?record_id=eq.<id>` for status lookup. Reuse the safe error pattern from `apps/api/src/supabase-record-store.js`.

- [ ] **Step 4: Write and run a failing claim test**

```js
test('claims one queued job through the atomic RPC', async () => {
  const job = await queue.claimNext();
  assert.equal(calls[0].url, 'https://lifeos.supabase.co/rest/v1/rpc/claim_processing_job');
  assert.equal(job.status, 'processing');
});
```

Run: `pnpm --dir apps/workers test -- supabase-processing-queue.test.mjs`

Expected: FAIL because `claimNext` is missing.

- [ ] **Step 5: Implement claim, complete and fail behaviour**

Call the RPC for claim. Use PATCH filters by `record_id` and current status for `complete` and `fail`; `fail` writes only the supplied stable `errorCode`.

- [ ] **Step 6: Run adapter test to verify it passes**

Run: `pnpm --dir apps/workers test -- supabase-processing-queue.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit adapter**

```powershell
git add apps/workers/src/supabase-processing-queue.js apps/workers/test/supabase-processing-queue.test.mjs
git commit -m "Add Supabase processing queue adapter"
```

### Task 3: Regression verification and plan update

**Files:**
- Modify: `docs/superpowers/plans/2026-08-01-lifeos-mvp-remaining-work.md`

**Interfaces:**
- Consumes durable queue adapter and migration from Tasks 1–2.
- Produces a marked completion for the durable queue portion of Stage 4; storage remains excluded by the approved privacy decision.

- [ ] **Step 1: Update original plan status**

Replace Stage 4’s queue part with a checked sub-item stating that the Supabase durable queue adapter is implemented; keep the production OAuth, email and push work unchecked.

- [ ] **Step 2: Run the entire automated test suite**

Run: `pnpm test`

Expected: all workspace tests pass.

- [ ] **Step 3: Run type and build checks**

Run: `pnpm typecheck; pnpm build`

Expected: all workspace packages exit with code 0.

- [ ] **Step 4: Commit plan update**

```powershell
git add docs/superpowers/plans/2026-08-01-lifeos-mvp-remaining-work.md
git commit -m "Track durable queue completion"
```
