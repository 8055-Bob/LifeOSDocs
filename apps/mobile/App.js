import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createAnalysisResultViewModel } from './src/analysis-result-view-model.js';
import { analyzeDiaryThought, deleteDiaryRecord, fetchDiaryHistory } from './src/diary-api.js';
import { createJournalHistoryViewModel, prependJournalRecord } from './src/journal-history.js';
import { refreshSession, signInWithEmail, signUpWithEmail } from './src/supabase-auth-api.js';
import { getSupabasePublicConfig } from './src/supabase-config.js';
import { secureSessionStore } from './src/secure-session-store.js';
import { completeHabit, createHabit, fetchHabits } from './src/supabase-habits-api.js';
import { createGoal, fetchGoals, updateGoalProgress } from './src/supabase-goals-api.js';
import { createWeeklyInsights } from './src/weekly-insights.js';
import { fetchProfile, saveProfile } from './src/supabase-profile-api.js';
import { primaryTabs } from './src/primary-navigation.js';
import { AppCard, BottomNavigation, MoodPicker, ScreenHeader } from './src/mobile-ui.js';
import { moodOptions } from './src/mood-options.js';
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { transcribeAudio } from './src/groq-transcription-api.js';
import PagerView from 'react-native-pager-view';

export default function App() {
  const [mood, setMood] = useState(null);
  const [thought, setThought] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [habits, setHabits] = useState([]);
  const [showGoals, setShowGoals] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showInsights, setShowInsights] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({ displayName: '', currentFocus: '', timezone: '', communicationStyle: 'supportive' });
  const [restoringSession, setRestoringSession] = useState(true);
  const [launchReady, setLaunchReady] = useState(false);
  const pagerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setLaunchReady(true), 850);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    secureSessionStore.load()
      .then(async (storedSession) => {
        if (!storedSession) return null;
        const refreshedSession = await refreshSession({ ...getSupabasePublicConfig(), refreshToken: storedSession.refreshToken });
        await secureSessionStore.save(refreshedSession);
        return refreshedSession;
      })
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setRestoringSession(false));
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      setHistory([]);
      return undefined;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    fetchDiaryHistory({ apiUrl: process.env.EXPO_PUBLIC_LIFEOS_API_URL, accessToken: session.accessToken })
      .then((records) => {
        if (!cancelled) setHistory(records);
      })
      .catch(() => {
        if (!cancelled) setHistoryError('Не удалось загрузить историю. Проверь подключение к серверу.');
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken) {
      setProfile({ displayName: '', currentFocus: '', timezone: '', communicationStyle: 'supportive' });
      return;
    }
    const config = getSupabasePublicConfig();
    fetchProfile({ ...config, accessToken: session.accessToken, userId: session.user.id })
      .then(setProfile)
      .catch(() => setProfile({ displayName: '', currentFocus: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '', communicationStyle: 'supportive' }));
  }, [session]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showResult) { setShowResult(false); return true; }
      if (activeTab !== 'home') { openPrimaryTab('home'); return true; }
      if (showHabits) { setShowHabits(false); return true; }
      if (showGoals) { setShowGoals(false); return true; }
      if (showInsights) { setShowInsights(false); return true; }
      if (showProfile) { setShowProfile(false); return true; }
      if (showComposer) { setShowComposer(false); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [showResult, showHistory, showHabits, showGoals, showInsights, showProfile, showComposer, activeTab]);

  useEffect(() => {
    if (!session?.accessToken) return;
    const config = getSupabasePublicConfig();
    fetchGoals({ ...config, accessToken: session.accessToken }).then(setGoals).catch(() => setGoals([]));
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken) return;
    const config = getSupabasePublicConfig();
    fetchHabits({ ...config, accessToken: session.accessToken }).then(setHabits).catch(() => setHabits([]));
  }, [session]);

  async function submitThought() {
    setError(null);
    setLoading(true);
    try {
      const result = await analyzeDiaryThought({
        apiUrl: process.env.EXPO_PUBLIC_LIFEOS_API_URL,
        text: thought,
        mood,
        accessToken: session?.accessToken,
      });
      setHistory((records) => prependJournalRecord(records, {
        id: result.recordId ?? `record_${Date.now()}`,
        createdAt: new Date().toISOString(),
        mood,
        text: thought,
        analysis: result,
      }));
      setAnalysis(result);
      setThought('');
      setShowComposer(false);
      setShowResult(true);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVoiceRecording() {
    setError(null);
    if (!recorderState.isRecording) {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) { setError('Разреши доступ к микрофону в настройках телефона.'); return; }
      await recorder.prepareToRecordAsync();
      recorder.record();
      return;
    }
    setVoiceLoading(true);
    try {
      await recorder.stop();
      const text = await transcribeAudio({ apiUrl: process.env.EXPO_PUBLIC_LIFEOS_API_URL, accessToken: session?.accessToken, uri: recorder.uri });
      setThought((current) => current ? `${current}\n${text}` : text);
    } catch (voiceError) { setError(voiceError.message); }
    finally { setVoiceLoading(false); }
  }

  async function removeRecord(recordId) {
    setHistoryError(null);
    try {
      await deleteDiaryRecord({
        apiUrl: process.env.EXPO_PUBLIC_LIFEOS_API_URL,
        accessToken: session.accessToken,
        recordId,
      });
      setHistory((records) => records.filter((record) => record.id !== recordId));
    } catch (deletionError) {
      setHistoryError(deletionError.message);
    }
  }

  async function addHabit(name) {
    const config = getSupabasePublicConfig();
    await createHabit({ ...config, accessToken: session.accessToken, userId: session.user.id, name });
    setHabits(await fetchHabits({ ...config, accessToken: session.accessToken }));
  }

  async function markHabitComplete(habitId) {
    const config = getSupabasePublicConfig();
    await completeHabit({ ...config, accessToken: session.accessToken, userId: session.user.id, habitId });
    setHabits(await fetchHabits({ ...config, accessToken: session.accessToken }));
  }

  async function addGoal(title, targetDate) {
    const config = getSupabasePublicConfig();
    await createGoal({ ...config, accessToken: session.accessToken, userId: session.user.id, title, targetDate });
    setGoals(await fetchGoals({ ...config, accessToken: session.accessToken }));
  }

  async function setGoalProgress(goalId, progress) {
    const config = getSupabasePublicConfig();
    await updateGoalProgress({ ...config, accessToken: session.accessToken, goalId, progress });
    setGoals(await fetchGoals({ ...config, accessToken: session.accessToken }));
  }

  async function signOut() {
    await secureSessionStore.clear();
    setSession(null);
  }

  async function updateProfile(nextProfile) {
    const config = getSupabasePublicConfig();
    const savedProfile = await saveProfile({ ...config, accessToken: session.accessToken, userId: session.user.id, profile: nextProfile });
    setProfile(savedProfile);
  }

  const weekly = createWeeklyInsights({ records: history, habits, goals });

  function openPrimaryTab(tab) {
    setShowResult(false);
    setShowComposer(false);
    setShowHabits(false);
    setShowInsights(false);
    setActiveTab(tab);
    pagerRef.current?.setPage(primaryTabs.map((item) => item.id).indexOf(tab));
  }

  if (showResult && analysis) {
    return <AnalysisScreen result={createAnalysisResultViewModel(analysis)} onClose={() => setShowResult(false)} activeTab={activeTab} onTabChange={openPrimaryTab} />;
  }

  if (showHabits) {
    return <HabitsScreen habits={habits} onAdd={addHabit} onComplete={markHabitComplete} onClose={() => setShowHabits(false)} activeTab={activeTab} onTabChange={openPrimaryTab} />;
  }

  if (showInsights) return <InsightsScreen insights={weekly} onClose={() => setShowInsights(false)} onOpenHabits={() => { setShowInsights(false); setShowHabits(true); }} activeTab={activeTab} onTabChange={openPrimaryTab} />;
  if (showComposer) return <ComposerScreen mood={mood} onMoodChange={setMood} thought={thought} onThoughtChange={setThought} onClose={() => setShowComposer(false)} onSubmit={submitThought} onToggleVoice={toggleVoiceRecording} isRecording={recorderState.isRecording} recordingDurationMillis={recorderState.durationMillis} voiceLoading={voiceLoading} loading={loading} error={error} activeTab={activeTab} onTabChange={openPrimaryTab} />;

  if (restoringSession || !launchReady) {
    return <LaunchScreen />;
  }

  if (!session) {
    return <AuthScreen onAuthenticated={setSession} />;
  }

  return (
    <PagerView ref={pagerRef} style={styles.pager} initialPage={primaryTabs.map((item) => item.id).indexOf(activeTab)} onPageSelected={(event) => setActiveTab(primaryTabs.map((item) => item.id)[event.nativeEvent.position])}>
      <View key="home" style={styles.pagerPage}><HomeScreen profile={profile} mood={mood} onMoodChange={setMood} thought={thought} onThoughtChange={setThought} onSubmitThought={submitThought} loading={loading} habits={habits} history={history} weekly={weekly} onOpenComposer={() => setShowComposer(true)} onOpenHabits={() => setShowHabits(true)} onOpenInsights={() => setShowInsights(true)} onOpenProfile={() => openPrimaryTab('profile')} activeTab={activeTab} onTabChange={openPrimaryTab} /></View>
      <View key="diary" style={styles.pagerPage}><HistoryScreen records={createJournalHistoryViewModel(history)} loading={historyLoading} error={historyError} onDelete={removeRecord} onClose={() => openPrimaryTab('home')} activeTab={activeTab} onTabChange={openPrimaryTab} /></View>
      <View key="goals" style={styles.pagerPage}><GoalsScreen goals={goals} onAdd={addGoal} onProgress={setGoalProgress} onClose={() => openPrimaryTab('home')} activeTab={activeTab} onTabChange={openPrimaryTab} /></View>
      <View key="profile" style={styles.pagerPage}><ProfileScreen email={session.user.email} profile={profile} onSave={updateProfile} onSignOut={signOut} onClose={() => openPrimaryTab('home')} activeTab={activeTab} onTabChange={openPrimaryTab} /></View>
    </PagerView>
  );
}

