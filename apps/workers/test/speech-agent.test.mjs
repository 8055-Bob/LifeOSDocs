import assert from 'node:assert/strict';
import test from 'node:test';
import { SpeechAgent } from '../src/speech-agent.js';

test('normalizes a transcriber result into a transcript artifact', async () => {
  const agent = new SpeechAgent({
    transcribe: async () => ({ text: 'Сегодня было тяжело, но я справился.', confidence: 0.87 }),
  });

  const artifact = await agent.run({ recordId: 'record_1', mediaAssetId: 'media_1' });

  assert.equal(artifact.agentName, 'speech');
  assert.deepEqual(artifact.result, { transcript: 'Сегодня было тяжело, но я справился.' });
  assert.equal(artifact.confidence, 0.87);
});
