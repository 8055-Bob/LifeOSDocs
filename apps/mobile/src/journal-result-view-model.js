function artifactResult(artifacts, agentName) {
  return artifacts.find((artifact) => artifact.agentName === agentName)?.result ?? {};
}

export function createJournalResultViewModel({ lifeRecord, artifacts }) {
  const summary = artifactResult(artifacts, 'summary');
  const emotion = artifactResult(artifacts, 'emotion');
  const topicEntity = artifactResult(artifacts, 'topic_entity');
  const reflectionAction = artifactResult(artifacts, 'reflection_action');

  return {
    recordId: lifeRecord.id,
    processingStatus: lifeRecord.status,
    originalText: lifeRecord.rawText ?? null,
    summary: summary.summary ?? null,
    emotions: emotion.emotions ?? [],
    topics: topicEntity.topics ?? [],
    entities: topicEntity.entities ?? [],
    reflectionQuestion: reflectionAction.question ?? null,
    nextAction: reflectionAction.nextAction ?? null,
    canEditOriginal: true,
  };
}
