const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'emotions', 'topics', 'reflectionQuestion', 'nextAction'],
  properties: {
    summary: { type: 'string' },
    emotions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'score'],
        properties: { label: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 1 } },
      },
    },
    topics: { type: 'array', items: { type: 'string' } },
    reflectionQuestion: { type: 'string' },
    nextAction: { type: 'string' },
  },
};

export class OpenAIAnalysisProvider {
  constructor({ apiKey, fetchImpl = fetch }) {
    if (!apiKey?.trim()) throw new Error('OPENAI_API_KEY is required');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async analyze({ text }) {
    if (!text?.trim()) throw new Error('text is required');

    const response = await this.fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.6-terra',
        reasoning_effort: 'low',
        response_format: { type: 'json_schema', json_schema: { name: 'lifeos_diary_analysis', strict: true, schema: analysisSchema } },
        messages: [
          { role: 'system', content: 'You are LifeOS, a supportive reflection assistant. Do not diagnose or claim certainty. Reply in Russian. Produce a concise, empathetic analysis from the user diary entry.' },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI analysis request failed (status ${response.status})`);
    const payload = await response.json();
    return JSON.parse(payload.choices?.[0]?.message?.content ?? '{}');
  }
}
