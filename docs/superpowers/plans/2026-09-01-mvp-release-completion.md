# LifeOS MVP Release Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing LifeOS mobile MVP resilient for daily use, verify the release candidate, and leave a repeatable beta-launch checklist.

**Architecture:** Keep the Expo client, Railway API, OpenRouter provider, Groq transcription provider and Supabase persistence intact. Close only user-visible reliability gaps: valid AI result content, safe client error copy, and predictable final verification. Existing personal-data and RLS boundaries remain unchanged.

**Tech Stack:** Expo/React Native, Node.js ESM, Node test runner, pnpm workspaces, Supabase, Railway.

**Spec:** `README.md`, `docs/release-runbook.md`, and `docs/superpowers/plans/2026-08-01-lifeos-mvp-remaining-work.md`

## Global Constraints

- Never expose API keys, Supabase server secrets, access tokens, passwords or raw diary text in logs, tests or Git.
- All diary results must contain a non-empty summary, reflection question and next action before the API accepts them.
- The existing public mobile API contract and stored journal records remain backward-compatible.
- Do not add social features, financial tracking, an unrestricted AI chat, smart-watch features or a web client to this MVP.

---

### Task 1: Surface a useful AI-analysis error in the mobile client

**Files:**
- Modify: `apps/mobile/src/diary-api.js`
- Modify: `apps/mobile/test/diary-api.test.mjs`

**Interfaces:**
- Consumes: non-2xx JSON response from `POST /v1/diary/analyze`.
- Produces: an `Error` with a Russian user-safe message, while preserving the current generic message when the server gives no safe detail.

- [x] **Step 1: Write the failing test**

```js
test('shows the safe API analysis error to the diary author', async () => {
  await assert.rejects(
    () => analyzeDiaryThought({
      apiUrl: 'https://lifeos.example', text: 'Моя мысль',
      fetchImpl: async () => ({ ok: false, json: async () => ({ error: 'OpenRouter returned an incomplete analysis' }) }),
    }),
    { message: 'Не удалось подготовить полный AI-анализ. Попробуй ещё раз.' },
  );
});
```

- [x] **Step 2: Run the targeted test and verify it fails**

Run: `node --test test/diary-api.test.mjs`

Expected: the test fails because `analyzeDiaryThought` currently always returns the generic error.

- [x] **Step 3: Implement the smallest safe mapping**

```js
const body = await response.json().catch(() => ({}));
if (!response.ok && body.error === 'OpenRouter returned an incomplete analysis') {
  throw new Error('Не удалось подготовить полный AI-анализ. Попробуй ещё раз.');
}
if (!response.ok) throw new Error('Не удалось выполнить AI-анализ');
```

- [x] **Step 4: Run the targeted test and verify it passes**

Run: `node --test test/diary-api.test.mjs`

Expected: all tests pass.

- [x] **Step 5: Commit**

```powershell
git add apps/mobile/src/diary-api.js apps/mobile/test/diary-api.test.mjs
git commit -m "Show actionable diary analysis errors"
```

### Task 2: Keep historic result screens readable when an old record has a missing field

**Files:**
- Modify: `apps/mobile/src/analysis-result-view-model.js`
- Modify: `apps/mobile/test/analysis-result-view-model.test.mjs`

**Interfaces:**
- Consumes: legacy analysis objects that may contain empty string values.
- Produces: non-empty `reflectionQuestion` and `nextAction` fields for `AnalysisScreen`.

- [x] **Step 1: Write the failing test**

```js
test('uses clear placeholders for missing legacy reflection fields', () => {
  const result = createAnalysisResultViewModel({
    summary: 'Запись сохранена.', emotions: [], topics: [], reflectionQuestion: '', nextAction: '',
  });

  assert.equal(result.reflectionQuestion, 'Вопрос пока не сформирован — попробуй создать новую запись.');
  assert.equal(result.nextAction, 'Небольшой шаг пока не сформирован — попробуй создать новую запись.');
});
```

- [x] **Step 2: Run the targeted test and verify it fails**

Run: `node --test test/analysis-result-view-model.test.mjs`

Expected: the new test fails because the view model passes empty strings through unchanged.

- [x] **Step 3: Implement the narrow fallback**

```js
function nonEmptyText(value, fallback) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}
```

Use `nonEmptyText` only for `reflectionQuestion` and `nextAction` when creating the result view model.

- [x] **Step 4: Run the targeted test and verify it passes**

Run: `node --test test/analysis-result-view-model.test.mjs`

Expected: all tests pass.

- [x] **Step 5: Commit**

```powershell
git add apps/mobile/src/analysis-result-view-model.js apps/mobile/test/analysis-result-view-model.test.mjs
git commit -m "Handle incomplete legacy diary results"
```

### Task 3: Run the automated release gate

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: all workspaces.
- Produces: a verified test, syntax-check and build result.

- [x] **Step 1: Run all tests**

Run: `& "C:\Program Files\nodejs\pnpm.cmd" test`

Expected: exit code 0 and no failing tests.

- [x] **Step 2: Run syntax/type verification**

Run: `& "C:\Program Files\nodejs\pnpm.cmd" typecheck`

Expected: exit code 0.

- [x] **Step 3: Run the release build check**

Run: `& "C:\Program Files\nodejs\pnpm.cmd" build`

Expected: exit code 0.

- [x] **Step 4: Commit release documentation only if it changed**

```powershell
git status --short
```

Expected: no changed tracked file remains unexpectedly.

### Task 4: Verify the deployed API and phone flow

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: Railway public health endpoint and the Expo Go application.
- Produces: a manual smoke-test record with no personal diary text.

- [x] **Step 1: Verify Railway is online**

Run: `curl.exe --fail --silent --show-error https://lifeosdocs-production.up.railway.app/health`

Expected: `{"status":"ok"}`.

- [ ] **Step 2: Run the non-sensitive phone smoke test**

1. Sign in with a test account.
2. Enter `Сегодня хочу спокойно завершить задачу.` and select a mood.
3. Confirm summary, emotions, topics, question and action are visible.
4. Open History, confirm the record appears, then delete it.
5. Create one test habit and one test goal; confirm the habit and goal flows work.

Expected: each action completes without a raw server error or an empty mandatory result panel.

- [ ] **Step 3: Push the verified release commits**

```powershell
git push origin main
```

Expected: GitHub reports that `main` is up to date.

### Task 5: Define the beta-release boundary

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: verified MVP capabilities.
- Produces: a concise beta checklist and explicit deferred production features.

- [x] **Step 1: Add the beta checklist**

```markdown
## Перед beta-запуском

- [ ] Проверены дневник, история, привычки, цели и профиль на реальном телефоне.
- [ ] Railway `/health` отвечает `{"status":"ok"}`.
- [ ] В GitHub не добавлены `.env` и ключи.
- [ ] Пользователь может удалить свою тестовую запись из истории.
```

- [x] **Step 2: Verify README describes the current product, not planned features**

Run: `rg -n "Google|Apple|push|web|финансов" README.md`

Expected: any match is confined to the explicit “не входит” section.

- [ ] **Step 3: Commit and push**

```powershell
git add README.md docs/superpowers/plans/2026-09-01-mvp-release-completion.md
git commit -m "Document LifeOS MVP beta checklist"
git push origin main
```
