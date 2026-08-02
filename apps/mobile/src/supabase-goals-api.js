function headers({ publishableKey, accessToken, prefer = null }) {
  const value = { apikey: publishableKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  if (prefer) value.Prefer = prefer;
  return value;
}

function assertOk(response, action) {
  if (!response.ok) throw new Error(`Не удалось ${action}`);
}

function mapGoal(goal) {
  return { id: goal.id, title: goal.title, targetDate: goal.target_date, progress: goal.progress, status: goal.status };
}

export async function fetchGoals({ url, publishableKey, accessToken, fetchImpl = fetch }) {
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/goals?select=id,title,target_date,progress,status&order=created_at.asc`, { headers: headers({ publishableKey, accessToken }) });
  assertOk(response, 'загрузить цели');
  return (await response.json()).map(mapGoal).sort((left, right) => (left.status === 'active' ? 0 : 1) - (right.status === 'active' ? 0 : 1));
}

export async function createGoal({ url, publishableKey, accessToken, userId, title, targetDate = null, fetchImpl = fetch }) {
  if (!title?.trim()) throw new Error('Введите название цели');
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/goals`, { method: 'POST', headers: headers({ publishableKey, accessToken, prefer: 'return=representation' }), body: JSON.stringify({ user_id: userId, title: title.trim(), target_date: targetDate || null }) });
  assertOk(response, 'создать цель');
  return mapGoal((await response.json())[0]);
}

export async function updateGoalProgress({ url, publishableKey, accessToken, goalId, progress, fetchImpl = fetch }) {
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) throw new Error('Прогресс должен быть от 0 до 100');
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/goals?id=eq.${encodeURIComponent(goalId)}`, { method: 'PATCH', headers: headers({ publishableKey, accessToken, prefer: 'return=representation' }), body: JSON.stringify({ progress, status: progress === 100 ? 'completed' : 'active', updated_at: new Date().toISOString() }) });
  assertOk(response, 'обновить прогресс');
  return mapGoal((await response.json())[0]);
}
