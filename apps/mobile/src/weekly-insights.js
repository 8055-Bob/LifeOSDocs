const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function createWeekTimeline(referenceDate) {
  const reference = new Date(referenceDate);
  const endDate = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(endDate);
    date.setUTCDate(endDate.getUTCDate() - 6 + index);
    const dateKey = date.toISOString().slice(0, 10);
    const mondayIndex = (date.getUTCDay() + 6) % 7;
    return { dateKey, label: WEEKDAY_LABELS[mondayIndex] };
  });
}

function attachLatestMood(timeline, records) {
  const latestByDate = new Map();
  for (const record of records) {
    const dateKey = record.createdAt?.slice(0, 10);
    const previous = latestByDate.get(dateKey);
    if (!previous || record.createdAt > previous.createdAt) latestByDate.set(dateKey, record);
  }
  return timeline.map((day) => ({ ...day, mood: latestByDate.get(day.dateKey)?.mood ?? null }));
}

function goalStatus(goal) {
  return goal.status ?? (goal.progress === 100 ? 'completed' : 'active');
}

export function createWeeklyInsights({ records, habits, goals, referenceDate = new Date().toISOString() }) {
  const timeline = createWeekTimeline(referenceDate);
  const weekDates = new Set(timeline.map((day) => day.dateKey));
  const recordsInWeek = records.filter((record) => weekDates.has(record.createdAt?.slice(0, 10)));
  const moodTimeline = attachLatestMood(timeline, recordsInWeek);
  const moods = recordsInWeek.map((record) => record.mood).filter(Number.isFinite);

  return {
    averageMood: moods.length ? Math.round(moods.reduce((sum, mood) => sum + mood, 0) / moods.length) : null,
    journalCount: recordsInWeek.length,
    habitsCompleted: habits.filter((habit) => habit.completedToday).length,
    habitsTotal: habits.length,
    activeGoals: goals.filter((goal) => goalStatus(goal) === 'active').length,
    completedGoals: goals.filter((goal) => goalStatus(goal) === 'completed').length,
    moodTimeline,
    hasWeeklyActivity: recordsInWeek.length > 0 || habits.length > 0 || goals.length > 0,
  };
}
