import assert from 'node:assert/strict';
import test from 'node:test';
import { LifeRecordService } from '../src/life-record-service.js';

test('deletes a user-owned Life Record and removes its sensitive content', () => {
  const service = new LifeRecordService();
  service.add({ id: 'record_1', userId: 'user_1', status: 'processed', rawText: 'Private thought', transcript: 'Private thought' });

  const deleted = service.delete({ recordId: 'record_1', userId: 'user_1' });

  assert.equal(deleted.status, 'deleted');
  assert.equal(deleted.rawText, null);
  assert.equal(deleted.transcript, null);
  assert.throws(() => service.delete({ recordId: 'record_1', userId: 'user_2' }), { message: 'Life Record not found' });
});
