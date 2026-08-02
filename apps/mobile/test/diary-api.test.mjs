import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeDiaryThought, deleteDiaryRecord, fetchDiaryHistory } from '../src/diary-api.js';

test('sends the thought to the configured LifeOS API', async () => {
  const result = await analyzeDiaryThought({
    apiUrl: 'http://192.168.1.2:8787', text: 'A difficult day.',
    fetchImpl: async (url, options) => ({ ok: true, json: async () => ({ url, body: options.body }) }),
  });

  assert.equal(result.url, 'http://192.168.1.2:8787/v1/diary/analyze');
  assert.equal(JSON.parse(result.body).text, 'A difficult day.');
});

test('sends mood and an optional user access token to the API', async () => {
  const result = await analyzeDiaryThought({
    apiUrl: 'http://192.168.1.2:8787', text: 'A better day.', mood: 5, accessToken: 'session-token',
    fetchImpl: async (url, options) => ({ ok: true, json: async () => ({ url, headers: options.headers, body: options.body }) }),
  });

  assert.equal(result.headers.Authorization, 'Bearer session-token');
  assert.deepEqual(JSON.parse(result.body), { text: 'A better day.', mood: 5 });
});

test('loads a signed-in user history from the LifeOS API', async () => {
  const records = await fetchDiaryHistory({
    apiUrl: 'http://192.168.1.2:8787', accessToken: 'session-token',
    fetchImpl: async (url, options) => ({ ok: true, json: async () => ({ records: [{ id: 'record_1' }] }), url, options }),
  });

  assert.deepEqual(records, [{ id: 'record_1' }]);
});

test('deletes a signed-in user record through the LifeOS API', async () => {
  const result = await deleteDiaryRecord({
    apiUrl: 'http://192.168.1.2:8787', accessToken: 'session-token', recordId: 'record_1',
    fetchImpl: async (url, options) => ({ ok: true, json: async () => ({ id: 'record_1', deleted: true }), url, options }),
  });

  assert.deepEqual(result, { id: 'record_1', deleted: true });
});
