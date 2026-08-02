function headers({ publishableKey, accessToken, prefer = null }) {
  const result = { apikey: publishableKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  if (prefer) result.Prefer = prefer;
  return result;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function subtractDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function streak(completions, today) {
  const days = new Set(completions.map((item) => item.completed_on));
  let result = 0;
  while (days.has(subtractDays(today, result))) result += 1;
  return result;
}

function assertOk(response, action) {
  if (!response.ok) throw new Error(`Не удалось ${action}`);
}

export async function fetchHabits({ url, publishableKey, accessToken, today = todayIso(), fetchImpl = fetch }) {
  const select = 'id,name,frequency,habit_completions(completed_on)';
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/habits?select=${encodeURIComponent(select)}&is_active=eq.true&order=created_at.asc`, {
    headers: headers({ publishableKey, accessToken }),
  });
  assertOk(response, 'загрузить привычки');
  const rows = await response.json();
  return rows.map((habit) => ({
    id: habit.id, name: habit.name, frequency: habit.frequency,
    completedToday: habit.habit_completions.some((item) => item.completed_on === today),
    streak: streak(habit.habit_completions, today),
  }));
}

export async function createHabit({ url, publishableKey, accessToken, userId, name, fetchImpl = fetch }) {
  if (!name?.trim()) throw new Error('Введите название привычки');
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/habits`, {
    method: 'POST', headers: headers({ publishableKey, accessToken, prefer: 'return=representation' }),
    body: JSON.stringify({ user_id: userId, name: name.trim(), frequency: 'daily' }),
  });
  assertOk(response, 'создать привычку');
  const [habit] = await response.json();
  return habit;
}

export async function completeHabit({ url, publishableKey, accessToken, userId, habitId, fetchImpl = fetch }) {
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/habit_completions`, {
    method: 'POST', headers: headers({ publishableKey, accessToken, prefer: 'return=minimal' }),
    body: JSON.stringify({ user_id: userId, habit_id: habitId }),
  });
  assertOk(response, 'отметить привычку');
}
