export class TopicEntityAgent {
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
      agentName: 'topic_entity',
      schemaVersion: '1.0',
      modelVersion: 'provider-adapter',
      result: { topics: analysis.topics, entities: analysis.entities },
      confidence: analysis.confidence,
      createdAt: new Date().toISOString(),
    };
  }
}
