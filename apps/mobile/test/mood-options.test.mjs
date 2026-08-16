import test from 'node:test';
import assert from 'node:assert/strict';
import { moodOptions } from '../src/mood-options.js';

test('provides five ordered moods with a fitting emoji for the check-in', () => {
  assert.deepEqual(moodOptions, [
    { value: 1, label: 'Тяжело', emoji: '😔' },
    { value: 2, label: 'Тревожно', emoji: '😟' },
    { value: 3, label: 'Нейтрально', emoji: '😐' },
    { value: 4, label: 'Хорошо', emoji: '🙂' },
    { value: 5, label: 'Отлично', emoji: '😄' },
  ]);
});
