import assert from 'node:assert/strict';
import test from 'node:test';
import { ProactiveNotificationService } from '../src/proactive-notification-service.js';
import { createUserProfile, updateUserConsents } from '@lifeos/contracts';

function enabledProfile() {
  return updateUserConsents(
    createUserProfile({ id: 'user_1', email: 'user@example.com' }),
    { proactiveNotifications: true },
  );
}

function qualifyingCandidate(id = 'candidate_1') {
  return {
    id,
    userId: 'user_1',
    message: 'You have kept your walk habit for three days.',
    qualifies: true,
  };
}

test('does not select a proactive notification when the user has not enabled it', () => {
  const service = new ProactiveNotificationService();
  const profile = createUserProfile({ id: 'user_1', email: 'user@example.com' });

  const selected = service.selectCandidate({
    profile,
    candidates: [qualifyingCandidate()],
    now: new Date('2026-08-01T09:00:00.000Z'),
  });

  assert.equal(selected, null);
});

test('selects one qualifying proactive notification when enabled and below the daily cap', () => {
  const service = new ProactiveNotificationService();

  const selected = service.selectCandidate({
    profile: enabledProfile(),
    candidates: [qualifyingCandidate()],
    now: new Date('2026-08-01T09:00:00.000Z'),
  });

  assert.deepEqual(selected, qualifyingCandidate());
});

test('limits a user to one selected proactive notification per calendar day', () => {
  const service = new ProactiveNotificationService();
  const profile = enabledProfile();

  service.selectCandidate({
    profile,
    candidates: [qualifyingCandidate('candidate_1')],
    now: new Date('2026-08-01T09:00:00.000Z'),
  });

  const secondSelection = service.selectCandidate({
    profile,
    candidates: [qualifyingCandidate('candidate_2')],
    now: new Date('2026-08-01T18:00:00.000Z'),
  });

  assert.equal(secondSelection, null);
});
