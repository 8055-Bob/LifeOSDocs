import assert from 'node:assert/strict';
import test from 'node:test';
import { createUserProfile } from '../src/index.js';

test('creates a user profile with privacy consents disabled by default', () => {
  const profile = createUserProfile({
    id: 'user_1',
    email: 'Person@Example.com',
  });

  assert.equal(profile.id, 'user_1');
  assert.equal(profile.email, 'person@example.com');
  assert.deepEqual(profile.consents, {
    audioStorage: false,
    productImprovement: false,
    proactiveNotifications: false,
  });
});
