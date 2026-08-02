import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptJournalDraft } from '../src/index.js';

test('API accepts a shared journal draft for processing', () => {
  assert.deepEqual(acceptJournalDraft({ status: 'draft' }), { accepted: true, processingStatus: 'queued' });
});
