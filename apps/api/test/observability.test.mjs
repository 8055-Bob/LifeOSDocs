import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequestLog, createSafeConsoleTelemetry } from '../src/observability.js';

test('creates a request log without raw journal content', () => {
  const log = createRequestLog({
    requestId: 'req_123',
    event: 'life_record.created',
    details: {
      recordId: 'record_1',
      rawText: 'Это личная запись пользователя.',
      transcript: 'И это тоже нельзя логировать.',
    },
  });

  assert.deepEqual(log, {
    requestId: 'req_123',
    event: 'life_record.created',
    details: { recordId: 'record_1' },
  });
});

test('creates a request ID when one is not supplied', () => {
  const log = createRequestLog({ event: 'health.checked', details: {} });

  assert.match(log.requestId, /^req_/);
});

test('writes telemetry without raw diary content', () => {
  const lines = [];
  const telemetry = createSafeConsoleTelemetry({ write: (line) => lines.push(line) });

  telemetry.record({
    event: 'diary.analysis.succeeded',
    details: { durationMs: 42, rawText: 'Это нельзя записывать в журнал сервера.' },
  });

  const event = JSON.parse(lines[0]);
  assert.equal(event.event, 'diary.analysis.succeeded');
  assert.deepEqual(event.details, { durationMs: 42 });
});
