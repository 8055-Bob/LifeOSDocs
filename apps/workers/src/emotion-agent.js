export class EmotionAgent {
  #analyze;

  constructor({ analyze }) {
    this.#analyze = analyze;
  }

  async run({ recordId, text }) {
    if (!text?.trim()) {
      throw new Error('text is required');
    }

    const analysis = await this.#analyze(text);

    return {
      recordId,
      agentName: 'emotion',
      schemaVersion: '1.0',
      modelVersion: 'provider-adapter',
      result: { emotions: analysis.emotions },
      confidence: analysis.confidence,
      createdAt: new Date().toISOString(),
    };
  }
}
