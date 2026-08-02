export class AgentArtifactStore {
  #artifactsByRecordId = new Map();

  save({ recordId, agentName, schemaVersion, modelVersion, result, confidence }) {
    if (!recordId?.trim() || !agentName?.trim() || !schemaVersion?.trim() || !modelVersion?.trim() || !result || typeof result !== 'object') {
      throw new Error('artifact provenance and result are required');
    }

    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      throw new Error('confidence must be a number between 0 and 1');
    }

    if (!isValidResult(agentName, result)) {
      throw new Error(`${agentName} artifact result is invalid`);
    }

    const artifact = {
      recordId,
      agentName,
      schemaVersion,
      modelVersion,
      result,
      confidence,
      createdAt: new Date().toISOString(),
    };

    const artifacts = this.#artifactsByRecordId.get(recordId) ?? [];
    artifacts.push(artifact);
    this.#artifactsByRecordId.set(recordId, artifacts);
    return artifact;
  }

  listForRecord(recordId) {
    return [...(this.#artifactsByRecordId.get(recordId) ?? [])];
  }
}

function isValidResult(agentName, result) {
  if (agentName === 'summary') return typeof result.summary === 'string' && result.summary.trim().length > 0;
  if (agentName === 'speech') return typeof result.transcript === 'string' && result.transcript.trim().length > 0;
  if (agentName === 'emotion') {
    return Array.isArray(result.emotions) && result.emotions.every(({ label, score }) => (
      typeof label === 'string' && label.trim().length > 0 && typeof score === 'number' && score >= 0 && score <= 1
    ));
  }
  if (agentName === 'topic_entity') return Array.isArray(result.topics) && Array.isArray(result.entities);
  if (agentName === 'reflection_action') {
    return typeof result.question === 'string' && result.question.trim().length > 0
      && typeof result.nextAction === 'string' && result.nextAction.trim().length > 0;
  }
  return true;
}
