import assert from 'node:assert/strict';
import test from 'node:test';
import { updateUserConsents } from '../src/index.js';

test('updates only requested privacy consent flags', () => {
  const profile = {
    id: 'user_1',
    email: 'person@example.com',
    consents: {
      audioStorage: false,
      productImprovement: false,
      proactiveNotifications: false,
    },
  };

  const updated = updateUserConsents(profile, { audioStorage: true });

  assert.deepEqual(updated.consents, {
    audioStorage: true,
    productImprovement: false,
    proactiveNotifications: false,
  });
  assert.equal(profile.consents.audioStorage, false);
});

test('rejects unknown consent flags', () => {
  assert.throws(
    () => updateUserConsents({ consents: {} }, { shareWithAdvertisers: true }),
    { message: 'Unknown consent: shareWithAdvertisers' },
  );
});
