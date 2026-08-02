export function createMoodCheckIn({ id, userId, score, note = null }) {
  if (!id?.trim() || !userId?.trim()) {
    throw new Error('id and userId are required');
  }

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error('score must be an integer between 1 and 5');
  }

  return {
    id,
    userId,
    score,
    note,
    createdAt: new Date().toISOString(),
  };
}
