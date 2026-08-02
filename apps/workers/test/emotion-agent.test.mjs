import assert from 'node:assert/strict';
import test from 'node:test';
import { EmotionAgent } from '../src/emotion-agent.js';

test('normalizes emotion analysis into an artifact', async () => {
  const agent = new EmotionAgent({
    analyze: async () => ({ emotions: [{ name: 'тревога', intensity: 0.7 }], confidence: 0.82 }),
  });

  const artifact = await agent.run({ recordId: 'record_1', text: 'Я тревожусь из-за денег.' });

  assert.equal(artifact.agentName, 'emotion');
  assert.deepEqual(artifact.result, { emotions: [{ name: 'тревога', intensity: 0.7 }] });
  assert.equal(artifact.confidence, 0.82);
});
