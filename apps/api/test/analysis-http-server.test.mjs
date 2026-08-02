import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalysisHttpServer } from '../src/analysis-http-server.js';

test('accepts a diary thought and returns the provider analysis over HTTP', async () => {
  const server = createAnalysisHttpServer({
    provider: { analyze: async ({ text }) => ({ summary: `Summary: ${text}`, emotions: [], topics: [], reflectionQuestion: 'Question?', nextAction: 'Rest.' }) },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/v1/diary/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Today was difficult.' }),
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).summary, 'Summary: Today was difficult.');
  await new Promise((resolve) => server.close(resolve));
});

test('emits privacy-safe telemetry for a completed diary analysis', async (t) => {
  const events = [];
  const server = createAnalysisHttpServer({
    provider: { analyze: async () => ({ summary: 'Summary', emotions: [], topics: [], reflectionQuestion: 'Question?', nextAction: 'Rest.' }) },
    telemetry: { record: (event) => events.push(event) },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/v1/diary/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Личная мысль, которую нельзя логировать.' }),
  });

  assert.equal(response.status, 200);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, 'diary.analysis.succeeded');
  assert.equal(typeof events[0].details.durationMs, 'number');
  assert.equal(JSON.stringify(events[0]).includes('Личная мысль'), false);
});

test('rejects an empty or oversized diary thought before calling the AI provider', async (t) => {
  let calls = 0;
  const server = createAnalysisHttpServer({
    provider: { analyze: async () => { calls += 1; return {}; } },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const empty = await fetch(`http://127.0.0.1:${port}/v1/diary/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '   ' }),
  });
  const tooLong = await fetch(`http://127.0.0.1:${port}/v1/diary/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(10_001) }),
  });

  assert.equal(empty.status, 400);
  assert.deepEqual(await empty.json(), { error: 'Text must be between 1 and 10000 characters' });
  assert.equal(tooLong.status, 400);
  assert.deepEqual(await tooLong.json(), { error: 'Text must be between 1 and 10000 characters' });
  assert.equal(calls, 0);
});

test('returns a safe error for malformed diary JSON', async (t) => {
  let calls = 0;
  const server = createAnalysisHttpServer({
    provider: { analyze: async () => { calls += 1; return {}; } },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/v1/diary/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not-json}',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid request body' });
  assert.equal(calls, 0);
});

test('persists an analyzed thought for the authenticated user when a record store is configured', async (t) => {
  const saved = [];
  const server = createAnalysisHttpServer({
    provider: { analyze: async () => ({ summary: 'Saved summary', emotions: [], topics: [], reflectionQuestion: 'Question?', nextAction: 'Rest.' }) },
    recordStore: {
      saveAnalyzedRecord: async (input) => {
        saved.push(input);
        return { id: 'record_123' };
      },
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/v1/diary/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer user-access-token' },
    body: JSON.stringify({ text: 'Keep this thought.', mood: 4 }),
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).recordId, 'record_123');
  assert.deepEqual(saved, [{ accessToken: 'user-access-token', text: 'Keep this thought.', mood: 4, analysis: { summary: 'Saved summary', emotions: [], topics: [], reflectionQuestion: 'Question?', nextAction: 'Rest.' } }]);
});

test('returns the authenticated user journal history from the record store', async (t) => {
  const server = createAnalysisHttpServer({
    provider: { analyze: async () => ({}) },
    recordStore: {
      listJournalRecords: async ({ accessToken }) => {
        assert.equal(accessToken, 'user-access-token');
        return [{ id: 'record_123', createdAt: '2026-08-02T10:00:00.000Z', mood: 4, text: 'Saved thought', analysis: { summary: 'Saved summary' } }];
      },
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/v1/diary/records`, {
    headers: { Authorization: 'Bearer user-access-token' },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    records: [{ id: 'record_123', createdAt: '2026-08-02T10:00:00.000Z', mood: 4, text: 'Saved thought', analysis: { summary: 'Saved summary' } }],
  });
});

test('deletes only the authenticated user journal record', async (t) => {
  const deleted = [];
  const server = createAnalysisHttpServer({
    provider: { analyze: async () => ({}) },
    recordStore: {
      deleteJournalRecord: async (input) => {
        deleted.push(input);
        return { id: 'record_123', deleted: true };
      },
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/v1/diary/records/record_123`, {
    method: 'DELETE', headers: { Authorization: 'Bearer user-access-token' },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 'record_123', deleted: true });
  assert.deepEqual(deleted, [{ accessToken: 'user-access-token', recordId: 'record_123' }]);
});
