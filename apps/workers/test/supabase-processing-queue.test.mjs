import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseProcessingQueue } from '../src/supabase-processing-queue.js';

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, text: async () => JSON.stringify(body) };
}

function createFetch(responses) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return jsonResponse(responses.shift() ?? []);
    },
  };
}

test('creates one queued job without diary content', async () => {
  const { calls, fetchImpl } = createFetch([[
    { id: 'job_1', record_id: 'record_1', user_id: 'user_1', status: 'queued', attempt_count: 0 },
  ]]);
  const queue = new SupabaseProcessingQueue({
    url: 'https://lifeos.supabase.co', secretKey: 'server-key', fetchImpl,
  });

  const job = await queue.enqueue({ recordId: 'record_1', userId: 'user_1' });

  assert.equal(job.status, 'queued');
  assert.match(calls[0].url, /\/rest\/v1\/processing_jobs\?on_conflict=record_id$/);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    record_id: 'record_1', user_id: 'user_1', status: 'queued',
  });
  assert.equal(JSON.parse(calls[0].options.body).raw_text, undefined);
});

test('claims one queued job through the atomic RPC', async () => {
  const { calls, fetchImpl } = createFetch([[
    { id: 'job_1', record_id: 'record_1', user_id: 'user_1', status: 'processing', attempt_count: 1 },
  ]]);
  const queue = new SupabaseProcessingQueue({
    url: 'https://lifeos.supabase.co', secretKey: 'server-key', fetchImpl,
  });

  const job = await queue.claimNext();

  assert.equal(calls[0].url, 'https://lifeos.supabase.co/rest/v1/rpc/claim_processing_job');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(job.status, 'processing');
  assert.equal(job.attemptCount, 1);
});

test('completes only a processing job', async () => {
  const { calls, fetchImpl } = createFetch([[
    { id: 'job_1', record_id: 'record_1', user_id: 'user_1', status: 'processed', attempt_count: 1 },
  ]]);
  const queue = new SupabaseProcessingQueue({
    url: 'https://lifeos.supabase.co', secretKey: 'server-key', fetchImpl,
  });

  const job = await queue.complete({ recordId: 'record_1' });

  assert.match(calls[0].url, /processing_jobs\?record_id=eq\.record_1&status=eq\.processing$/);
  assert.deepEqual(JSON.parse(calls[0].options.body), { status: 'processed' });
  assert.equal(job.status, 'processed');
});

test('stores only a stable code when a job fails', async () => {
  const { calls, fetchImpl } = createFetch([[
    { id: 'job_1', record_id: 'record_1', user_id: 'user_1', status: 'failed', attempt_count: 1, last_error_code: 'provider_unavailable' },
  ]]);
  const queue = new SupabaseProcessingQueue({
    url: 'https://lifeos.supabase.co', secretKey: 'server-key', fetchImpl,
  });

  await queue.fail({ recordId: 'record_1', errorCode: 'provider_unavailable' });

  assert.deepEqual(JSON.parse(calls[0].options.body), {
    status: 'failed', last_error_code: 'provider_unavailable',
  });
});
