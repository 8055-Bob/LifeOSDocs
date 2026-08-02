export class ProactiveNotificationService {
  #selectedByUserAndDate = new Map();

  selectCandidate({ profile, candidates, now }) {
    if (!profile?.consents?.proactiveNotifications) {
      return null;
    }

    const dateKey = now.toISOString().slice(0, 10);
    const selectionKey = `${profile.id}:${dateKey}`;

    if (this.#selectedByUserAndDate.has(selectionKey)) {
      return null;
    }

    const candidate = candidates.find(
      (item) => item.userId === profile.id && item.qualifies === true,
    );

    if (!candidate) {
      return null;
    }

    this.#selectedByUserAndDate.set(selectionKey, candidate.id);
    return { ...candidate };
  }
}
