function validateCredentials({ email, password }) {
  if (!email?.trim() || !password) throw new Error('Введите email и пароль');
}

async function requestAuth({ url, publishableKey, path, body, fetchImpl }) {
  const response = await fetchImpl(`${url.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const responseBody = await response.json();
  if (!response.ok) throw new Error(responseBody?.msg ?? responseBody?.message ?? 'Не удалось выполнить вход');
  return responseBody;
}

function toSession(payload) {
  if (!payload?.access_token || !payload?.user?.id) return null;
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token ?? null, user: payload.user };
}

export async function signInWithEmail({ url, publishableKey, email, password, fetchImpl = fetch }) {
  validateCredentials({ email, password });
  const payload = await requestAuth({
    url, publishableKey, path: '/auth/v1/token?grant_type=password', body: { email: email.trim(), password }, fetchImpl,
  });
  const session = toSession(payload);
  if (!session) throw new Error('Supabase не вернул сессию пользователя');
  return session;
}

export async function signUpWithEmail({ url, publishableKey, email, password, fetchImpl = fetch }) {
  validateCredentials({ email, password });
  const payload = await requestAuth({
    url, publishableKey, path: '/auth/v1/signup', body: { email: email.trim(), password }, fetchImpl,
  });
  const session = toSession(payload.session ?? payload);
  return { session, needsEmailConfirmation: !session };
}

export async function refreshSession({ url, publishableKey, refreshToken, fetchImpl = fetch }) {
  if (!refreshToken?.trim()) throw new Error('Нет данных для обновления сессии');
  const payload = await requestAuth({ url, publishableKey, path: '/auth/v1/token?grant_type=refresh_token', body: { refresh_token: refreshToken }, fetchImpl });
  const session = toSession(payload);
  if (!session) throw new Error('Supabase не вернул обновлённую сессию');
  return session;
}
