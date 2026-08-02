export async function transcribeLocalAudio({ transcriptionUrl, uri, fetchImpl = fetch }) {
  if (!transcriptionUrl?.trim()) throw new Error('Адрес локального Whisper не настроен');
  const audio = await (await fetch(uri)).blob();
  const response = await fetchImpl(`${transcriptionUrl.replace(/\/$/, '')}/transcribe`, {
    method: 'POST', headers: { 'Content-Type': audio.type || 'audio/mp4', 'X-LifeOS-Audio-Extension': '.m4a' }, body: audio,
  });
  if (!response.ok) throw new Error('Не удалось расшифровать голос');
  return (await response.json()).text;
}
