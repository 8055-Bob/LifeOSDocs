import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoal, fetchGoals, updateGoalProgress } from '../src/supabase-goals-api.js';

const config = { url: 'https://project.supabase.co', publishableKey: 'public-key', accessToken: 'user-token' };

test('creates a goal for the signed-in user', async () => {
  const goal = await createGoal({ ...config, userId: 'user_1', title: 'Пробежать 5 км', targetDate: '2026-12-01', fetchImpl: async () => ({ ok: true, json: async () => [{ id: 'goal_1', title: 'Пробежать 5 км' }] }) });
  assert.equal(goal.id, 'goal_1');
});

test('maps and sorts active goals before completed goals', async () => {
  const goals = await fetchGoals({ ...config, fetchImpl: async () => ({ ok: true, json: async () => [{ id: 'done', title: 'Готово', progress: 100, status: 'completed', target_date: null }, { id: 'active', title: 'В процессе', progress: 30, status: 'active', target_date: '2026-12-01' }] }) });
  assert.deepEqual(goals.map((goal) => goal.id), ['active', 'done']);
});

test('sets completed status at 100 percent progress', async () => {
  const goal = await updateGoalProgress({ ...config, goalId: 'goal_1', progress: 100, fetchImpl: async () => ({ ok: true, json: async () => [{ id: 'goal_1', progress: 100, status: 'completed' }] }) });
  assert.equal(goal.status, 'completed');
});
