export function createHabit({ id, userId, name, frequency = 'daily' }) {
  if (!id?.trim() || !userId?.trim() || !name?.trim()) {
    throw new Error('id, userId, and name are required');
  }

  if (frequency !== 'daily') {
    throw new Error('frequency must be daily');
  }

  return {
    id,
    userId,
    name,
    frequency,
    completedToday: false,
    streak: 0,
    createdAt: new Date().toISOString(),
  };
}
