# Stitch Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Stitch visual system to LifeOS while keeping login, diary AI, voice transcription, Supabase synchronization, and existing actions working.

**Architecture:** Keep `apps/mobile/App.js` as the stateful application coordinator, but move reusable visual primitives and the colour system into focused modules. Extend the pure weekly aggregation function with a seven-day mood timeline, then render the actual aggregate in the new weekly screen without adding database fields or server endpoints.

**Tech Stack:** Expo 54, React 19, React Native 0.81, react-native-pager-view, expo-audio, Node test runner, Supabase client fetch adapters.

**Spec:** `docs/superpowers/specs/2026-09-01-stitch-mobile-redesign-design.md`

## Global Constraints

- Preserve the four primary navigation items exactly: `Главная`, `Дневник`, `Цели`, `Профиль`.
- Open habits only from `Сегодня` and weekly insights only from `Моя неделя` on the home screen.
- Use existing `history`, `habits`, `goals`, and `profile` data; do not add database tables, API endpoints, environment variables, or packages.
- Use the soft lavender visual language of the approved `Новая мысль` reference: rounded white surfaces, circular mood choices, prominent voice state, and readable dark-purple copy.
- Do not render made-up weekly values. Label habit and goal metrics according to the data that actually exists.
- Keep all existing Russian error strings and empty-state fallbacks visible.
- Do not stage or alter `.impeccable/mocks/`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `apps/mobile/src/weekly-insights.js` | Produce a seven-day, deterministic aggregate from saved records, habits, and goals. |
| `apps/mobile/test/weekly-insights.test.mjs` | Lock weekly date-window, average-mood, timeline, and empty-data behaviour. |
| `apps/mobile/src/mobile-theme.js` | Export shared LifeOS colour, radius, spacing, and typography constants. |
| `apps/mobile/src/primary-navigation.js` | Export the dependency-free, four-item primary-navigation contract. |
| `apps/mobile/src/mobile-ui.js` | Export reusable `AppCard`, `ScreenHeader`, `MoodPicker`, and `BottomNavigation` presentation components. |
| `apps/mobile/App.js` | Retain app state and callbacks; compose the redesigned screens using the reusable UI and weekly aggregate. |
| `apps/mobile/test/primary-navigation.test.mjs` | Validate the dependency-free primary-navigation contract in Node. |

## Task 1: Build a truthful seven-day weekly aggregate

**Files:**
- Modify: `apps/mobile/src/weekly-insights.js`
- Modify: `apps/mobile/test/weekly-insights.test.mjs`

**Interfaces:**
- Consumes: records shaped as `{ id, createdAt, mood }`, active habits shaped as `{ completedToday }`, and goals shaped as `{ status, progress }`.
- Produces: `createWeeklyInsights({ records, habits, goals, referenceDate })`, returning `{ averageMood, journalCount, habitsCompleted, habitsTotal, activeGoals, completedGoals, moodTimeline, hasWeeklyActivity }`.
- `moodTimeline` is an oldest-first array of seven `{ dateKey, label, mood }` values. A day without a record has `mood: null`.

- [ ] **Step 1: Write the failing seven-day boundary test**

  In `apps/mobile/test/weekly-insights.test.mjs`, replace the current test data with stable timestamps and add this test:

  ```js
  test('keeps only the last seven calendar days and exposes one latest mood per day', () => {
    const result = createWeeklyInsights({
      referenceDate: '2026-09-01T12:00:00.000Z',
      records: [
        { id: 'outside', createdAt: '2026-08-25T12:00:00.000Z', mood: 1 },
        { id: 'first', createdAt: '2026-08-26T08:00:00.000Z', mood: 2 },
        { id: 'latest-same-day', createdAt: '2026-08-26T20:00:00.000Z', mood: 4 },
        { id: 'last', createdAt: '2026-09-01T09:00:00.000Z', mood: 5 },
      ],
      habits: [{ completedToday: true }, { completedToday: false }],
      goals: [{ status: 'active' }, { status: 'completed' }],
    });

    assert.equal(result.journalCount, 3);
    assert.equal(result.averageMood, 4);
    assert.deepEqual(result.moodTimeline.map(({ dateKey, mood }) => ({ dateKey, mood })), [
      { dateKey: '2026-08-26', mood: 4 },
      { dateKey: '2026-08-27', mood: null },
      { dateKey: '2026-08-28', mood: null },
      { dateKey: '2026-08-29', mood: null },
      { dateKey: '2026-08-30', mood: null },
      { dateKey: '2026-08-31', mood: null },
      { dateKey: '2026-09-01', mood: 5 },
    ]);
  });
  ```

- [ ] **Step 2: Write the failing empty-week test**

  Add a test that passes an old record and no habits or goals. Assert `journalCount === 0`, `averageMood === null`, `hasWeeklyActivity === false`, and seven timeline entries with `mood === null`.

