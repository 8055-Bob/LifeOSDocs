import assert from 'node:assert/strict';
import test from 'node:test';
import { queueRecordForProcessing } from '../src/index.js';

test('workers produces a queued processing job for a record', () => {
  assert.deepEqual(queueRecordForProcessing({ id: 'record_1' }), { recordId: 'record_1', status: 'queued' });
});
