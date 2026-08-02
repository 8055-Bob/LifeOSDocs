import assert from 'node:assert/strict';
import test from 'node:test';
import { createKnowledgeAssertion, createMemoryProposal } from '../src/index.js';

test('creates an explainable knowledge assertion with evidence and confidence', () => {
  const assertion = createKnowledgeAssertion({
    id: 'assertion_1',
    type: 'goal',
    value: 'Запустить собственный бизнес',
    confidence: 0.72,
    evidenceRecordIds: ['record_1'],
  });

  assert.equal(assertion.status, 'active');
  assert.deepEqual(assertion.evidenceRecordIds, ['record_1']);
  assert.equal(assertion.confidence, 0.72);
});

test('creates a proposal that cannot mutate knowledge by itself', () => {
  const proposal = createMemoryProposal({
    recordId: 'record_1',
    operation: 'add',
    type: 'value',
    value: 'Свобода',
    confidence: 0.63,
  });

  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.recordId, 'record_1');
  assert.equal(proposal.operation, 'add');
});
