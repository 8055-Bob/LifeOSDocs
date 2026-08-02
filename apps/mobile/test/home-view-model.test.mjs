import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeViewModel } from '../src/home-view-model.js';

test('projects the daily LifeOS home state from independently supplied data', () => {
  const home = createHomeViewModel({
    profile: { displayName: 'Alex' },
    latestMood: { score: 4 },
    habits: [
      { id: 'habit_1', name: 'Walk', completedToday: true, streak: 3 },
      { id: 'habit_2', name: 'Read', completedToday: false, streak: 1 },
    ],
    goals: [{ id: 'goal_1', title: 'Run a half marathon', progress: 40, status: 'active' }],
    recommendation: 'Take a short walk before your next task.',
  });

  assert.equal(home.greeting, 'Добрый день, Alex');
  assert.equal(home.moodScore, 4);
  assert.equal(home.habits.completedCount, 1);
  assert.equal(home.habits.totalCount, 2);
  assert.equal(home.primaryGoal.title, 'Run a half marathon');
  assert.equal(home.recommendation, 'Take a short walk before your next task.');
});
