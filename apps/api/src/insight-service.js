import { createInsightCandidate } from '@lifeos/contracts';

export class InsightService {
  #insights = new Map();

  add(input) {
    const insight = createInsightCandidate(input);
    this.#insights.set(insight.id, insight);
    return { ...insight };
  }

  suppress({ insightId, userId }) {
    const insight = this.#insights.get(insightId);

    if (!insight || insight.userId !== userId) {
      throw new Error('Insight not found');
    }

    insight.status = 'suppressed';
    return { ...insight };
  }

  listVisible(userId) {
    return [...this.#insights.values()]
      .filter((insight) => insight.userId === userId && insight.status === 'candidate')
      .map((insight) => ({ ...insight }));
  }
}
