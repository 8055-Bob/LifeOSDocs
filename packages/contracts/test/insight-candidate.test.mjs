import assert from 'node:assert/strict';
import test from 'node:test';
import { createInsightCandidate } from '../src/index.js';

test('creates an evidence-backed insight candidate once the data threshold is met', () => {
  const insight = createInsightCandidate({
    id: 'insight_1',
    userId: 'user_1',
    statement: 'Mood tends to be higher on walking days.',
    confidence: 0.78,
    evidenceRecordIds: ['record_1', 'record_2', 'record_3'],
  });

  assert.equal(insight.status, 'candidate');
  assert.equal(insight.confidence, 0.78);
  assert.deepEqual(insight.evidenceRecordIds, ['record_1', 'record_2', 'record_3']);
});

test('rejects an insight with insufficient evidence', () => {
  assert.throws(
    () => createInsightCandidate({
      id: 'insight_1',
      userId: 'user_1',
      statement: 'Mood tends to be higher on walking days.',
      confidence: 0.78,
      evidenceRecordIds: ['record_1', 'record_2'],
    }),
    { message: 'at least 3 evidence record IDs are required' },
  );
});