function LaunchScreen() {
  return <SafeAreaView style={styles.launchScreen}>
    <View style={styles.launchOrbitOuter}><View style={styles.launchOrbitInner} /></View>
    <View style={styles.launchMark}><View style={styles.launchMarkCore} /></View>
    <Text style={styles.launchWordmark}>LifeOS</Text>
    <Text style={styles.launchTagline}>Немного ясности каждый день</Text>
    <View style={styles.launchLoader}><View style={styles.launchLoaderActive} /></View>
  </SafeAreaView>;
}

function HomeScreen({ profile, mood, onMoodChange, thought, onThoughtChange, onSubmitThought, loading, habits, history, weekly, onOpenComposer, onOpenHabits, onOpenInsights, onOpenProfile, activeTab, onTabChange }) {
  const name = profile.displayName?.trim() || 'друг';
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
      <View style={styles.homeHeader}>
        <View><Text style={styles.brandName}>LifeOS</Text><Text style={styles.homeTitle}>Добрый вечер, {name}</Text><Text style={styles.homeSubtitle}>{profile.currentFocus ? `Фокус: ${profile.currentFocus}` : 'Выбери состояние или поделись мыслью — я помогу навести ясность.'}</Text></View>
        <Pressable onPress={onOpenProfile} style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></Pressable>
      </View>
      <AppCard style={styles.checkInSurface}><Text style={styles.checkInTitle}>Что ты чувствуешь сейчас?</Text><MoodPicker mood={mood} onChange={onMoodChange} /></AppCard>
      <AppCard style={styles.quickThoughtSurface}>
        <TextInput value={thought} onChangeText={onThoughtChange} multiline placeholder="О чём думаешь?" placeholderTextColor="#7D7593" style={styles.quickThoughtInput} />
        <Pressable onPress={onOpenComposer} style={styles.voiceShortcut}><Text style={styles.voiceShortcutText}>Рассказать голосом</Text></Pressable>
      </AppCard>
      <Pressable disabled={loading || !thought.trim()} onPress={onSubmitThought} style={[styles.homePrimaryButton, (!thought.trim() || loading) && styles.disabledButton]}><Text style={styles.homePrimaryButtonText}>{loading ? 'Анализируем…' : 'Поделиться мыслью'}</Text></Pressable>
      <Pressable onPress={onOpenHabits}><AppCard style={styles.todayRow}><View style={styles.todayIcon}><Text style={styles.todayIconText}>✓</Text></View><View style={styles.flexGrow}><Text style={styles.todayTitle}>Сегодня</Text><Text style={styles.todayText}>Привычки · {weekly.habitsCompleted} из {weekly.habitsTotal}</Text></View><Text style={styles.rowArrow}>›</Text></AppCard></Pressable>
      <AppCard style={styles.weekCard}><Text style={styles.weekCardTitle}>Моя неделя</Text><Text style={styles.weekCardText}>{weekly.journalCount ? `Записей за неделю: ${weekly.journalCount} · посмотри, что получилось заметить` : 'За последние 7 дней пока нет записей — добавь мысль, чтобы увидеть динамику.'}</Text><Pressable onPress={onOpenInsights} style={styles.weekCardAction}><Text style={styles.weekCardActionText}>Посмотреть неделю ›</Text></Pressable></AppCard>
    </ScrollView>
    <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
  </SafeAreaView>;
}

