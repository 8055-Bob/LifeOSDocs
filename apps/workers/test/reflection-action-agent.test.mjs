import assert from 'node:assert/strict';
import test from 'node:test';
import { ReflectionActionAgent } from '../src/reflection-action-agent.js';

test('returns one reflection question and one small next action', async () => {
  const agent = new ReflectionActionAgent({
    reflect: async () => ({
      question: 'Что в этой ситуации ты можешь контролировать?',
      nextAction: 'Запиши один следующий шаг на завтра.',
      confidence: 0.76,
    }),
  });

  const artifact = await agent.run({ recordId: 'record_1', text: 'Я тревожусь из-за предстоящего разговора.' });

  assert.equal(artifact.agentName, 'reflection_action');
  assert.deepEqual(artifact.result, {
    question: 'Что в этой ситуации ты можешь контролировать?',
    nextAction: 'Запиши один следующий шаг на завтра.',
  });
});
