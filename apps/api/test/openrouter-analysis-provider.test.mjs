import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenRouterAnalysisProvider } from '../src/openrouter-analysis-provider.js';

test('requests a JSON diary analysis through the OpenRouter free router', async () => {
  const calls = [];
  const provider = new OpenRouterAnalysisProvider({
    apiKey: 'openrouter-secret',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({
          summary: 'День был непростым.', emotions: [], topics: ['работа'],
          reflectionQuestion: 'Что помогло тебе?', nextAction: 'Сделай короткую паузу.',
        }) } }] }),
      };
    },
  });

  const analysis = await provider.analyze({ text: 'На работе было сложно.' });

  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer openrouter-secret');
  assert.equal(JSON.parse(calls[0].options.body).model, 'openrouter/free');
  assert.deepEqual(JSON.parse(calls[0].options.body).response_format, { type: 'json_object' });
  assert.equal(analysis.summary, 'День был непростым.');
  assert.equal(JSON.stringify(analysis).includes('openrouter-secret'), false);
});

test('returns a safe status-only error when OpenRouter rejects a request', async () => {
  const provider = new OpenRouterAnalysisProvider({
    apiKey: 'openrouter-secret',
    fetchImpl: async () => ({ ok: false, status: 429 }),
  });

  await assert.rejects(() => provider.analyze({ text: 'Личная запись' }), { message: 'OpenRouter analysis request failed (status 429)' });
});
