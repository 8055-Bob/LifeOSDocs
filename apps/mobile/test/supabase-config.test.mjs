import assert from 'node:assert/strict';
import test from 'node:test';
import { getSupabasePublicConfig } from '../src/supabase-config.js';

test('accepts a public Supabase URL and publishable key for the mobile app', () => {
  const config = getSupabasePublicConfig({
    EXPO_PUBLIC_SUPABASE_URL: 'https://lifeos.supabase.co',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  });

  assert.deepEqual(config, {
    url: 'https://lifeos.supabase.co',
    publishableKey: 'sb_publishable_example',
  });
});
