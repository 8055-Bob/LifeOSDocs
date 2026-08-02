export function createWeeklyInsights({ records, habits, goals }) {
  const moods = records.map((record) => record.mood).filter(Number.isFinite);
  return {
    averageMood: moods.length ? Math.round(moods.reduce((sum, mood) => sum + mood, 0) / moods.length) : null,
    journalCount: records.length,
    habitsCompleted: habits.filter((habit) => habit.completedToday).length,
    habitsTotal: habits.length,
    activeGoals: goals.filter((goal) => (goal.status ?? (goal.progress === 100 ? 'completed' : 'active')) === 'active').length,
    completedGoals: goals.filter((goal) => (goal.status ?? (goal.progress === 100 ? 'completed' : 'active')) === 'completed').length,
  };
}
