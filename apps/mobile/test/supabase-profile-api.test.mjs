import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchProfile, saveProfile } from '../src/supabase-profile-api.js';

const config = {
  url: 'https://lifeos.supabase.co',
  publishableKey: 'public-key',
  accessToken: 'session-token',
  userId: 'user-1',
};

test('loads the signed-in user profile', async () => {
  const profile = await fetchProfile({
    ...config,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://lifeos.supabase.co/rest/v1/profiles?id=eq.user-1&select=display_name,current_focus,timezone,communication_style');
      assert.equal(options.headers.Authorization, 'Bearer session-token');
      return new Response(JSON.stringify([{ display_name: 'Алексей', current_focus: 'Больше отдыхать', timezone: 'Asia/Bangkok', communication_style: 'supportive' }]), { status: 200 });
    },
  });

  assert.deepEqual(profile, { displayName: 'Алексей', currentFocus: 'Больше отдыхать', timezone: 'Asia/Bangkok', communicationStyle: 'supportive' });
});

test('saves editable profile information for the signed-in user', async () => {
  let request;
  await saveProfile({
    ...config,
    profile: { displayName: 'Алексей', currentFocus: 'Больше отдыхать', timezone: 'Asia/Bangkok', communicationStyle: 'supportive' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify([]), { status: 201 });
    },
  });

  assert.equal(request.url, 'https://lifeos.supabase.co/rest/v1/profiles?on_conflict=id');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), {
    id: 'user-1', display_name: 'Алексей', current_focus: 'Больше отдыхать', timezone: 'Asia/Bangkok', communication_style: 'supportive',
  });
});
