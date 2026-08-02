import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentArtifactStore } from '../src/agent-artifact-store.js';

test('stores a versioned artifact for a Life Record', () => {
  const store = new AgentArtifactStore();

  const artifact = store.save({
    recordId: 'record_1',
    agentName: 'summary',
    schemaVersion: '1.0',
    modelVersion: 'test-model-1',
    result: { summary: 'Краткое содержание дня.' },
    confidence: 0.9,
  });

  assert.equal(artifact.recordId, 'record_1');
  assert.equal(artifact.agentName, 'summary');
  assert.equal(artifact.modelVersion, 'test-model-1');
  assert.deepEqual(store.listForRecord('record_1'), [artifact]);
});

test('rejects an artifact without a confidence score', () => {
  const store = new AgentArtifactStore();

  assert.throws(
    () => store.save({ recordId: 'record_1', agentName: 'summary', schemaVersion: '1.0', modelVersion: 'v1', result: {} }),
    { message: 'confidence must be a number between 0 and 1' },
  );
});

test('rejects an artifact missing required provenance or result data', () => {
  const store = new AgentArtifactStore();

  assert.throws(
    () => store.save({ recordId: 'record_1', agentName: 'summary', schemaVersion: '1.0', modelVersion: 'v1', confidence: 0.9 }),
    { message: 'artifact provenance and result are required' },
  );
});

test('rejects a summary artifact whose result does not match its schema', () => {
  const store = new AgentArtifactStore();

  assert.throws(
    () => store.save({
      recordId: 'record_1', agentName: 'summary', schemaVersion: '1.0', modelVersion: 'v1', result: {}, confidence: 0.9,
    }),
    { message: 'summary artifact result is invalid' },
  );
});

test('rejects emotion scores outside the safe confidence range', () => {
  const store = new AgentArtifactStore();

  assert.throws(
    () => store.save({
      recordId: 'record_1', agentName: 'emotion', schemaVersion: '1.0', modelVersion: 'v1', result: { emotions: [{ label: 'anxiety', score: 1.2 }] }, confidence: 0.9,
    }),
    { message: 'emotion artifact result is invalid' },
  );
});
