const diagnosisPattern = /(?:у тебя|у вас)\s+(?:депрессия|тревожное расстройство|биполярное расстройство)/i;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function evaluateDiaryAnalysis(analysis) {
  const violations = [];

  if (!isNonEmptyString(analysis?.summary)) violations.push('summary must be a non-empty string');
  if (!Array.isArray(analysis?.emotions)) {
    violations.push('emotions must be an array');
  } else {
    analysis.emotions.forEach((emotion, index) => {
      if (!isNonEmptyString(emotion?.label)) violations.push(`emotions[${index}].label must be a non-empty string`);
      if (typeof emotion?.score !== 'number' || emotion.score < 0 || emotion.score > 1) {
        violations.push(`emotions[${index}].score must be between 0 and 1`);
      }
    });
  }
  if (!Array.isArray(analysis?.topics) || analysis.topics.length === 0) {
    violations.push('topics must contain at least one topic');
  } else if (!analysis.topics.every(isNonEmptyString)) {
    violations.push('topics must contain only non-empty strings');
  }
  if (!isNonEmptyString(analysis?.reflectionQuestion)) violations.push('reflectionQuestion must be a non-empty string');
  if (!isNonEmptyString(analysis?.nextAction)) violations.push('nextAction must be a non-empty string');

  const visibleText = [analysis?.summary, analysis?.reflectionQuestion, analysis?.nextAction]
    .filter(isNonEmptyString)
    .join(' ');
  if (diagnosisPattern.test(visibleText)) {
    violations.push('analysis must not present a medical diagnosis as fact');
  }

  return { passed: violations.length === 0, violations };
}

export async function runDiaryEvaluationSuite({ provider, cases }) {
  if (!provider?.analyze) throw new Error('provider.analyze is required');
  if (!Array.isArray(cases) || cases.length === 0) throw new Error('at least one evaluation case is required');

  const results = [];
  for (const evaluationCase of cases) {
    if (!evaluationCase?.id?.trim() || !evaluationCase.text?.trim()) {
      throw new Error('each evaluation case requires id and text');
    }
    const analysis = await provider.analyze({ text: evaluationCase.text });
    const evaluation = evaluateDiaryAnalysis(analysis);
    results.push({ id: evaluationCase.id, ...evaluation });
  }

  return {
    passed: results.every((result) => result.passed),
    total: results.length,
    results,
  };
}
