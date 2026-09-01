function nonEmptyText(value, fallback) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function createAnalysisResultViewModel(analysis) {
  return {
    title: 'Твоя запись',
    summary: analysis.summary,
    emotions: (analysis.emotions ?? []).map(({ label, score }) => ({ label, percentage: Math.round(score * 100) })),
    topics: analysis.topics ?? [],
    reflectionQuestion: nonEmptyText(analysis.reflectionQuestion, 'Вопрос пока не сформирован — попробуй создать новую запись.'),
    nextAction: nonEmptyText(analysis.nextAction, 'Небольшой шаг пока не сформирован — попробуй создать новую запись.'),
  };
}
