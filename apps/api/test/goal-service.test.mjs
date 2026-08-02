import assert from 'node:assert/strict';
import test from 'node:test';
import { GoalService } from '../src/goal-service.js';

test('updates progress only for the goal owner', () => {
  const service = new GoalService();
  service.add({ id: 'goal_1', userId: 'user_1', title: 'Run a half marathon' });

  const updated = service.updateProgress({ goalId: 'goal_1', userId: 'user_1', progress: 40 });

  assert.equal(updated.progress, 40);
  assert.equal(updated.status, 'active');
  assert.throws(
    () => service.updateProgress({ goalId: 'goal_1', userId: 'user_2', progress: 60 }),
    { message: 'Goal not found' },
  );
});
