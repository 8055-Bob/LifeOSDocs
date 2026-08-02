import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoHomeState } from '../src/mobile-ui-state.js';

test('provides a Russian MVP home state for the first native launch', () => {
  const state = createDemoHomeState();

  assert.equal(state.greeting, 'Добрый день');
  assert.equal(state.habits.totalCount, 1);
  assert.equal(state.habits.items[0].name, '10 минут прогулки');
  assert.equal(state.recommendation, 'Поделись одной мыслью — я помогу её структурировать.');
});