function formatRecordingDuration(durationMillis) {
  const totalSeconds = Math.floor(Math.max(0, Number.isFinite(durationMillis) ? durationMillis : 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function ComposerScreen({ mood, onMoodChange, thought, onThoughtChange, onClose, onSubmit, onToggleVoice, isRecording, recordingDurationMillis, voiceLoading, loading, error, activeTab, onTabChange }) {
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.composerContent} keyboardShouldPersistTaps="handled">
    <Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>‹ Назад</Text></Pressable>
    <View style={styles.composerHeading}><Text style={styles.composerTitle}>Новая мысль</Text><Text style={styles.composerSubtitle}>Расскажи как есть — я помогу навести ясность.</Text></View>
    <View style={styles.composerMoodPicker}><MoodPicker mood={mood} onChange={onMoodChange} /></View>
    <TextInput value={thought} onChangeText={onThoughtChange} multiline placeholder="Что сейчас у тебя в голове?" placeholderTextColor="#7D7593" style={styles.composerInput} />
    <View style={styles.recordingControl}><Pressable disabled={voiceLoading} onPress={onToggleVoice} style={[styles.recordingOrbitOuter, voiceLoading && styles.disabledButton]}><View style={styles.recordingOrbitMiddle}><View style={[styles.recordingOrbitCore, isRecording && styles.recordingOrbitCoreActive]}><Text style={styles.recordingOrbitLabel}>{isRecording ? '■' : '🎙'}</Text></View></View></Pressable><Text style={styles.voiceCaptureText}>{voiceLoading ? 'Расшифровываем…' : isRecording ? 'Остановить запись' : 'Записать голосом'}</Text>{isRecording && <><Text style={styles.recordingTimer}>{formatRecordingDuration(recordingDurationMillis)}</Text><Text style={styles.recordingIndicator}>Идёт запись — говори, когда будешь готов.</Text></>}</View>
    <Pressable disabled={loading || !thought.trim()} onPress={onSubmit} style={[styles.primaryButton, (!thought.trim() || loading) && styles.disabledButton]}><Text style={styles.primaryButtonText}>{loading ? 'Анализируем…' : 'Получить разбор'}</Text></Pressable>
    {error && <Text style={styles.error}>{error}</Text>}
    <Text style={styles.privacyNote}>Твои мысли остаются твоими.</Text>
  </ScrollView><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
}

function HabitsScreen({ habits, onAdd, onComplete, onClose, activeTab, onTabChange }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  async function add() {
    try { await onAdd(name); setName(''); setError(null); } catch (reason) { setError(reason.message); }
  }
  async function complete(id) {
    try { await onComplete(id); setError(null); } catch (reason) { setError(reason.message); }
  }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.resultContent} keyboardShouldPersistTaps="handled">
    <ScreenHeader title="Привычки" onBack={onClose} backLabel="← На главную" />
    <AppCard style={styles.formCard}>
      <Text style={styles.cardEyebrow}>Новая привычка</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Новая привычка" placeholderTextColor="#7D7593" style={styles.input} />
      <Pressable onPress={add} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Добавить привычку</Text></Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
    </AppCard>
    {habits.length === 0 ? <AppCard style={styles.emptyCard}><Text style={styles.body}>Добавь первую привычку, которую хочешь выполнять каждый день.</Text></AppCard> : habits.map((habit) => <AppCard key={habit.id} style={[styles.habitCard, habit.completedToday && styles.habitCardCompleted]}>
      <View style={styles.cardHeader}><View style={styles.flexGrow}><Text style={styles.cardTitle}>{habit.name}</Text><Text style={styles.historyDate}>Серия: {habit.streak} дн.</Text></View><View style={[styles.completionBadge, habit.completedToday && styles.completionBadgeDone]}><Text style={[styles.completionBadgeText, habit.completedToday && styles.completionBadgeTextDone]}>{habit.completedToday ? 'Готово' : 'Сегодня'}</Text></View></View>
      <Pressable disabled={habit.completedToday} onPress={() => complete(habit.id)} style={[styles.primaryButton, habit.completedToday && styles.disabledButton]}><Text style={styles.primaryButtonText}>{habit.completedToday ? 'Выполнено сегодня' : 'Отметить выполнение'}</Text></Pressable>
    </AppCard>)}
  </ScrollView><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
}

function GoalsScreen({ goals, onAdd, onProgress, onClose, activeTab, onTabChange }) {
  const [title, setTitle] = useState(''); const [targetDate, setTargetDate] = useState(''); const [error, setError] = useState(null);
  async function add() { try { await onAdd(title, targetDate); setTitle(''); setTargetDate(''); setError(null); } catch (reason) { setError(reason.message); } }
  async function progress(goal) { try { await onProgress(goal.id, Math.min(100, goal.progress + 10)); setError(null); } catch (reason) { setError(reason.message); } }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.resultContent} keyboardShouldPersistTaps="handled">
    <ScreenHeader title="Цели" onBack={onClose} backLabel="← На главную" />
    <AppCard style={styles.formCard}><Text style={styles.cardEyebrow}>Новая цель</Text><TextInput value={title} onChangeText={setTitle} placeholder="Новая цель" placeholderTextColor="#7D7593" style={styles.input} /><TextInput value={targetDate} onChangeText={setTargetDate} placeholder="Срок: ГГГГ-ММ-ДД (необязательно)" placeholderTextColor="#7D7593" style={styles.input} /><Pressable onPress={add} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Создать цель</Text></Pressable>{error && <Text style={styles.error}>{error}</Text>}</AppCard>
    {goals.length === 0 ? <AppCard style={styles.emptyCard}><Text style={styles.body}>Добавь цель, к которой хочешь двигаться.</Text></AppCard> : goals.map((goal) => {
      const progressValue = Math.max(0, Math.min(100, Number(goal.progress) || 0));
      return <AppCard key={goal.id} style={styles.goalCard}><View style={styles.cardHeader}><Text style={[styles.cardTitle, styles.flexGrow]}>{goal.title}</Text><Text style={styles.goalProgressValue}>{progressValue}%</Text></View><Text style={styles.historyDate}>{goal.targetDate ? `до ${goal.targetDate}` : 'Без срока'}</Text><View style={styles.goalProgressTrack}><View style={[styles.goalProgressFill, { width: `${progressValue}%` }]} /></View><Pressable disabled={goal.status === 'completed'} onPress={() => progress(goal)} style={[styles.primaryButton, goal.status === 'completed' && styles.disabledButton]}><Text style={styles.primaryButtonText}>{goal.status === 'completed' ? 'Цель выполнена' : '+10% прогресса'}</Text></Pressable></AppCard>;
    })}
  </ScrollView><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
}

