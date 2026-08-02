import assert from 'node:assert/strict';
import test from 'node:test';
import { MoodCheckInService } from '../src/mood-check-in-service.js';

test('returns the latest mood check-in for a user', () => {
  const service = new MoodCheckInService();
  service.add({ id: 'mood_1', userId: 'user_1', score: 2 });
  const latest = service.add({ id: 'mood_2', userId: 'user_1', score: 4 });

  assert.deepEqual(service.latestForUser('user_1'), latest);
  assert.equal(service.latestForUser('user_2'), null);
});
