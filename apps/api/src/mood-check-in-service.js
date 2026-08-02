import { createMoodCheckIn } from '@lifeos/contracts';

export class MoodCheckInService {
  #checkInsByUser = new Map();

  add(input) {
    const checkIn = createMoodCheckIn(input);
    const existing = this.#checkInsByUser.get(checkIn.userId) ?? [];
    existing.push(checkIn);
    this.#checkInsByUser.set(checkIn.userId, existing);
    return { ...checkIn };
  }

  latestForUser(userId) {
    const checkIns = this.#checkInsByUser.get(userId);
    const latest = checkIns?.at(-1);
    return latest ? { ...latest } : null;
  }
}