function InsightsScreen({ insights, onClose, onOpenHabits, activeTab, onTabChange }) {
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.insightsContent}><Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable><Text style={styles.resultTitle}>Моя неделя</Text>{!insights.hasWeeklyActivity ? <AppCard style={styles.insightCard}><Text style={styles.insightCardTitle}>Пока нет данных за неделю</Text><Text style={styles.body}>Добавь мысль, привычку или цель — здесь появится спокойный обзор твоей недели.</Text></AppCard> : <><AppCard style={styles.insightCard}><Text style={styles.insightCardTitle}>Настроение по дням</Text><View style={styles.moodTimeline}>{insights.moodTimeline.map((day) => <View key={day.dateKey} style={styles.moodDay}><Text style={styles.moodDayValue}>{day.mood ?? '—'}</Text><Text style={styles.moodDayLabel}>{day.label}</Text></View>)}</View></AppCard><View style={styles.statsRow}><AppCard style={styles.statCard}><Text style={styles.statLabel}>Записей за неделю</Text><Text style={styles.statValue}>{insights.journalCount}</Text></AppCard><AppCard style={styles.statCard}><Text style={styles.statLabel}>Привычки сегодня</Text><Text style={styles.statValue}>{insights.habitsCompleted} из {insights.habitsTotal}</Text></AppCard><AppCard style={styles.statCard}><Text style={styles.statLabel}>Цели в работе</Text><Text style={styles.statValue}>{insights.activeGoals}</Text></AppCard></View><AppCard style={styles.insightCard}><Text style={styles.insightCardTitle}>Что можно заметить</Text><Text style={styles.body}>{insights.journalCount ? `За последние 7 дней ты оставил${insights.journalCount === 1 ? '' : 'а'} ${insights.journalCount} ${insights.journalCount === 1 ? 'запись' : 'записей'}. Это просто снимок того, что уже есть.` : 'В дневнике пока нет записей за эту неделю. Остальные данные собраны отдельно.'}</Text></AppCard></>}<AppCard style={styles.focusCard}><Text style={styles.insightCardTitle}>Фокус на сегодня</Text><Text style={styles.body}>Выбери одну привычку, которой хочешь уделить внимание сегодня.</Text><Pressable onPress={onOpenHabits} style={styles.focusAction}><Text style={styles.focusActionText}>Выбрать фокус</Text></Pressable></AppCard></ScrollView><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
}

