import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalysisResultViewModel } from '../src/analysis-result-view-model.js';

test('projects a diary analysis into sections for the result screen', () => {
  const result = createAnalysisResultViewModel({
    summary: 'После разговора стало легче.',
    emotions: [{ label: 'тревога', score: 0.7 }, { label: 'облегчение', score: 0.4 }],
    topics: ['работа', 'друзья'],
    reflectionQuestion: 'Что помогло тебе почувствовать поддержку?',
    nextAction: 'Напиши другу одно короткое сообщение.',
  });

  assert.equal(result.title, 'Твоя запись');
  assert.equal(result.summary, 'После разговора стало легче.');
  assert.deepEqual(result.emotions, [{ label: 'тревога', percentage: 70 }, { label: 'облегчение', percentage: 40 }]);
  assert.deepEqual(result.topics, ['работа', 'друзья']);
  assert.equal(result.reflectionQuestion, 'Что помогло тебе почувствовать поддержку?');
  assert.equal(result.nextAction, 'Напиши другу одно короткое сообщение.');
});

test('uses clear placeholders for missing legacy reflection fields', () => {
  const result = createAnalysisResultViewModel({
    summary: 'Запись сохранена.',
    emotions: [],
    topics: [],
    reflectionQuestion: '',
    nextAction: '',
  });

  assert.equal(result.reflectionQuestion, 'Вопрос пока не сформирован — попробуй создать новую запись.');
  assert.equal(result.nextAction, 'Небольшой шаг пока не сформирован — попробуй создать новую запись.');
});
