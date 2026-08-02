import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoal } from '../src/index.js';

test('creates an active goal with zero progress', () => {
  const goal = createGoal({
    id: 'goal_1',
    userId: 'user_1',
    title: 'Run a half marathon',
    targetDate: '2026-12-01',
  });

  assert.equal(goal.status, 'active');
  assert.equal(goal.progress, 0);
  assert.equal(goal.targetDate, '2026-12-01');
});