function ProfileScreen({ email, profile, onSave, onSignOut, onClose, activeTab, onTabChange }) {
  const [draft, setDraft] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => setDraft(profile), [profile]);
  async function save() {
    setSaving(true); setError(null); setMessage(null);
    try { await onSave(draft); setMessage('Профиль сохранён. Я буду учитывать эти настройки в рекомендациях.'); }
    catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.resultContent} keyboardShouldPersistTaps="handled"><ScreenHeader title="Профиль" onBack={onClose} backLabel="← На главную" /><AppCard style={styles.profileGroup}><Text style={styles.cardEyebrow}>Учётная запись</Text><Text style={styles.profileLabel}>Почта</Text><Text style={styles.body}>{email}</Text></AppCard><AppCard style={styles.profileGroup}><Text style={styles.cardEyebrow}>О тебе</Text><Text style={styles.profileLabel}>Как к тебе обращаться</Text><TextInput value={draft.displayName} onChangeText={(displayName) => setDraft((current) => ({ ...current, displayName }))} placeholder="Например, Алексей" placeholderTextColor="#7D7593" style={styles.input} /><Text style={styles.profileLabel}>Главный фокус сейчас</Text><TextInput value={draft.currentFocus} onChangeText={(currentFocus) => setDraft((current) => ({ ...current, currentFocus }))} placeholder="Например, спокойствие и сон" placeholderTextColor="#7D7593" style={styles.input} /><Text style={styles.profileLabel}>Часовой пояс</Text><TextInput value={draft.timezone} onChangeText={(timezone) => setDraft((current) => ({ ...current, timezone }))} placeholder="Например, Asia/Bangkok" placeholderTextColor="#7D7593" style={styles.input} /></AppCard><AppCard style={styles.profileGroup}><Text style={styles.cardEyebrow}>Общение</Text><Text style={styles.profileLabel}>Как общаться</Text><View style={styles.styleOptions}>{[{ id: 'supportive', label: 'Поддерживающе' }, { id: 'balanced', label: 'Бережно и по делу' }, { id: 'direct', label: 'Прямо' }].map((option) => <Pressable key={option.id} onPress={() => setDraft((current) => ({ ...current, communicationStyle: option.id }))} style={[styles.styleOption, draft.communicationStyle === option.id && styles.styleOptionActive]}><Text style={[styles.styleOptionText, draft.communicationStyle === option.id && styles.styleOptionTextActive]}>{option.label}</Text></Pressable>)}</View><Pressable disabled={saving} onPress={save} style={[styles.primaryButton, saving && styles.disabledButton]}><Text style={styles.primaryButtonText}>{saving ? 'Сохраняем…' : 'Сохранить профиль'}</Text></Pressable>{message && <Text style={styles.info}>{message}</Text>}{error && <Text style={styles.error}>{error}</Text>}</AppCard><AppCard style={styles.profileGroup}><Text style={styles.body}>Твои записи, привычки и цели принадлежат только тебе.</Text><Pressable onPress={onSignOut} style={styles.voiceButton}><Text style={styles.voiceButtonText}>Выйти из аккаунта</Text></Pressable></AppCard></ScrollView><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const config = getSupabasePublicConfig();
      const result = mode === 'signin'
        ? { session: await signInWithEmail({ ...config, email, password }) }
        : await signUpWithEmail({ ...config, email, password });

      if (!result.session) {
        setInfo('Проверь почту и подтверди адрес, затем войди в приложение.');
        return;
      }

      await secureSessionStore.save(result.session);
      onAuthenticated(result.session);
    } catch (authenticationError) {
      setError(authenticationError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.card, styles.authCard]}>
        <Text style={styles.title}>LifeOS</Text>
        <Text style={styles.body}>{mode === 'signin' ? 'Войди, чтобы твои записи были доступны только тебе.' : 'Создай аккаунт для личного и защищённого дневника.'}</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email" placeholderTextColor="#7D7593" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Пароль (минимум 6 символов)" placeholderTextColor="#7D7593" style={styles.input} />
        <Pressable disabled={loading} onPress={submit} style={[styles.primaryButton, loading && styles.disabledButton]}><Text style={styles.primaryButtonText}>{loading ? 'Подождите…' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}</Text></Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}
        <Pressable onPress={() => setMode((current) => current === 'signin' ? 'signup' : 'signin')} style={styles.historyButton}>
          <Text style={styles.historyButtonText}>{mode === 'signin' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function AnalysisScreen({ result, onClose, activeTab, onTabChange }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.resultContent}>
        <Text style={styles.brandName}>LifeOS</Text>
        <ScreenHeader title={result.title} onBack={onClose} backLabel="← На главную" />
        <ResultSection title="Краткий конспект"><Text style={styles.body}>{result.summary}</Text></ResultSection>
        <ResultSection title="Эмоции"><View style={styles.tagRow}>{result.emotions.length > 0 ? result.emotions.map((emotion) => (
          <View key={emotion.label} style={styles.emotionTag}><Text style={styles.tagText}>{emotion.label} · {emotion.percentage}%</Text></View>
        )) : <Text style={styles.body}>Эмоции пока не определены.</Text>}</View></ResultSection>
        <ResultSection title="Главные темы"><View style={styles.tagRow}>{result.topics.length > 0 ? result.topics.map((topic) => (
          <View key={topic} style={styles.topicTag}><Text style={styles.tagText}>{topic}</Text></View>
        )) : <Text style={styles.body}>Темы пока не определены.</Text>}</View></ResultSection>
        <ResultSection title="Вопрос для размышления"><Text style={styles.body}>{result.reflectionQuestion}</Text></ResultSection>
        <ResultSection title="Маленький шаг на сегодня" highlighted><Text style={styles.body}>{result.nextAction}</Text></ResultSection>
      </ScrollView>
      <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </SafeAreaView>
  );
}

