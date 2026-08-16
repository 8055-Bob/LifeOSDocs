const GROQ_TRANSCRIPTIONS_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export class GroqTranscriptionProvider {
  #apiKey;
  #fetch;

  constructor({ apiKey, fetchImpl = fetch }) {
    if (!apiKey?.trim()) throw new Error('GROQ_API_KEY is not configured');
    this.#apiKey = apiKey;
    this.#fetch = fetchImpl;
  }

  async transcribe({ audio, filename = 'thought.m4a' }) {
    const form = new FormData();
    form.append('file', audio, filename);
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'ru');
    form.append('response_format', 'json');

    const response = await this.#fetch(GROQ_TRANSCRIPTIONS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.#apiKey}` },
      body: form,
    });
    if (!response.ok) throw new Error(`Groq transcription request failed (status ${response.status})`);
    const payload = await response.json();
    if (typeof payload.text !== 'string' || !payload.text.trim()) throw new Error('Groq returned an empty transcription');
    return payload.text.trim();
  }
}
