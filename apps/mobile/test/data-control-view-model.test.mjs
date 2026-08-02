import assert from 'node:assert/strict';
import test from 'node:test';
import { createDataControlViewModel } from '../src/data-control-view-model.js';

test('requires explicit confirmation for correction and deletion actions', () => {
  const correction = createDataControlViewModel({ action: 'correct_assertion', targetId: 'assertion_1' });
  const deletion = createDataControlViewModel({ action: 'delete_record', targetId: 'record_1' });

  assert.equal(correction.requiresConfirmation, true);
  assert.equal(correction.confirmationAction, 'apply_correction');
  assert.equal(deletion.requiresConfirmation, true);
  assert.equal(deletion.confirmationAction, 'delete_record');
});
