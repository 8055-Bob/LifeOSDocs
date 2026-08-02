export function createHabitsViewModel({ habits }) {
  return {
    items: habits.map((habit) => ({
      ...habit,
      action: habit.completedToday ? null : 'complete',
      streakLabel: `${habit.streak} days`,
    })),
  };
}

export function createGoalsViewModel({ goals }) {
  return {
    items: [...goals]
      .sort((left, right) => (left.status === 'active' ? -1 : 1) - (right.status === 'active' ? -1 : 1))
      .map((goal) => ({ ...goal, progressLabel: `${goal.progress}%` })),
  };
}

export function createInsightsViewModel({ insights }) {
  return {
    items: insights.map((insight) => ({
      ...insight,
      evidenceCount: insight.evidenceRecordIds.length,
      action: 'suppress',
    })),
  };
}
