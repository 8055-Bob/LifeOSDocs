import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalysisHttpServer } from '../src/analysis-http-server.js';

test('completes the authenticated diary flow from analysis through deletion', async (t) => {
  const records = [];
  const recordStore = {
    async saveAnalyzedRecord({ text, mood, analysis }) {
      const record = { id: `record_${records.length + 1}`, text, mood, analysis, createdAt: '2026-08-02T00:00:00.000Z' };
      records.unshift(record);
      return record;
    },
    async listJournalRecords() {
      return records;
    },
    async deleteJournalRecord({ recordId }) {
      const index = records.findIndex((record) => record.id === recordId);
      if (index < 0) throw new Error('Life Record not found');
      records.splice(index, 1);
      return { id: recordId, deleted: true };
    },
  };
  const server = createAnalysisHttpServer({
    provider: {
      analyze: async ({ text }) => ({
        summary: `Кратко: ${text}`,
        emotions: [{ label: 'спокойствие', score: 0.6 }],
        topics: ['день'],
        reflectionQuestion: 'Что помогло тебе сегодня?',
        nextAction: 'Отдохни десять минут.',
      }),
    },
    recordStore,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer test-user-token' };

  const analyzed = await fetch(`${baseUrl}/v1/diary/analyze`, {
    method: 'POST', headers, body: JSON.stringify({ text: 'Сегодня я закончил важную задачу.', mood: 4 }),
  });
  const analysis = await analyzed.json();

  assert.equal(analyzed.status, 200);
  assert.equal(analysis.recordId, 'record_1');
  assert.equal(analysis.summary, 'Кратко: Сегодня я закончил важную задачу.');

  const history = await fetch(`${baseUrl}/v1/diary/records`, { headers });
  assert.deepEqual(await history.json(), {
    records: [{
      id: 'record_1', text: 'Сегодня я закончил важную задачу.', mood: 4,
      createdAt: '2026-08-02T00:00:00.000Z', analysis: {
        summary: 'Кратко: Сегодня я закончил важную задачу.', emotions: [{ label: 'спокойствие', score: 0.6 }],
        topics: ['день'], reflectionQuestion: 'Что помогло тебе сегодня?', nextAction: 'Отдохни десять минут.',
      },
    }],
  });

  const deleted = await fetch(`${baseUrl}/v1/diary/records/record_1`, { method: 'DELETE', headers });
  assert.deepEqual(await deleted.json(), { id: 'record_1', deleted: true });

  const emptyHistory = await fetch(`${baseUrl}/v1/diary/records`, { headers });
  assert.deepEqual(await emptyHistory.json(), { records: [] });
});
