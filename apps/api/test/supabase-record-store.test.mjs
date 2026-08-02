import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseRecordStore } from '../src/supabase-record-store.js';

test('verifies the access token and stores a text Life Record with its analysis artifact', async () => {
  const requests = [];
  const store = new SupabaseRecordStore({
    url: 'https://project.supabase.co',
    secretKey: 'server-secret',
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith('/auth/v1/user')) return jsonResponse({ id: 'a0f5b26a-2494-4cf5-8738-eab1ff1ae2ac', email: 'me@example.com' });
      if (url.includes('/rest/v1/life_records')) return jsonResponse([{ id: 'record_123' }]);
      return jsonResponse({});
    },
  });

  const record = await store.saveAnalyzedRecord({
    accessToken: 'user-token', text: 'Today I walked.', mood: 4,
    analysis: { summary: 'You walked.', emotions: [], topics: ['health'], reflectionQuestion: 'How did it feel?', nextAction: 'Walk tomorrow.' },
  });

  assert.equal(record.id, 'record_123');
  assert.equal(requests.length, 4);
  assert.equal(requests[0].url, 'https://project.supabase.co/auth/v1/user');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer user-token');
  assert.equal(requests[1].url, 'https://project.supabase.co/rest/v1/profiles?on_conflict=id');
  assert.deepEqual(JSON.parse(requests[2].options.body), { user_id: 'a0f5b26a-2494-4cf5-8738-eab1ff1ae2ac', source_type: 'text', raw_text: 'Today I walked.', mood: 4, status: 'processed' });
  assert.equal(JSON.parse(requests[3].options.body).record_id, 'record_123');
});

test('returns processed journal records with their diary analysis artifact', async () => {
  const requests = [];
  const store = new SupabaseRecordStore({
    url: 'https://project.supabase.co', secretKey: 'server-secret',
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      if (url.endsWith('/auth/v1/user')) return jsonResponse({ id: 'user_1' });
      return jsonResponse([{ id: 'record_1', raw_text: 'Saved thought', mood: 3, created_at: '2026-08-02T10:00:00.000Z', record_artifacts: [{ result: { summary: 'A concise summary' } }] }]);
    },
  });

  const records = await store.listJournalRecords({ accessToken: 'user-token' });

  assert.deepEqual(records, [{ id: 'record_1', text: 'Saved thought', mood: 3, createdAt: '2026-08-02T10:00:00.000Z', analysis: { summary: 'A concise summary' } }]);
  assert.match(requests[1].url, /life_records\?select=/);
  assert.match(requests[1].url, /user_id=eq.user_1/);
});

test('deletes a journal record only when it belongs to the verified user', async () => {
  const requests = [];
  const store = new SupabaseRecordStore({
    url: 'https://project.supabase.co', secretKey: 'server-secret',
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      if (url.endsWith('/auth/v1/user')) return jsonResponse({ id: 'user_1' });
      return jsonResponse([{ id: 'record_1' }]);
    },
  });

  const result = await store.deleteJournalRecord({ accessToken: 'user-token', recordId: 'record_1' });

  assert.deepEqual(result, { id: 'record_1', deleted: true });
  assert.match(requests[1].url, /life_records\?id=eq.record_1&user_id=eq.user_1/);
  assert.equal(requests[1].options.method, 'DELETE');
});

function jsonResponse(body) {
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
}
