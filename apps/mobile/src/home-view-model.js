export function createHomeViewModel({
  profile,
  latestMood = null,
  habits = [],
  goals = [],
  recommendation = null,
}) {
  const activeGoals = goals.filter((goal) => goal.status === 'active');
  const completedCount = habits.filter((habit) => habit.completedToday).length;

  return {
    greeting: profile.displayName === 'друг' ? 'Добрый день' : `Добрый день, ${profile.displayName}`,
    moodScore: latestMood?.score ?? null,
    habits: {
      completedCount,
      totalCount: habits.length,
      items: habits.map((habit) => ({ ...habit })),
    },
    primaryGoal: activeGoals[0] ? { ...activeGoals[0] } : null,
    recommendation,
  };
}
