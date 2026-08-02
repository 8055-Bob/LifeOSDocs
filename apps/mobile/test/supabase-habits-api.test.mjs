import assert from 'node:assert/strict';
import test from 'node:test';
import { createHabit, fetchHabits } from '../src/supabase-habits-api.js';

const config = { url: 'https://project.supabase.co', publishableKey: 'public-key' };

test('creates a habit for the signed-in user through Supabase', async () => {
  const result = await createHabit({
    ...config, accessToken: 'user-token', userId: 'user_1', name: 'Прогулка',
    fetchImpl: async (url, options) => ({ ok: true, json: async () => [{ id: 'habit_1', name: 'Прогулка' }], url, options }),
  });
  assert.equal(result.id, 'habit_1');
});

test('projects Supabase habit rows into daily completion state', async () => {
  const habits = await fetchHabits({
    ...config, accessToken: 'user-token', today: '2026-08-02',
    fetchImpl: async () => ({ ok: true, json: async () => [{ id: 'habit_1', name: 'Прогулка', frequency: 'daily', habit_completions: [{ completed_on: '2026-08-02' }, { completed_on: '2026-08-01' }] }] }),
  });
  assert.deepEqual(habits, [{ id: 'habit_1', name: 'Прогулка', frequency: 'daily', completedToday: true, streak: 2 }]);
});
