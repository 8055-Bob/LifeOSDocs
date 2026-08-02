const requiredFields = ['summary', 'emotions', 'topics', 'reflectionQuestion', 'nextAction'];

export class OpenRouterAnalysisProvider {
  constructor({ apiKey, fetchImpl = fetch }) {
    if (!apiKey?.trim()) throw new Error('OPENROUTER_API_KEY is required');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async analyze({ text }) {
    if (!text?.trim()) throw new Error('text is required');
    const response = await this.fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openrouter/free',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Ты — поддерживающий помощник LifeOS. Отвечай только на русском. Не ставь диагнозы и не выдавай предположения за факты. Верни только корректный JSON без Markdown: {"summary": string, "emotions": [{"label": string, "score": number}], "topics": [string], "reflectionQuestion": string, "nextAction": string}.',
          },
          { role: 'user', content: text },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenRouter analysis request failed (status ${response.status})`);
    const payload = await response.json();
    const analysis = JSON.parse(payload.choices?.[0]?.message?.content ?? '{}');
    if (!requiredFields.every((field) => field in analysis)) throw new Error('OpenRouter returned an incomplete analysis');
    return analysis;
  }
}
