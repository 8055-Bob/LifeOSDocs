import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessingQueue } from '../src/processing-queue.js';

test('returns the same queued job when the record is submitted twice', () => {
  const queue = new ProcessingQueue();

  const first = queue.enqueue({ recordId: 'record_1' });
  const second = queue.enqueue({ recordId: 'record_1' });

  assert.deepEqual(second, first);
  assert.equal(queue.size(), 1);
});

test('marks a claimed job as processing', () => {
  const queue = new ProcessingQueue();
  queue.enqueue({ recordId: 'record_1' });

  assert.deepEqual(queue.claimNext(), { recordId: 'record_1', status: 'processing' });
});

test('marks a processing job as processed', () => {
  const queue = new ProcessingQueue();
  queue.enqueue({ recordId: 'record_1' });
  queue.claimNext();

  assert.deepEqual(queue.complete({ recordId: 'record_1' }), { recordId: 'record_1', status: 'processed' });
});
