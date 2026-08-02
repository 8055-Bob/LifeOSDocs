import assert from 'node:assert/strict';
import test from 'node:test';
import { createMoodCheckIn } from '../src/index.js';

test('creates a numeric mood check-in owned by the user', () => {
  const checkIn = createMoodCheckIn({ id: 'mood_1', userId: 'user_1', score: 4, note: 'Feeling focused' });

  assert.equal(checkIn.score, 4);
  assert.equal(checkIn.note, 'Feeling focused');
  assert.equal(checkIn.userId, 'user_1');
});

test('rejects mood outside the five-point scale', () => {
  assert.throws(
    () => createMoodCheckIn({ id: 'mood_1', userId: 'user_1', score: 6 }),
    { message: 'score must be an integer between 1 and 5' },
  );
});
