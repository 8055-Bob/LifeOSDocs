export class RecordProcessingCoordinator {
  #summaryAgent;
  #emotionAgent;
  #topicEntityAgent;
  #reflectionActionAgent;
  #memoryAgent;

  constructor({ summaryAgent, emotionAgent, topicEntityAgent, reflectionActionAgent, memoryAgent, artifactStore = null, queue = null }) {
    this.#summaryAgent = summaryAgent;
    this.#emotionAgent = emotionAgent;
    this.#topicEntityAgent = topicEntityAgent;
    this.#reflectionActionAgent = reflectionActionAgent;
    this.#memoryAgent = memoryAgent;
    this.artifactStore = artifactStore;
    this.queue = queue;
  }

  async processTextRecord({ recordId, text }) {
    if (this.queue) this.queue.claim({ recordId });
    const context = { recordId, text };
    const [summary, emotion, topicEntity, reflectionAction, memoryProposal] = await Promise.all([
      this.#summaryAgent.run(context),
      this.#emotionAgent.run(context),
      this.#topicEntityAgent.run(context),
      this.#reflectionActionAgent.run(context),
      this.#memoryAgent.run(context),
    ]);

    const artifacts = [summary, emotion, topicEntity, reflectionAction];
    if (this.artifactStore) {
      artifacts.forEach((artifact) => this.artifactStore.save(artifact));
    }
    const processingStatus = this.queue ? this.queue.complete({ recordId }).status : null;

    return {
      artifacts,
      memoryProposal,
      processingStatus,
    };
  }
}