function ResultSection({ title, children, highlighted = false }) {
  return <View style={[styles.resultSection, highlighted && styles.highlightedSection]}><Text style={styles.analysisTitle}>{title}</Text>{children}</View>;
}

function HistoryScreen({ records, loading, error, onDelete, onClose, activeTab, onTabChange }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.resultContent}>
        <Text style={styles.brandName}>LifeOS</Text>
        <ScreenHeader title="История" onBack={onClose} backLabel="← На главную" />
        {loading && <AppCard style={styles.emptyCard}><Text style={styles.body}>Загружаем записи…</Text></AppCard>}
        {error && <Text style={styles.error}>{error}</Text>}
        {records.length === 0
          ? <AppCard style={styles.emptyCard}><Text style={styles.body}>Здесь появятся твои записи после AI-анализа.</Text></AppCard>
          : records.map((record) => <Pressable key={record.id} style={({ pressed }) => [styles.historyCard, pressed && styles.historyCardPressed]}>
            <View style={styles.cardHeader}><View style={styles.flexGrow}><Text style={styles.historyDate}>{record.dateLabel}</Text><Text style={styles.historyPreview} numberOfLines={2}>{record.preview}</Text></View>{record.mood && <View style={styles.historyMood}><Text style={styles.historyMoodEmoji}>{moodOptions.find((option) => option.value === record.mood)?.emoji}</Text></View>}</View>
            {record.summary && <Text style={styles.historySummary} numberOfLines={3}>{record.summary}</Text>}
            <Pressable onPress={() => Alert.alert('Удалить запись?', 'Текст записи и её AI-анализ будут удалены без возможности восстановления.', [
              { text: 'Отмена', style: 'cancel' },
              { text: 'Удалить', style: 'destructive', onPress: () => onDelete(record.id) },
            ])} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Удалить</Text>
            </Pressable>
          </Pressable>)}
      </ScrollView>
      <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pager: { flex: 1, backgroundColor: '#FBF9FF' },
  pagerPage: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#FBF9FF' },
  launchScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, overflow: 'hidden', backgroundColor: '#8A7BC7' },
  launchOrbitOuter: { position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: '#CFC7EE', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] },
  launchOrbitInner: { width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: '#DDD6F5', backgroundColor: '#978AD0' },
  launchMark: { width: 72, height: 72, borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  launchMarkCore: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', transform: [{ rotate: '-45deg' }] },
  launchWordmark: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 12 },
  launchTagline: { color: '#F3F0FF', fontSize: 15, fontWeight: '600' },
  launchLoader: { position: 'absolute', bottom: 48, width: 92, height: 4, borderRadius: 99, overflow: 'hidden', backgroundColor: '#BEB5E4' },
  launchLoaderActive: { width: 42, height: 4, borderRadius: 99, marginLeft: 25, backgroundColor: '#FFFFFF' },
  moodEmoji: { fontSize: 22, lineHeight: 28 },
  card: { gap: 14, padding: 24, margin: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E7E1F1', backgroundColor: '#FFFFFF' },
  authCard: { marginTop: 80, shadowColor: '#51406F', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 3 },
  formCard: { gap: 12, padding: 18 },
  emptyCard: { padding: 18 },
  profileGroup: { gap: 12, padding: 18 },
  cardEyebrow: { color: '#6652A4', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTitle: { color: '#30294B', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  habitCard: { gap: 14, padding: 18 },
  habitCardCompleted: { borderColor: '#C7E7D7', backgroundColor: '#FCFFFD' },
  completionBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F0ECFF' },
  completionBadgeDone: { backgroundColor: '#E6F5EC' },
  completionBadgeText: { color: '#6652A4', fontSize: 12, fontWeight: '800' },
  completionBadgeTextDone: { color: '#1E6A4E' },
  goalCard: { gap: 12, padding: 18 },
  goalProgressValue: { color: '#6652A4', fontSize: 18, fontWeight: '800' },
  goalProgressTrack: { height: 8, overflow: 'hidden', borderRadius: 99, backgroundColor: '#EEE9F7' },
  goalProgressFill: { height: '100%', borderRadius: 99, backgroundColor: '#7562B8' },
  profileLabel: { color: '#4B426A', fontSize: 14, fontWeight: '700', marginTop: 4 },
  styleOptions: { gap: 8, marginBottom: 6 },
  styleOption: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: '#E7E1F1', backgroundColor: '#FCFBFF' },
  styleOptionActive: { borderColor: '#7562B8', backgroundColor: '#F0ECFF' },
  styleOptionText: { color: '#4B426A', fontSize: 15, fontWeight: '600' },
  styleOptionTextActive: { color: '#52428A' },
  title: { fontSize: 28, fontWeight: '700', color: '#30294B', letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 24, color: '#57516D' },
  section: { fontSize: 16, fontWeight: '700', color: '#30294B', marginTop: 8 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodButton: { padding: 8, borderRadius: 12 },
  moodSelected: { backgroundColor: '#EEE9FF' },
  emoji: { fontSize: 24 },
  input: { minHeight: 96, borderWidth: 1, borderColor: '#E1DBEC', borderRadius: 16, padding: 16, fontSize: 16, textAlignVertical: 'top', color: '#30294B', backgroundColor: '#FEFCFF' },
  primaryButton: { alignItems: 'center', backgroundColor: '#7562B8', borderRadius: 16, minHeight: 56, justifyContent: 'center', paddingHorizontal: 18 },
  disabledButton: { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  voiceButton: { alignItems: 'center', borderWidth: 1, borderColor: '#CEC4EC', borderRadius: 16, padding: 14, backgroundColor: '#F7F3FF' },
  voiceButtonText: { color: '#6652A4', fontSize: 16, fontWeight: '700' },
  recordingButton: { borderColor: '#B42318', backgroundColor: '#FFF1F2' },
  recordingButtonText: { color: '#B42318' },
  recordingIndicator: { color: '#B42318', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  recordingTimer: { color: '#B42318', fontSize: 22, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: 1 },
  historyButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  historyButtonText: { color: '#6652A4', fontSize: 15, fontWeight: '600' },
  error: { color: '#B42318', fontSize: 14, lineHeight: 20 },
  info: { color: '#1E6A4E', fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 14, color: '#716A82' },
  resultContent: { gap: 16, padding: 20, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8 },
  backButtonText: { color: '#6652A4', fontSize: 16, fontWeight: '700' },
  resultTitle: { color: '#30294B', fontSize: 30, fontWeight: '700', letterSpacing: -0.4, marginBottom: 2 },
  resultSection: { gap: 10, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E7E1F1', backgroundColor: '#FFFFFF' },
  highlightedSection: { backgroundColor: '#F3EFFF', borderWidth: 1, borderColor: '#D8CDF4' },
  analysisTitle: { color: '#30294B', fontSize: 14, fontWeight: '800' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emotionTag: { backgroundColor: '#FDECEF', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  topicTag: { backgroundColor: '#EAF5F0', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  tagText: { color: '#57516D', fontSize: 14, fontWeight: '600' },
  historyDate: { color: '#716A82', fontSize: 14, fontWeight: '600' },
  historyCard: { gap: 12, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E7E1F1', backgroundColor: '#FFFFFF' },
  historyCardPressed: { opacity: 0.82, backgroundColor: '#F8F5FF' },
  historyMood: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0ECFF' },
  historyMoodEmoji: { fontSize: 22, lineHeight: 28 },
  historyPreview: { color: '#30294B', fontSize: 16, lineHeight: 23, fontWeight: '700', marginTop: 5 },
  historySummary: { color: '#57516D', fontSize: 15, lineHeight: 22 },
  deleteButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  deleteButtonText: { color: '#B42318', fontSize: 14, fontWeight: '600' },
  homeContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 128, gap: 16 },
  homeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 },
  brandName: { color: '#6652A4', fontSize: 18, fontWeight: '800', letterSpacing: -0.2, marginBottom: 16 },
  homeTitle: { color: '#30294B', fontSize: 31, lineHeight: 38, fontWeight: '800', letterSpacing: -0.7 },
  homeSubtitle: { color: '#686177', fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 292 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#D7CCF0', backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#6652A4', fontSize: 18, fontWeight: '800' },
  checkInSurface: { gap: 14, padding: 18 },
  checkInTitle: { color: '#30294B', fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  moodChoice: { flex: 1, alignItems: 'center', gap: 6, minHeight: 60, paddingVertical: 6, borderRadius: 12 },
  moodDot: { width: 22, height: 22, borderWidth: 2, borderColor: '#A39BAD', borderRadius: 11, backgroundColor: '#FFFFFF' },
  moodDotSelected: { borderColor: '#7562B8', backgroundColor: '#E8E0FB' },
  moodLabel: { color: '#716A82', fontSize: 10, textAlign: 'center', fontWeight: '700' },
  moodLabelSelected: { color: '#6652A4' },
  quickThoughtSurface: { gap: 8, padding: 4, borderColor: '#D6CBEF' },
  quickThoughtInput: { minHeight: 104, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, color: '#30294B', fontSize: 17, lineHeight: 24, textAlignVertical: 'top' },
  voiceShortcut: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, marginLeft: 4, marginBottom: 4, borderRadius: 10, backgroundColor: '#F0EBFF' },
  voiceShortcutText: { color: '#6652A4', fontSize: 14, fontWeight: '800' },
  homePrimaryButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 16, minHeight: 58, paddingHorizontal: 16, backgroundColor: '#7562B8' },
  homePrimaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderColor: '#E3DAF1', backgroundColor: '#F8F5FF' },
  todayIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9E1FA' },
  todayIconText: { color: '#6652A4', fontSize: 20, fontWeight: '800' },
  flexGrow: { flex: 1 },
  todayTitle: { color: '#30294B', fontSize: 17, fontWeight: '800', marginBottom: 3 },
  todayText: { color: '#716A82', fontSize: 14 },
  rowArrow: { color: '#6652A4', fontSize: 28, lineHeight: 28 },
  weekCard: { gap: 12, padding: 18, borderColor: '#DCD1F3', backgroundColor: '#F3EFFF' },
  weekCardTitle: { color: '#6652A4', fontSize: 16, fontWeight: '800' },
  weekCardText: { color: '#30294B', fontSize: 18, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  weekCardAction: { alignSelf: 'flex-start', paddingVertical: 6 },
  weekCardActionText: { color: '#6652A4', fontSize: 15, fontWeight: '800' },
  bottomNavigation: { position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', minHeight: 70, marginHorizontal: 12, marginBottom: 14, paddingHorizontal: 4, borderRadius: 16, borderWidth: 1, borderColor: '#E1DBEC', backgroundColor: '#FFFFFF' },
  activeTabIndicator: { position: 'absolute', bottom: 6, height: 3, borderRadius: 99, backgroundColor: '#7562B8' },
  bottomItem: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 56 },
  bottomLabel: { color: '#716A82', fontSize: 12, fontWeight: '700' },
  bottomLabelActive: { color: '#6652A4' },
  composerContent: { padding: 24, paddingBottom: 44, gap: 20 },
  composerHeading: { alignItems: 'center', gap: 8, marginTop: 4 },
  composerTitle: { color: '#30294B', fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -0.7 },
  composerSubtitle: { color: '#686177', fontSize: 17, lineHeight: 25, textAlign: 'center' },
  composerMoodPicker: { alignSelf: 'center', width: '100%', padding: 12, borderRadius: 48, backgroundColor: '#F3EFFF' },
  composerInput: { minHeight: 250, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: '#D6CBEF', backgroundColor: '#FFFFFF', color: '#30294B', fontSize: 17, lineHeight: 25, textAlignVertical: 'top' },
  recordingControl: { alignItems: 'center', gap: 9 },
  recordingOrbitOuter: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE9FF' },
  recordingOrbitMiddle: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDD2FA' },
  recordingOrbitCore: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7562B8' },
  recordingOrbitCoreActive: { backgroundColor: '#B42318' },
  recordingOrbitLabel: { color: '#FFFFFF', fontSize: 25, lineHeight: 30 },
  voiceCaptureText: { color: '#6652A4', fontSize: 16, fontWeight: '800' },
  privacyNote: { color: '#716A82', fontSize: 14, textAlign: 'center', marginTop: 4 },
  insightsContent: { gap: 16, padding: 20, paddingBottom: 40 },
  insightCard: { gap: 12, padding: 18 },
  insightCardTitle: { color: '#30294B', fontSize: 18, fontWeight: '800' },
  moodTimeline: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodDay: { flex: 1, minHeight: 66, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, backgroundColor: '#F6F3FD' },
  moodDayValue: { color: '#52428A', fontSize: 17, fontWeight: '800' },
  moodDayLabel: { color: '#716A82', fontSize: 11, fontWeight: '700' },
  statsRow: { gap: 10 },
  statCard: { gap: 4, padding: 16 },
  statLabel: { color: '#716A82', fontSize: 14, fontWeight: '700' },
  statValue: { color: '#30294B', fontSize: 24, fontWeight: '800' },
  focusCard: { gap: 12, padding: 18, backgroundColor: '#F3EFFF' },
  focusAction: { alignSelf: 'flex-start', paddingVertical: 6 },
  focusActionText: { color: '#6652A4', fontSize: 16, fontWeight: '800' },
});
