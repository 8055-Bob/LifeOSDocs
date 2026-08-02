import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentArtifactStore } from '../src/agent-artifact-store.js';
import { ProcessingQueue } from '../src/processing-queue.js';
import { RecordProcessingCoordinator } from '../src/record-processing-coordinator.js';

test('runs the diary analysis agents and returns a separate memory proposal', async () => {
  const agent = (agentName, result) => ({
    run: async ({ recordId }) => ({ recordId, agentName, result, confidence: 0.8 }),
  });
  const coordinator = new RecordProcessingCoordinator({
    summaryAgent: agent('summary', { summary: 'Кратко.' }),
    emotionAgent: agent('emotion', { emotions: [] }),
    topicEntityAgent: agent('topic_entity', { topics: ['работа'], entities: [] }),
    reflectionActionAgent: agent('reflection_action', { question: 'Что важно?', nextAction: 'Сделать шаг.' }),
    memoryAgent: { run: async () => ({ status: 'proposed', type: 'goal', value: 'Запустить бизнес' }) },
  });

  const result = await coordinator.processTextRecord({ recordId: 'record_1', text: 'Я хочу запустить бизнес.' });

  assert.deepEqual(result.artifacts.map(({ agentName }) => agentName), ['summary', 'emotion', 'topic_entity', 'reflection_action']);
  assert.deepEqual(result.memoryProposal, { status: 'proposed', type: 'goal', value: 'Запустить бизнес' });
});

test('persists agent artifacts and completes the record processing job', async () => {
  const artifact = (agentName, result) => ({
    run: async ({ recordId }) => ({ recordId, agentName, schemaVersion: '1.0', modelVersion: 'test-model', result, confidence: 0.8 }),
  });
  const artifactStore = new AgentArtifactStore();
  const queue = new ProcessingQueue();
  queue.enqueue({ recordId: 'record_1' });
  const coordinator = new RecordProcessingCoordinator({
    summaryAgent: artifact('summary', { summary: 'Кратко.' }),
    emotionAgent: artifact('emotion', { emotions: [] }),
    topicEntityAgent: artifact('topic_entity', { topics: [], entities: [] }),
    reflectionActionAgent: artifact('reflection_action', { question: 'Что важно?', nextAction: 'Сделать шаг.' }),
    memoryAgent: { run: async () => ({ status: 'proposed', type: 'goal', value: 'Учиться' }) },
    artifactStore,
    queue,
  });

  const result = await coordinator.processTextRecord({ recordId: 'record_1', text: 'Хочу учиться.' });

  assert.equal(result.processingStatus, 'processed');
  assert.equal(artifactStore.listForRecord('record_1').length, 4);
  assert.deepEqual(queue.get('record_1'), { recordId: 'record_1', status: 'processed' });
});
