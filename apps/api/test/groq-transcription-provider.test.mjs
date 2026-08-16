import assert from 'node:assert/strict';
import test from 'node:test';
import { GroqTranscriptionProvider } from '../src/groq-transcription-provider.js';

test('sends Russian audio to Groq Whisper and returns its text', async () => {
  let request;
  const provider = new GroqTranscriptionProvider({
    apiKey: 'groq-secret',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ text: 'Сегодня было спокойно.' }), { status: 200 });
    },
  });

  const transcript = await provider.transcribe({ audio: new Blob(['voice'], { type: 'audio/mp4' }), filename: 'thought.m4a' });

  assert.equal(transcript, 'Сегодня было спокойно.');
  assert.equal(request.url, 'https://api.groq.com/openai/v1/audio/transcriptions');
  assert.equal(request.options.headers.Authorization, 'Bearer groq-secret');
  assert.equal(request.options.body.get('model'), 'whisper-large-v3-turbo');
  assert.equal(request.options.body.get('language'), 'ru');
  assert.equal(request.options.body.get('file').name, 'thought.m4a');
});
