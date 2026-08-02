import { createGoal } from '@lifeos/contracts';

export class GoalService {
  #goals = new Map();

  add(input) {
    const goal = createGoal(input);
    this.#goals.set(goal.id, goal);
    return { ...goal };
  }

  updateProgress({ goalId, userId, progress }) {
    const goal = this.#goals.get(goalId);

    if (!goal || goal.userId !== userId) {
      throw new Error('Goal not found');
    }

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      throw new Error('progress must be between 0 and 100');
    }

    goal.progress = progress;
    goal.updatedAt = new Date().toISOString();
    return { ...goal };
  }
}
