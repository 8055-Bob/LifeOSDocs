export class SpeechAgent {
  #transcribe;

  constructor({ transcribe }) {
    this.#transcribe = transcribe;
  }

  async run({ recordId, mediaAssetId }) {
    const transcription = await this.#transcribe({ mediaAssetId });

    return {
      recordId,
      agentName: 'speech',
      schemaVersion: '1.0',
      modelVersion: 'provider-adapter',
      result: { transcript: transcription.text },
      confidence: transcription.confidence,
      createdAt: new Date().toISOString(),
    };
  }
}
