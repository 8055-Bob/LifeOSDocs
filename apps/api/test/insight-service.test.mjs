import assert from 'node:assert/strict';
import test from 'node:test';
import { InsightService } from '../src/insight-service.js';

test('suppresses an insight at the user request', () => {
  const service = new InsightService();
  service.add({
    id: 'insight_1',
    userId: 'user_1',
    statement: 'Mood tends to be higher on walking days.',
    confidence: 0.78,
    evidenceRecordIds: ['record_1', 'record_2', 'record_3'],
  });

  const suppressed = service.suppress({ insightId: 'insight_1', userId: 'user_1' });

  assert.equal(suppressed.status, 'suppressed');
  assert.deepEqual(service.listVisible('user_1'), []);
});
