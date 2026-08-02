import assert from 'node:assert/strict';
import test from 'node:test';
import { refreshSession, signInWithEmail, signUpWithEmail } from '../src/supabase-auth-api.js';

const config = { url: 'https://project.supabase.co', publishableKey: 'publishable-key' };

test('signs in with Supabase email/password and returns a session', async () => {
  const session = await signInWithEmail({
    ...config, email: 'me@example.com', password: 'correct horse battery staple',
    fetchImpl: async (url, options) => response({ access_token: 'token', refresh_token: 'refresh', user: { id: 'user_1' } }, { url, options }),
  });

  assert.equal(session.accessToken, 'token');
  assert.equal(session.user.id, 'user_1');
});

test('reports confirmation needed when sign-up does not return a session', async () => {
  const result = await signUpWithEmail({
    ...config, email: 'me@example.com', password: 'correct horse battery staple',
    fetchImpl: async () => response({ user: { id: 'user_1' }, session: null }),
  });

  assert.deepEqual(result, { session: null, needsEmailConfirmation: true });
});

test('refreshes an expired Supabase session', async () => {
  const session = await refreshSession({ ...config, refreshToken: 'refresh', fetchImpl: async () => response({ access_token: 'new-token', refresh_token: 'new-refresh', user: { id: 'user_1' } }) });
  assert.equal(session.accessToken, 'new-token');
});

function response(body, meta = {}) {
  return { ok: true, status: 200, json: async () => body, ...meta };
}
