import assert from 'node:assert/strict';
import test from 'node:test';
import { createHabitsViewModel, createGoalsViewModel, createInsightsViewModel } from '../src/collection-view-models.js';

test('projects habits into actionable daily items', () => {
  const model = createHabitsViewModel({ habits: [{ id: 'habit_1', name: 'Walk', completedToday: false, streak: 2 }] });
  assert.equal(model.items[0].action, 'complete');
  assert.equal(model.items[0].streakLabel, '2 days');
});

test('projects active goals before inactive goals', () => {
  const model = createGoalsViewModel({ goals: [
    { id: 'goal_1', title: 'Archived', status: 'completed', progress: 100 },
    { id: 'goal_2', title: 'Active', status: 'active', progress: 40 },
  ] });
  assert.equal(model.items[0].id, 'goal_2');
  assert.equal(model.items[0].progressLabel, '40%');
});

test('projects evidence-backed visible insights with a hide action', () => {
  const model = createInsightsViewModel({ insights: [{ id: 'insight_1', statement: 'Walking helps.', confidence: 0.8, evidenceRecordIds: ['r1', 'r2', 'r3'] }] });
  assert.equal(model.items[0].action, 'suppress');
  assert.equal(model.items[0].evidenceCount, 3);
});
