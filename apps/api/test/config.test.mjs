import assert from 'node:assert/strict';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/config.js';

test('rejects API startup when the session secret is missing', () => {
  assert.throws(
    () => loadRuntimeConfig({ NODE_ENV: 'test' }),
    { message: 'LIFEOS_SESSION_SECRET is required' },
  );
});

test('returns a minimal validated API configuration', () => {
  assert.deepEqual(
    loadRuntimeConfig({ NODE_ENV: 'test', LIFEOS_SESSION_SECRET: 'local-test-secret' }),
    { environment: 'test', sessionSecret: 'local-test-secret' },
  );
});
