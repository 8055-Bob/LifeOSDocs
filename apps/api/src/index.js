export function acceptJournalDraft(record) {
  if (record.status !== 'draft') {
    throw new Error('Only draft records can be queued');
  }

  return { accepted: true, processingStatus: 'queued' };
}
