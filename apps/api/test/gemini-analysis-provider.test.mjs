import assert from 'node:assert/strict';
import test from 'node:test';
import { GeminiAnalysisProvider } from '../src/gemini-analysis-provider.js';

test('requests structured analysis from Gemini without including the key in output', async () => {
  const provider = new GeminiAnalysisProvider({
    apiKey: 'gemini-secret',
    fetchImpl: async (url, options) => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: 'Кратко.', emotions: [], topics: [], reflectionQuestion: 'Вопрос?', nextAction: 'Шаг.' }) }] } }] }),
      request: { url, options },
    }),
  });

  const analysis = await provider.analyze({ text: 'Сложный день.' });

  assert.equal(analysis.summary, 'Кратко.');
  assert.equal(JSON.stringify(analysis).includes('gemini-secret'), false);
});

test('discovers a compatible Flash model before requesting analysis', async () => {
  const requests = [];
  const provider = new GeminiAnalysisProvider({
    apiKey: 'gemini-secret',
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url.includes('/models/gemini-2.5-flash:generateContent')) {
        return { ok: false, status: 404 };
      }
      if (url.endsWith('/v1beta/models')) {
        return {
          ok: true,
          json: async () => ({
            models: [
              { name: 'models/gemini-vision', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
            ],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: 'Кратко.', emotions: [], topics: [], reflectionQuestion: 'Вопрос?', nextAction: 'Шаг.' }) }] } }] }),
      };
    },
  });

  await provider.analyze({ text: 'Сложный день.' });

  assert.equal(requests.length, 3);
  assert.equal(requests[1].url.endsWith('/v1beta/models'), true);
  assert.equal(requests[2].url.includes('/models/gemini-2.0-flash:generateContent'), true);
});
