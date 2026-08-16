import assert from 'node:assert/strict';
import test from 'node:test';
import { transcribeAudio } from '../src/groq-transcription-api.js';

test('sends recorded audio to the LifeOS server without exposing a Groq key in the app', async () => {
  const transcript = await transcribeAudio({
    apiUrl: 'http://192.168.1.5:8787', accessToken: 'user-token', uri: 'data:audio/mp4;base64,YXVkaW8=',
    fetchImpl: async (url, options) => {
      if (url.startsWith('data:')) return new Response(new Blob(['audio'], { type: 'audio/mp4' }));
      assert.equal(url, 'http://192.168.1.5:8787/v1/transcribe');
      assert.equal(options.headers.Authorization, 'Bearer user-token');
      return new Response(JSON.stringify({ text: 'Привет, LifeOS' }), { status: 200 });
    },
  });
  assert.equal(transcript, 'Привет, LifeOS');
});
