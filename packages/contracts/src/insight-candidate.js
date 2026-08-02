export function createInsightCandidate({
  id,
  userId,
  statement,
  confidence,
  evidenceRecordIds,
}) {
  if (!id?.trim() || !userId?.trim() || !statement?.trim()) {
    throw new Error('id, userId, and statement are required');
  }

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('confidence must be between 0 and 1');
  }

  if (!Array.isArray(evidenceRecordIds) || evidenceRecordIds.length < 3) {
    throw new Error('at least 3 evidence record IDs are required');
  }

  return {
    id,
    userId,
    statement,
    confidence,
    evidenceRecordIds: [...evidenceRecordIds],
    status: 'candidate',
    createdAt: new Date().toISOString(),
  };
}
