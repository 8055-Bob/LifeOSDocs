import assert from 'node:assert/strict';
import test from 'node:test';
import { createLifeRecordDraft } from '../src/index.js';

test('creates a text draft with its original thought and draft status', () => {
  const draft = createLifeRecordDraft({
    userId: 'user_1',
    sourceType: 'text',
    rawText: 'Сегодня я сделал шаг.',
  });

  assert.equal(draft.userId, 'user_1');
  assert.equal(draft.sourceType, 'text');
  assert.equal(draft.rawText, 'Сегодня я сделал шаг.');
  assert.equal(draft.status, 'draft');
  assert.equal(Number.isNaN(Date.parse(draft.createdAt)), false);
});

test('creates a voice draft that references its uploaded media asset', () => {
  const draft = createLifeRecordDraft({
    userId: 'user_1',
    sourceType: 'voice',
    mediaAssetId: 'media_1',
  });

  assert.equal(draft.sourceType, 'voice');
  assert.equal(draft.mediaAssetId, 'media_1');
  assert.equal(draft.status, 'draft');
});
