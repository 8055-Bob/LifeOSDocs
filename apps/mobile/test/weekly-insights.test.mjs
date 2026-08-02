import assert from 'node:assert/strict';
import test from 'node:test';
import { createWeeklyInsights } from '../src/weekly-insights.js';

test('summarizes mood, journal activity, habits and goals for the week', () => {
  const result = createWeeklyInsights({ records: [{ mood: 4 }, { mood: 2 }, { mood: null }], habits: [{ completedToday: true }, { completedToday: false }], goals: [{ progress: 60 }, { progress: 100 }] });
  assert.deepEqual(result, { averageMood: 3, journalCount: 3, habitsCompleted: 1, habitsTotal: 2, activeGoals: 1, completedGoals: 1 });
});
