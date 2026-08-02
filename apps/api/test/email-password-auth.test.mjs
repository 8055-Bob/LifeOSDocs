import assert from 'node:assert/strict';
import test from 'node:test';
import { EmailPasswordAuthenticator } from '../src/email-password-auth.js';

test('registers a user without retaining their plaintext password', async () => {
  const auth = new EmailPasswordAuthenticator();

  const user = await auth.register({ email: 'Person@Example.com', password: 'correct-horse-battery-staple' });

  assert.equal(user.email, 'person@example.com');
  assert.equal(Object.hasOwn(user, 'password'), false);
  assert.equal(Object.hasOwn(user, 'passwordHash'), false);
});

test('authenticates a registered user with the correct password', async () => {
  const auth = new EmailPasswordAuthenticator();
  await auth.register({ email: 'person@example.com', password: 'correct-horse-battery-staple' });

  const user = await auth.authenticate({ email: 'PERSON@example.com', password: 'correct-horse-battery-staple' });

  assert.equal(user.email, 'person@example.com');
});

test('rejects an incorrect password', async () => {
  const auth = new EmailPasswordAuthenticator();
  await auth.register({ email: 'person@example.com', password: 'correct-horse-battery-staple' });

  await assert.rejects(
    () => auth.authenticate({ email: 'person@example.com', password: 'wrong-password' }),
    { message: 'Invalid email or password' },
  );
});
