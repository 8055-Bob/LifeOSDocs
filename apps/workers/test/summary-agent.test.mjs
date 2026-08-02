import assert from 'node:assert/strict';
import test from 'node:test';
import { SummaryAgent } from '../src/summary-agent.js';

test('turns a transcript into a versioned summary artifact', async () => {
  const agent = new SummaryAgent({
    summarize: async () => 'День был сложным, но пользователь справился.',
  });

  const artifact = await agent.run({
    recordId: 'record_1',
    text: 'Сегодня было тяжело. Но я закончил важную задачу и рад этому.',
  });

  assert.equal(artifact.agentName, 'summary');
  assert.deepEqual(artifact.result, { summary: 'День был сложным, но пользователь справился.' });
  assert.equal(artifact.confidence, 0.9);
});

test('rejects an empty source text before calling the summarizer', async () => {
  const agent = new SummaryAgent({ summarize: async () => 'Не должно быть вызвано.' });

  await assert.rejects(
    () => agent.run({ recordId: 'record_1', text: '  ' }),
    { message: 'text is required' },
  );
});
