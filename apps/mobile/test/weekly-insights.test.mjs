import assert from 'node:assert/strict';
import test from 'node:test';
import { createWeeklyInsights } from '../src/weekly-insights.js';

test('keeps only the seven-day window and uses the latest mood per day', () => {
  const result = createWeeklyInsights({
    referenceDate: '2026-09-01T12:00:00.000Z',
    records: [
      { id: 'outside', createdAt: '2026-08-25T12:00:00.000Z', mood: 1 },
      { id: 'first', createdAt: '2026-08-26T08:00:00.000Z', mood: 2 },
      { id: 'latest-same-day', createdAt: '2026-08-26T20:00:00.000Z', mood: 4 },
      { id: 'last', createdAt: '2026-09-01T09:00:00.000Z', mood: 5 },
    ],
    habits: [{ completedToday: true }, { completedToday: false }],
    goals: [{ status: 'active' }, { status: 'completed' }],
  });

  assert.equal(result.journalCount, 3);
  assert.equal(result.averageMood, 4);
  assert.equal(result.habitsCompleted, 1);
  assert.equal(result.habitsTotal, 2);
  assert.equal(result.activeGoals, 1);
  assert.equal(result.completedGoals, 1);
  assert.deepEqual(result.moodTimeline.map(({ dateKey, mood }) => ({ dateKey, mood })), [
    { dateKey: '2026-08-26', mood: 4 },
    { dateKey: '2026-08-27', mood: null },
    { dateKey: '2026-08-28', mood: null },
    { dateKey: '2026-08-29', mood: null },
    { dateKey: '2026-08-30', mood: null },
    { dateKey: '2026-08-31', mood: null },
    { dateKey: '2026-09-01', mood: 5 },
  ]);
  assert.equal(result.hasWeeklyActivity, true);
});

test('reports no weekly activity when the only record is old', () => {
  const result = createWeeklyInsights({
    referenceDate: '2026-09-01T12:00:00.000Z',
    records: [{ id: 'old', createdAt: '2026-08-25T12:00:00.000Z', mood: 5 }],
    habits: [],
    goals: [],
  });

  assert.equal(result.journalCount, 0);
  assert.equal(result.averageMood, null);
  assert.equal(result.hasWeeklyActivity, false);
  assert.equal(result.moodTimeline.length, 7);
  assert.ok(result.moodTimeline.every(({ mood }) => mood === null));
});

test('reports weekly activity for a record-only aggregate', () => {
  const result = createWeeklyInsights({
    referenceDate: '2026-09-01T12:00:00.000Z',
    records: [{ id: 'this-week', createdAt: '2026-09-01T09:00:00.000Z', mood: 5 }],
    habits: [],
    goals: [],
  });

  assert.equal(result.hasWeeklyActivity, true);
});
