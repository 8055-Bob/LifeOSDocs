import assert from 'node:assert/strict';
import test from 'node:test';
import { createIdentityViewModel } from '../src/identity-view-model.js';

test('shows active knowledge assertions with confidence and evidence', () => {
  const model = createIdentityViewModel({
    assertions: [
      {
        id: 'assertion_1',
        type: 'value',
        value: 'freedom',
        confidence: 0.82,
        evidenceRecordIds: ['record_1', 'record_2'],
        status: 'active',
      },
      { id: 'assertion_2', type: 'goal', value: 'old goal', confidence: 0.5, evidenceRecordIds: [], status: 'superseded' },
    ],
  });

  assert.deepEqual(model.sections, [{
    type: 'value',
    items: [{
      id: 'assertion_1',
      value: 'freedom',
      confidence: 0.82,
      evidenceRecordIds: ['record_1', 'record_2'],
      canCorrect: true,
    }],
  }]);
});
