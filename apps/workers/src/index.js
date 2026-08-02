export function queueRecordForProcessing(record) {
  if (!record.id?.trim()) {
    throw new Error('record.id is required');
  }

  return { recordId: record.id, status: 'queued' };
}
