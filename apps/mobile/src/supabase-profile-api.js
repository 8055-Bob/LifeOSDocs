function headers({ publishableKey, accessToken, prefer = null }) {
  const value = { apikey: publishableKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  if (prefer) value.Prefer = prefer;
  return value;
}

function assertOk(response, action) {
  if (!response.ok) throw new Error(`Не удалось ${action}`);
}

function mapProfile(profile = {}) {
  return {
    displayName: profile.display_name ?? '',
    currentFocus: profile.current_focus ?? '',
    timezone: profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    communicationStyle: profile.communication_style ?? 'supportive',
  };
}

export async function fetchProfile({ url, publishableKey, accessToken, userId, fetchImpl = fetch }) {
  const select = 'display_name,current_focus,timezone,communication_style';
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=${select}`, {
    headers: headers({ publishableKey, accessToken }),
  });
  assertOk(response, 'загрузить профиль');
  const [profile] = await response.json();
  return mapProfile(profile);
}

export async function saveProfile({ url, publishableKey, accessToken, userId, profile, fetchImpl = fetch }) {
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: headers({ publishableKey, accessToken, prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify({
      id: userId,
      display_name: profile.displayName.trim() || null,
      current_focus: profile.currentFocus.trim() || null,
      timezone: profile.timezone.trim() || null,
      communication_style: profile.communicationStyle,
    }),
  });
  assertOk(response, 'сохранить профиль');
  const rows = await response.json();
  return mapProfile(rows[0] ?? profile);
}
