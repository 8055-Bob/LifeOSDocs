import { createHabit } from '@lifeos/contracts';

export class HabitService {
  #habits = new Map();

  add(input) {
    const habit = createHabit(input);
    this.#habits.set(habit.id, habit);
    return habit;
  }

  complete({ habitId, userId }) {
    const habit = this.#habits.get(habitId);

    if (!habit || habit.userId !== userId) {
      throw new Error('Habit not found');
    }

    if (habit.completedToday) {
      throw new Error('Habit is already completed today');
    }

    habit.completedToday = true;
    habit.streak += 1;
    return { ...habit };
  }
}
