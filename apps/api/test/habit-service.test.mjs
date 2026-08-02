import assert from 'node:assert/strict';
import test from 'node:test';
import { HabitService } from '../src/habit-service.js';

test('completes a habit once and increases its streak', () => {
  const service = new HabitService();
  service.add({ id: 'habit_1', userId: 'user_1', name: 'Прогулка' });

  const completed = service.complete({ habitId: 'habit_1', userId: 'user_1' });

  assert.equal(completed.completedToday, true);
  assert.equal(completed.streak, 1);
  assert.throws(() => service.complete({ habitId: 'habit_1', userId: 'user_1' }), { message: 'Habit is already completed today' });
});
