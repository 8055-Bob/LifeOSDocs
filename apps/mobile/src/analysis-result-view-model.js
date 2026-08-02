export function createAnalysisResultViewModel(analysis) {
  return {
    title: 'Твоя запись',
    summary: analysis.summary,
    emotions: (analysis.emotions ?? []).map(({ label, score }) => ({ label, percentage: Math.round(score * 100) })),
    topics: analysis.topics ?? [],
    reflectionQuestion: analysis.reflectionQuestion,
    nextAction: analysis.nextAction,
  };
}
