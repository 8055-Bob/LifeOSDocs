import { describe, expect, it } from 'vitest';
import { createLifeRecordDraft } from '../src/index.js';

describe('createLifeRecordDraft', () => {
  it('creates a text draft with the original thought and draft status', () => {
    const draft = createLifeRecordDraft({
      userId: 'user_1',
      sourceType: 'text',
      rawText: 'Сегодня я сделал шаг.',
    });

    expect(draft.userId).toBe('user_1');
    expect(draft.sourceType).toBe('text');
    expect(draft.rawText).toBe('Сегодня я сделал шаг.');
    expect(draft.status).toBe('draft');
    expect(Number.isNaN(Date.parse(draft.createdAt))).toBe(false);
  });
});
