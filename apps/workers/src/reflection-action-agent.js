export class ReflectionActionAgent {
  #reflect;

  constructor({ reflect }) {
    this.#reflect = reflect;
  }

  async run({ recordId, text }) {
    if (!text?.trim()) {
      throw new Error('text is required');
    }

    const reflection = await this.#reflect(text);

    return {
      recordId,
      agentName: 'reflection_action',
      schemaVersion: '1.0',
      modelVersion: 'provider-adapter',
      result: { question: reflection.question, nextAction: reflection.nextAction },
      confidence: reflection.confidence,
      createdAt: new Date().toISOString(),
    };
  }
}
