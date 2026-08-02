export function createGoal({ id, userId, title, targetDate = null }) {
  if (!id?.trim() || !userId?.trim() || !title?.trim()) {
    throw new Error('id, userId, and title are required');
  }

  return {
    id,
    userId,
    title,
    targetDate,
    status: 'active',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
