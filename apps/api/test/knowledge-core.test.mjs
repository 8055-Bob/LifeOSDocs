import assert from 'node:assert/strict';
import test from 'node:test';
import { KnowledgeCore } from '../src/knowledge-core.js';

test('applies a proposed memory update and records its evidence', () => {
  const core = new KnowledgeCore();

  const assertion = core.apply({
    recordId: 'record_1',
    operation: 'add',
    type: 'goal',
    value: 'Запустить бизнес',
    confidence: 0.71,
    status: 'proposed',
  });

  assert.equal(assertion.status, 'active');
  assert.deepEqual(assertion.evidenceRecordIds, ['record_1']);
  assert.deepEqual(core.list(), [assertion]);
});

test('refuses to apply a proposal that has not been proposed', () => {
  const core = new KnowledgeCore();

  assert.throws(
    () => core.apply({ status: 'accepted' }),
    { message: 'Only proposed memory updates can be applied' },
  );
});

test('preserves an earlier assertion when the user corrects it', () => {
  const core = new KnowledgeCore();
  const original = core.apply({
    recordId: 'record_1', operation: 'add', type: 'goal', value: 'Запустить бизнес', confidence: 0.71, status: 'proposed',
  });

  const corrected = core.correct({ assertionId: original.id, value: 'Стать учителем', recordId: 'record_2' });

  assert.equal(corrected.value, 'Стать учителем');
  assert.equal(corrected.confidence, 1);
  assert.equal(core.get(original.id).status, 'superseded');
  assert.deepEqual(core.list({ includeSuperseded: true }).map(({ value, status }) => ({ value, status })), [
    { value: 'Запустить бизнес', status: 'superseded' },
    { value: 'Стать учителем', status: 'active' },
  ]);
});

test('retrieves only active assertions that match a type and search term', () => {
  const core = new KnowledgeCore();
  const goal = core.apply({ recordId: 'record_1', operation: 'add', type: 'goal', value: 'Run a half marathon', confidence: 0.8, status: 'proposed' });
  core.apply({ recordId: 'record_2', operation: 'add', type: 'value', value: 'Freedom', confidence: 0.7, status: 'proposed' });
  core.correct({ assertionId: goal.id, value: 'Run a marathon', recordId: 'record_3' });

  assert.deepEqual(core.find({ type: 'goal', search: 'marathon' }).map(({ value }) => value), ['Run a marathon']);
});

test('records an auditable retraction instead of deleting an assertion', () => {
  const core = new KnowledgeCore();
  const assertion = core.apply({ recordId: 'record_1', operation: 'add', type: 'goal', value: 'Open a business', confidence: 0.7, status: 'proposed' });

  const retracted = core.retract({ assertionId: assertion.id, recordId: 'record_2', reason: 'User says this is no longer a goal' });

  assert.equal(retracted.status, 'retracted');
  assert.deepEqual(core.audit(assertion.id).map(({ action }) => action), ['created', 'retracted']);
  assert.deepEqual(core.list(), []);
});

test('retracts active assertions when their last source Life Record is deleted', () => {
  const core = new KnowledgeCore();
  const assertion = core.apply({ recordId: 'record_1', operation: 'add', type: 'interest', value: 'Photography', confidence: 0.6, status: 'proposed' });

  core.retractEvidenceForRecord('record_1');

  assert.equal(core.get(assertion.id).status, 'retracted');
  assert.deepEqual(core.audit(assertion.id).at(-1).action, 'retracted_due_to_record_deletion');
});
