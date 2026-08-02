const schema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    emotions: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, score: { type: 'number' } }, required: ['label', 'score'] } },
    topics: { type: 'array', items: { type: 'string' } },
    reflectionQuestion: { type: 'string' },
    nextAction: { type: 'string' },
  },
  required: ['summary', 'emotions', 'topics', 'reflectionQuestion', 'nextAction'],
};

export class GeminiAnalysisProvider {
  constructor({ apiKey, fetchImpl = fetch }) {
    if (!apiKey?.trim()) throw new Error('GEMINI_API_KEY is required');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.modelName = 'gemini-2.5-flash';
  }

  async analyze({ text }) {
    if (!text?.trim()) throw new Error('text is required');
    let response = await this.requestAnalysis(this.modelName, text);
    if (response.status === 404) {
      this.modelName = await this.findCompatibleFlashModel();
      response = await this.requestAnalysis(this.modelName, text);
    }
    if (!response.ok) throw new Error(`Gemini analysis request failed (status ${response.status})`);
    const payload = await response.json();
    return JSON.parse(payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');
  }

  async requestAnalysis(modelName, text) {
    return this.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Ты — поддерживающий помощник LifeOS. Ответь на русском. Не ставь диагнозов и не выдавай предположения за факт. Проанализируй запись:\n\n${text}` }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
      }),
    });
  }

  async findCompatibleFlashModel() {
    const response = await this.fetchImpl('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': this.apiKey },
    });
    if (!response.ok) throw new Error(`Gemini model discovery failed (status ${response.status})`);
    const { models = [] } = await response.json();
    const model = models.find(({ name, supportedGenerationMethods = [] }) => (
      name !== 'models/gemini-2.5-flash'
      && /gemini.*flash/i.test(name)
      && supportedGenerationMethods.includes('generateContent')
    ));
    if (!model) throw new Error('No compatible Gemini Flash model is available for this API key');
    return model.name.replace('models/', '');
  }
}
