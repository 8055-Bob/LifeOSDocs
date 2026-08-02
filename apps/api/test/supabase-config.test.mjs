import assert from 'node:assert/strict';
import test from 'node:test';
import { getSupabaseServerConfig } from '../src/supabase-config.js';

test('accepts server-only Supabase connection settings', () => {
  const config = getSupabaseServerConfig({
    SUPABASE_URL: 'https://lifeos.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_example',
  });

  assert.deepEqual(config, {
    url: 'https://lifeos.supabase.co',
    secretKey: 'sb_secret_example',
  });
});

test('refuses to start persistence without a server secret', () => {
  assert.throws(
    () => getSupabaseServerConfig({ SUPABASE_URL: 'https://lifeos.supabase.co' }),
    { message: 'SUPABASE_SECRET_KEY is required' },
  );
});
