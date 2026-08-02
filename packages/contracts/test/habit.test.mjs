import assert from 'node:assert/strict';
import test from 'node:test';
import { createHabit } from '../src/index.js';

test('creates a daily habit with an incomplete state', () => {
  const habit = createHabit({ id: 'habit_1', userId: 'user_1', name: 'Прогулка 20 минут' });

  assert.equal(habit.frequency, 'daily');
  assert.equal(habit.completedToday, false);
  assert.equal(habit.streak, 0);
});