- [ ] **Step 3: Run the focused test to verify it fails**

  Run: `node --test apps/mobile/test/weekly-insights.test.mjs`

  Expected: FAIL because `referenceDate`, `moodTimeline`, and `hasWeeklyActivity` are not implemented.

- [ ] **Step 4: Implement the minimal aggregate**

  In `apps/mobile/src/weekly-insights.js`, add pure date helpers and update the signature:

  ```js
  export function createWeeklyInsights({ records, habits, goals, referenceDate = new Date().toISOString() }) {
    const timeline = createWeekTimeline(referenceDate);
    const recordsInWeek = records.filter((record) => timeline.some((day) => day.dateKey === record.createdAt?.slice(0, 10)));
    const moodTimeline = attachLatestMood(timeline, recordsInWeek);
    const moods = recordsInWeek.map((record) => record.mood).filter(Number.isFinite);

    return {
      averageMood: moods.length ? Math.round(moods.reduce((sum, mood) => sum + mood, 0) / moods.length) : null,
      journalCount: recordsInWeek.length,
      habitsCompleted: habits.filter((habit) => habit.completedToday).length,
      habitsTotal: habits.length,
      activeGoals: goals.filter(isActiveGoal).length,
      completedGoals: goals.filter(isCompletedGoal).length,
      moodTimeline,
      hasWeeklyActivity: recordsInWeek.length > 0 || habits.length > 0 || goals.length > 0,
    };
  }
  ```

  Implement `createWeekTimeline`, `attachLatestMood`, `isActiveGoal`, and `isCompletedGoal` in the same module. Use the `createdAt` date portion and a fixed Russian weekday label array so node tests are not affected by the host locale.

- [ ] **Step 5: Run the focused test to verify it passes**

  Run: `node --test apps/mobile/test/weekly-insights.test.mjs`

  Expected: PASS with both boundary and empty-week cases.

- [ ] **Step 6: Commit the aggregate**

  ```powershell
  git add apps/mobile/src/weekly-insights.js apps/mobile/test/weekly-insights.test.mjs
  git commit -m "Add seven-day LifeOS insights"
  ```

## Task 2: Create reusable mobile design primitives

**Files:**
- Create: `apps/mobile/src/mobile-theme.js`
- Create: `apps/mobile/src/primary-navigation.js`
- Create: `apps/mobile/src/mobile-ui.js`
- Create: `apps/mobile/test/primary-navigation.test.mjs`
- Modify: `apps/mobile/App.js:1-16`

**Interfaces:**
- `mobile-theme.js` exports `colors`, `radii`, and `spacing` constants.
- `primary-navigation.js` exports `primaryTabs` without importing React Native.
- `mobile-ui.js` exports `AppCard`, `ScreenHeader`, `MoodPicker`, and `BottomNavigation`, and imports `primaryTabs` from `primary-navigation.js`.
- `primaryTabs` is exactly `[{ id: 'home', label: 'Главная' }, { id: 'diary', label: 'Дневник' }, { id: 'goals', label: 'Цели' }, { id: 'profile', label: 'Профиль' }]`.
- `BottomNavigation({ activeTab, onTabChange })` maintains the existing animated underline behaviour.

- [ ] **Step 1: Write the failing navigation contract test**

  Create `apps/mobile/test/primary-navigation.test.mjs`:

  ```js
  import assert from 'node:assert/strict';
  import test from 'node:test';
  import { primaryTabs } from '../src/primary-navigation.js';

  test('keeps the four agreed primary destinations', () => {
    assert.deepEqual(primaryTabs, [
      { id: 'home', label: 'Главная' },
      { id: 'diary', label: 'Дневник' },
      { id: 'goals', label: 'Цели' },
      { id: 'profile', label: 'Профиль' },
    ]);
  });
  ```

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `node --test apps/mobile/test/primary-navigation.test.mjs`

  Expected: FAIL because `primary-navigation.js` does not exist.

- [ ] **Step 3: Add the colour system and visual primitives**

  Create `apps/mobile/src/mobile-theme.js` with the shared values:

  ```js
  export const colors = {
    background: '#F3EFFF',
    surface: '#FFFFFF',
    text: '#30294B',
    muted: '#716A82',
    primary: '#7562B8',
    primarySoft: '#E9E1FA',
    border: '#DCD1F3',
    error: '#B5465B',
  };
  export const radii = { card: 22, control: 16, pill: 999 };
  export const spacing = { screen: 24, card: 18, gap: 14 };
  ```

  Create `apps/mobile/src/primary-navigation.js` with the exact `primaryTabs` array in the interface section. Create `apps/mobile/src/mobile-ui.js`. Import React hooks, React Native primitives, and `primaryTabs` there; implement `AppCard` as a white bordered view, `ScreenHeader` as a back row plus title, `MoodPicker` as five labelled circular buttons based on `moodOptions`, and `BottomNavigation` with `primaryTabs`. Use `useWindowDimensions` and an `Animated.Value` for the existing smooth indicator.

