export async function analyzeDiaryThought({ apiUrl, text, mood = null, accessToken = null, fetchImpl = fetch }) {
  if (!apiUrl?.trim()) throw new Error('Адрес сервера LifeOS не настроен');
  if (!text?.trim()) throw new Error('Напиши мысль перед анализом');

  const headers = { 'Content-Type': 'application/json' };
  if (accessToken?.trim()) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetchImpl(`${apiUrl.replace(/\/$/, '')}/v1/diary/analyze`, {
    method: 'POST', headers, body: JSON.stringify({ text, mood }),
  });
  if (!response.ok) throw new Error('Не удалось выполнить AI-анализ');
  return response.json();
}

export async function fetchDiaryHistory({ apiUrl, accessToken, fetchImpl = fetch }) {
  if (!apiUrl?.trim()) throw new Error('Адрес сервера LifeOS не настроен');
  if (!accessToken?.trim()) throw new Error('Требуется вход в аккаунт');

  const response = await fetchImpl(`${apiUrl.replace(/\/$/, '')}/v1/diary/records`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Не удалось загрузить историю');
  const body = await response.json();
  return body.records ?? [];
}

export async function deleteDiaryRecord({ apiUrl, accessToken, recordId, fetchImpl = fetch }) {
  if (!apiUrl?.trim()) throw new Error('Адрес сервера LifeOS не настроен');
  if (!accessToken?.trim()) throw new Error('Требуется вход в аккаунт');
  if (!recordId?.trim()) throw new Error('Не выбрана запись для удаления');

  const response = await fetchImpl(`${apiUrl.replace(/\/$/, '')}/v1/diary/records/${encodeURIComponent(recordId)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Не удалось удалить запись');
  return response.json();
}
