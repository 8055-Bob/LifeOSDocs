import assert from 'node:assert/strict';
import test from 'node:test';
import { createJournalHistoryViewModel, prependJournalRecord } from '../src/journal-history.js';

test('adds a new Life Record first and keeps the history bounded', () => {
  const current = Array.from({ length: 100 }, (_, index) => ({ id: `old_${index}`, createdAt: `2026-08-01T0${index % 9}:00:00.000Z` }));
  const history = prependJournalRecord(current, { id: 'new', createdAt: '2026-08-02T10:00:00.000Z' });

  assert.equal(history.length, 100);
  assert.equal(history[0].id, 'new');
  assert.equal(history.at(-1).id, 'old_98');
});

test('projects private local records into concise history cards', () => {
  const cards = createJournalHistoryViewModel([{
    id: 'record_1', createdAt: '2026-08-01T12:34:00.000Z', mood: 4,
    text: 'Очень длинная мысль, которую нужно сократить для компактной карточки истории.',
    analysis: { summary: 'Стало легче после разговора.' },
  }]);

  assert.deepEqual(cards, [{
    id: 'record_1', dateLabel: '01.08.2026', mood: 4,
    preview: 'Очень длинная мысль, которую нужно сократить для компактной карточки истории.',
    summary: 'Стало легче после разговора.',
  }]);
});
