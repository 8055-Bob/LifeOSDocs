const MINIMUM_MOOD_SAMPLES = 3;

export function calculateWeeklyMoodAggregate({ userId, weekStart, checkIns }) {
  const userCheckIns = checkIns.filter((checkIn) => checkIn.userId === userId);
  const sampleSize = userCheckIns.length;

  if (sampleSize < MINIMUM_MOOD_SAMPLES) {
    return {
      userId,
      weekStart,
      sampleSize,
      averageMoodScore: null,
      status: 'insufficient_data',
    };
  }

  const averageMoodScore = userCheckIns.reduce((total, checkIn) => total + checkIn.score, 0) / sampleSize;

  return {
    userId,
    weekStart,
    sampleSize,
    averageMoodScore,
    status: 'ready',
  };
}
