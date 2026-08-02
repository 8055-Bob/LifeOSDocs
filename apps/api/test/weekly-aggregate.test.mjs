import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateWeeklyMoodAggregate } from '../src/weekly-aggregate.js';

test('calculates a transparent weekly mood aggregate after the minimum sample size', () => {
  const aggregate = calculateWeeklyMoodAggregate({
    userId: 'user_1',
    weekStart: '2026-08-03',
    checkIns: [
      { userId: 'user_1', score: 3 },
      { userId: 'user_1', score: 4 },
      { userId: 'user_1', score: 5 },
      { userId: 'user_2', score: 1 },
    ],
  });

  assert.deepEqual(aggregate, {
    userId: 'user_1',
    weekStart: '2026-08-03',
    sampleSize: 3,
    averageMoodScore: 4,
    status: 'ready',
  });
});

test('marks a weekly aggregate insufficient below the minimum sample size', () => {
  const aggregate = calculateWeeklyMoodAggregate({
    userId: 'user_1',
    weekStart: '2026-08-03',
    checkIns: [{ userId: 'user_1', score: 4 }],
  });

  assert.equal(aggregate.status, 'insufficient_data');
  assert.equal(aggregate.averageMoodScore, null);
});
