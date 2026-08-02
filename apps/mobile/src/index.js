import { createLifeRecordDraft } from '@lifeos/contracts';

export function createJournalDraft(userId, rawText) {
  return createLifeRecordDraft({ userId, sourceType: 'text', rawText });
}
