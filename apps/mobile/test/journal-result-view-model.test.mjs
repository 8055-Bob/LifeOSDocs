import assert from 'node:assert/strict';
import test from 'node:test';
import { createJournalResultViewModel } from '../src/journal-result-view-model.js';

test('projects processed diary artifacts into an editable journal result', () => {
  const result = createJournalResultViewModel({
    lifeRecord: { id: 'record_1', status: 'processed', rawText: 'I felt better after walking.' },
    artifacts: [
      { agentName: 'summary', result: { summary: 'A walk improved the day.' } },
      { agentName: 'emotion', result: { emotions: [{ label: 'relief', score: 0.7 }] } },
      { agentName: 'topic_entity', result: { topics: ['health'], entities: [] } },
      { agentName: 'reflection_action', result: { question: 'What helped most?', nextAction: 'Plan a walk.' } },
    ],
  });

  assert.equal(result.recordId, 'record_1');
  assert.equal(result.summary, 'A walk improved the day.');
  assert.deepEqual(result.emotions, [{ label: 'relief', score: 0.7 }]);
  assert.deepEqual(result.topics, ['health']);
  assert.equal(result.reflectionQuestion, 'What helped most?');
  assert.equal(result.nextAction, 'Plan a walk.');
  assert.equal(result.canEditOriginal, true);
});
