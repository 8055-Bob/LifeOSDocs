import assert from 'node:assert/strict';
import test from 'node:test';
import { primaryTabs } from '../src/primary-navigation.js';

test('keeps the four agreed primary destinations', () => {
  assert.deepEqual(primaryTabs, [
    { id: 'home', label: 'Главная' },
    { id: 'diary', label: 'Дневник' },
    { id: 'goals', label: 'Цели' },
    { id: 'profile', label: 'Профиль' },
  ]);
});
