export async function transcribeAudio({ apiUrl, accessToken, uri, fetchImpl = fetch }) {
  if (!apiUrl?.trim()) throw new Error('Адрес сервера LifeOS не настроен');
  if (!accessToken?.trim()) throw new Error('Войдите в аккаунт, чтобы расшифровать голос');
  const audio = await (await fetchImpl(uri)).blob();
  const response = await fetchImpl(`${apiUrl.replace(/\/$/, '')}/v1/transcribe`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': audio.type || 'audio/mp4',
      'X-LifeOS-Audio-Extension': '.m4a',
    },
    body: audio,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Не удалось расшифровать голос');
  }
  const payload = await response.json();
  return payload.text;
}
