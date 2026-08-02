import assert from 'node:assert/strict';
import test from 'node:test';
import { createJournalDraft } from '../src/index.js';

test('mobile creates a journal draft through the shared contract', () => {
  assert.equal(createJournalDraft('user_1', 'Первая мысль').status, 'draft');
});