- [ ] **Step 4: Replace local navigation and mood-picker definitions**

  In `apps/mobile/App.js`, import the new primitives and `primaryTabs`. Replace every hard-coded `['home', 'diary', 'goals', 'profile']` index lookup with `primaryTabs.map((tab) => tab.id)`. Remove the local `MoodPicker` and `BottomNavigation` functions only after all callers import the shared versions.

- [ ] **Step 5: Verify module syntax and the navigation test**

  Run:

  ```powershell
  node --check apps/mobile/src/mobile-theme.js
  node --check apps/mobile/src/mobile-ui.js
  node --test apps/mobile/test/primary-navigation.test.mjs
  ```

  Expected: all commands exit with code 0.

- [ ] **Step 6: Commit the shared design system**

  ```powershell
  git add apps/mobile/src/mobile-theme.js apps/mobile/src/primary-navigation.js apps/mobile/src/mobile-ui.js apps/mobile/test/primary-navigation.test.mjs apps/mobile/App.js
  git commit -m "Add shared LifeOS mobile UI"
  ```

## Task 3: Redesign the home, composer, and weekly screens

**Files:**
- Modify: `apps/mobile/App.js:236-320`
- Modify: `apps/mobile/App.js:478-577`
- Test: `apps/mobile/test/weekly-insights.test.mjs`

**Interfaces:**
- Consumes `createWeeklyInsights({ records: history, habits, goals })` from Task 1.
- `HomeScreen` accepts the existing callbacks and opens `ComposerScreen`, `HabitsScreen`, and `InsightsScreen` without changing their state owners.
- `InsightsScreen` accepts `insights`, `onClose`, `onOpenHabits`, `activeTab`, and `onTabChange`.

- [ ] **Step 1: Add a failing interaction-oriented helper assertion**

  Extend `weekly-insights.test.mjs` with assertions that the empty aggregate has `hasWeeklyActivity === false` and that a record-only aggregate has `hasWeeklyActivity === true`. This protects the empty state displayed by the screen.

- [ ] **Step 2: Run the aggregate test to verify the new assertion fails if needed**

  Run: `node --test apps/mobile/test/weekly-insights.test.mjs`

  Expected: PASS only after Task 1 exposes a boolean that correctly changes with weekly activity.

- [ ] **Step 3: Recompose the home screen in the approved hierarchy**

  In `HomeScreen`, use `AppCard` for the current-feeling picker, thought entry surface, `Сегодня`, and `Моя неделя`. Keep the existing `thought` input and callbacks. Use actual counts:

  ```jsx
  <Text style={styles.weekCardTitle}>Моя неделя</Text>
  <Text style={styles.weekCardText}>
    {weekly.journalCount ? `Записей за неделю: ${weekly.journalCount} · посмотри, что получилось заметить` : 'За последние 7 дней пока нет записей — добавь мысль, чтобы увидеть динамику.'}
  </Text>
  <Pressable onPress={onOpenInsights} style={styles.weekCardAction}>
    <Text style={styles.weekCardActionText}>Посмотреть неделю ›</Text>
  </Pressable>
  ```

  Pass a `weekly` aggregate into `HomeScreen` from `App` rather than recomputing it inside the component.

- [ ] **Step 4: Match the agreed new-thought reference**

  Redesign `ComposerScreen` with a centered title/subtitle, circular `MoodPicker`, a large white text field with the existing microphone entry point, and a central recording control. Reuse `onToggleVoice`, `isRecording`, and `voiceLoading`; the active control must show `Остановить запись` and `Идёт запись — говори, когда будешь готов.` alongside the existing state, never auto-stop or auto-send a recording.

  Use nested `View` circles for the liveness effect instead of adding a gradient or animation package:

  ```jsx
  <Pressable onPress={onToggleVoice} style={styles.recordingOrbitOuter}>
    <View style={styles.recordingOrbitMiddle}>
      <View style={styles.recordingOrbitCore}>
        <Text style={styles.recordingOrbitLabel}>{isRecording ? '■' : '🎙'}</Text>
      </View>
    </View>
  </Pressable>
  ```

- [ ] **Step 5: Implement the truthful weekly screen**

  Replace the current text-only `InsightsScreen` with cards for mood timeline, three real statistics, a non-causal insight, and focus action. Do not label daily habit completion as a weekly total and do not label active goals as completed steps. Render the no-data copy when `!insights.hasWeeklyActivity`.

  ```jsx
  <Text style={styles.statLabel}>Привычки сегодня</Text>
  <Text style={styles.statValue}>{insights.habitsCompleted} из {insights.habitsTotal}</Text>
  <Text style={styles.statLabel}>Цели в работе</Text>
  <Text style={styles.statValue}>{insights.activeGoals}</Text>
  ```

  Wire `Выбрать фокус` to `onOpenHabits`, and pass that callback from `App`.

