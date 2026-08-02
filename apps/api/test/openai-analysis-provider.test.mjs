import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenAIAnalysisProvider } from '../src/openai-analysis-provider.js';

test('requests a structured diary analysis without exposing the API key in the result', async () => {
  const calls = [];
  const provider = new OpenAIAnalysisProvider({
    apiKey: 'secret-key',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({
          summary: 'A difficult workday became easier after a walk.',
          emotions: [{ label: 'tension', score: 0.6 }],
          topics: ['work'],
          reflectionQuestion: 'What part of the day was in your control?',
          nextAction: 'Take a ten-minute walk tomorrow.',
        }) } }] }),
      };
    },
  });

  const analysis = await provider.analyze({ text: 'Work was stressful, but walking helped.' });

  assert.equal(calls[0].url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret-key');
  assert.equal(JSON.parse(calls[0].options.body).model, 'gpt-5.6-terra');
  assert.equal(analysis.summary, 'A difficult workday became easier after a walk.');
  assert.equal(JSON.stringify(analysis).includes('secret-key'), false);
});

test('returns a safe status-only error when OpenAI rejects the request', async () => {
  const provider = new OpenAIAnalysisProvider({
    apiKey: 'secret-key',
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });

  await assert.rejects(() => provider.analyze({ text: 'Private thought' }), { message: 'OpenAI analysis request failed (status 401)' });
});
