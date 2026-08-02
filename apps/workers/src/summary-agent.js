export class SummaryAgent {
  #summarize;

  constructor({ summarize }) {
    this.#summarize = summarize;
  }

  async run({ recordId, text }) {
    if (!text?.trim()) {
      throw new Error('text is required');
    }

    const summary = await this.#summarize(text);

    return {
      recordId,
      agentName: 'summary',
      schemaVersion: '1.0',
      modelVersion: 'provider-adapter',
      result: { summary },
      confidence: 0.9,
      createdAt: new Date().toISOString(),
    };
  }
}