- [ ] **Step 6: Run mobile tests and syntax validation**

  Run:

  ```powershell
  & 'C:\Program Files\nodejs\pnpm.cmd' --dir apps/mobile test
  node --check apps/mobile/App.js
  ```

  Expected: all mobile tests pass and `App.js` parses.

- [ ] **Step 7: Commit the primary screen redesign**

  ```powershell
  git add apps/mobile/App.js apps/mobile/test/weekly-insights.test.mjs
  git commit -m "Redesign LifeOS home and weekly flow"
  ```

## Task 4: Redesign the remaining connected screens

**Files:**
- Modify: `apps/mobile/App.js:321-477`
- Modify: `apps/mobile/App.js:478-577`
- Test: `apps/mobile/test/analysis-result-view-model.test.mjs`
- Test: `apps/mobile/test/journal-history.test.mjs`

**Interfaces:**
- `HabitsScreen`, `GoalsScreen`, `ProfileScreen`, `AnalysisScreen`, and `HistoryScreen` retain their existing props and mutation callbacks.
- `ResultSection({ title, children, highlighted })` becomes the shared analysis-card surface.
- Existing `createAnalysisResultViewModel` and `createJournalHistoryViewModel` interfaces remain unchanged.

- [ ] **Step 1: Run existing result and history tests before styling**

  Run:

  ```powershell
  node --test apps/mobile/test/analysis-result-view-model.test.mjs apps/mobile/test/journal-history.test.mjs
  ```

  Expected: PASS, establishing that view-model behaviour is unchanged before the visual refactor.

- [ ] **Step 2: Redesign the AI result and history screens**

  Give `AnalysisScreen` a LifeOS header and five separate `ResultSection` cards. Use soft tag chips for emotions and themes, preserving actual values. Redesign `HistoryScreen` as pressable entry cards with date, mood emoji, preview and summary; leave the delete confirmation flow intact.

- [ ] **Step 3: Redesign habits and goals without changing mutations**

  Render habits as white cards with clear completion status and the existing `Отметить выполнение` action. Render each goal with its existing progress value, `+10% прогресса` action, and a bar whose width is constrained to `0`–`100` percent. Keep disabled completed-goal behaviour.

- [ ] **Step 4: Redesign profile and shared error states**

  Keep the editable fields and communication-style options. Arrange them as grouped white cards with labels, a clear save CTA, status message, error message, and quiet sign-out action. Do not hide the email or change any profile API calls.

- [ ] **Step 5: Run focused behaviour tests and syntax validation**

  Run:

  ```powershell
  node --test apps/mobile/test/analysis-result-view-model.test.mjs apps/mobile/test/journal-history.test.mjs
  node --check apps/mobile/App.js
  ```

  Expected: all tests pass and `App.js` parses.

- [ ] **Step 6: Commit the connected screen redesign**

  ```powershell
  git add apps/mobile/App.js
  git commit -m "Apply Stitch styling across LifeOS screens"
  ```

## Task 5: Verify the release and prepare phone validation

**Files:**
- No product-code changes are expected in this task.

**Interfaces:**
- Uses the complete mobile application produced by Tasks 1–4.
- Produces a verified working tree and a focused manual check list for the user.

- [ ] **Step 1: Run the complete automated suite**

  Run: `& 'C:\Program Files\nodejs\pnpm.cmd' test`

  Expected: every workspace test passes.

- [ ] **Step 2: Run type and build checks**

  Run:

  ```powershell
  & 'C:\Program Files\nodejs\pnpm.cmd' typecheck
  & 'C:\Program Files\nodejs\pnpm.cmd' build
  node --check apps/mobile/App.js
  ```

  Expected: all commands exit with code 0.

- [ ] **Step 3: Inspect the final diff and ignored files**

  Run:

  ```powershell
  git diff --check HEAD
  git status --short
  ```

  Expected: no whitespace errors; `.impeccable/mocks/` remains untracked and unstaged.

- [ ] **Step 4: Perform the phone smoke test**

  Start Expo with:

  ```powershell
  cd 'C:\Users\1\Documents\Codex\2026-08-01\referenced-chatgpt-conversation-this-is-untrusted'
  & 'C:\Program Files\nodejs\pnpm.cmd' --dir apps/mobile exec expo start --tunnel --clear
  ```

  In Expo Go, verify: sign in; select a mood; create a text record; create or stop a voice record; receive AI analysis; open `Моя неделя`; open and complete a habit; update a goal; save profile; use each bottom-navigation item; use Android Back from a detail screen.
