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
import { BottomNavigation, MoodPicker } from './src/mobile-ui.js';
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

  if (showInsights) return <InsightsScreen insights={createWeeklyInsights({ records: history, habits, goals })} onClose={() => setShowInsights(false)} activeTab={activeTab} onTabChange={openPrimaryTab} />;
  if (showComposer) return <ComposerScreen mood={mood} onMoodChange={setMood} thought={thought} onThoughtChange={setThought} onClose={() => setShowComposer(false)} onSubmit={submitThought} onToggleVoice={toggleVoiceRecording} isRecording={recorderState.isRecording} voiceLoading={voiceLoading} loading={loading} error={error} activeTab={activeTab} onTabChange={openPrimaryTab} />;

  if (restoringSession || !launchReady) {
    return <LaunchScreen />;
  }

  if (!session) {
    return <AuthScreen onAuthenticated={setSession} />;
  }

  return (
    <PagerView ref={pagerRef} style={styles.pager} initialPage={primaryTabs.map((item) => item.id).indexOf(activeTab)} onPageSelected={(event) => setActiveTab(primaryTabs.map((item) => item.id)[event.nativeEvent.position])}>
      <View key="home" style={styles.pagerPage}><HomeScreen profile={profile} mood={mood} onMoodChange={setMood} thought={thought} onThoughtChange={setThought} onSubmitThought={submitThought} loading={loading} habits={habits} history={history} onOpenComposer={() => setShowComposer(true)} onOpenHabits={() => setShowHabits(true)} onOpenInsights={() => setShowInsights(true)} onOpenProfile={() => openPrimaryTab('profile')} activeTab={activeTab} onTabChange={openPrimaryTab} /></View>
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

function HomeScreen({ profile, mood, onMoodChange, thought, onThoughtChange, onSubmitThought, loading, habits, history, onOpenComposer, onOpenHabits, onOpenInsights, onOpenProfile, activeTab, onTabChange }) {
  const name = profile.displayName?.trim() || 'друг';
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
      <View style={styles.homeHeader}>
        <View><Text style={styles.brandName}>LifeOS</Text><Text style={styles.homeTitle}>Добрый вечер, {name}</Text><Text style={styles.homeSubtitle}>{profile.currentFocus ? `Фокус: ${profile.currentFocus}` : 'Выбери состояние или поделись мыслью — я помогу навести ясность.'}</Text></View>
        <Pressable onPress={onOpenProfile} style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></Pressable>
      </View>
      <View style={styles.checkInSurface}><Text style={styles.checkInTitle}>Что ты чувствуешь сейчас?</Text><MoodPicker mood={mood} onChange={onMoodChange} /></View>
      <View style={styles.quickThoughtSurface}>
        <TextInput value={thought} onChangeText={onThoughtChange} multiline placeholder="О чём думаешь?" placeholderTextColor="#7D7593" style={styles.quickThoughtInput} />
        <Pressable onPress={onOpenComposer} style={styles.voiceShortcut}><Text style={styles.voiceShortcutText}>Рассказать голосом</Text></Pressable>
      </View>
      <Pressable disabled={loading || !thought.trim()} onPress={onSubmitThought} style={[styles.homePrimaryButton, (!thought.trim() || loading) && styles.disabledButton]}><Text style={styles.homePrimaryButtonText}>{loading ? 'Анализируем…' : 'Поделиться мыслью'}</Text></Pressable>
      <Pressable onPress={onOpenHabits} style={styles.todayRow}><View style={styles.todayIcon}><Text style={styles.todayIconText}>✓</Text></View><View style={styles.flexGrow}><Text style={styles.todayTitle}>Сегодня</Text><Text style={styles.todayText}>Привычки · {habits.filter((habit) => habit.completedToday).length} из {habits.length || 1}</Text></View><Text style={styles.rowArrow}>›</Text></Pressable>
      <Pressable onPress={onOpenInsights} style={styles.insightSurface}><Text style={styles.insightHeading}>Инсайт дня</Text><Text style={styles.insightText}>{history.length > 0 ? 'Твои записи уже начинают складываться в личную картину.' : 'Поделись первой мыслью — я помогу увидеть важное.'}</Text><Text style={styles.insightAction}>Посмотреть разбор  ›</Text></Pressable>
    </ScrollView>
    <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
  </SafeAreaView>;
}

function ComposerScreen({ mood, onMoodChange, thought, onThoughtChange, onClose, onSubmit, onToggleVoice, isRecording, voiceLoading, loading, error, activeTab, onTabChange }) {
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.composerContent} keyboardShouldPersistTaps="handled">
    <Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>‹ Назад</Text></Pressable>
    <Text style={styles.composerTitle}>Новая мысль</Text><Text style={styles.composerSubtitle}>Расскажи как есть — я помогу навести ясность.</Text>
    <MoodPicker mood={mood} onChange={onMoodChange} />
    <TextInput value={thought} onChangeText={onThoughtChange} multiline placeholder="Что сейчас у тебя в голове?" placeholderTextColor="#7D7593" style={styles.composerInput} />
    {isRecording && <Text style={styles.recordingIndicator}>Идёт запись — говори, когда будешь готов.</Text>}
    <Pressable disabled={voiceLoading} onPress={onToggleVoice} style={[styles.voiceCaptureButton, isRecording && styles.recordingButton, voiceLoading && styles.disabledButton]}><Text style={[styles.voiceCaptureText, isRecording && styles.recordingButtonText]}>{voiceLoading ? 'Расшифровываем…' : isRecording ? 'Остановить запись' : 'Записать голосом'}</Text></Pressable>
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
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.resultContent}>
    <Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable>
    <Text style={styles.resultTitle}>Привычки</Text>
    <View style={styles.resultSection}>
      <TextInput value={name} onChangeText={setName} placeholder="Новая привычка" placeholderTextColor="#7D7593" style={styles.input} />
      <Pressable onPress={add} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Добавить привычку</Text></Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
    {habits.length === 0 ? <Text style={styles.body}>Добавь первую привычку, которую хочешь выполнять каждый день.</Text> : habits.map((habit) => <View key={habit.id} style={styles.resultSection}>
      <Text style={styles.body}>{habit.name}</Text><Text style={styles.historyDate}>Серия: {habit.streak} дн.</Text>
      <Pressable disabled={habit.completedToday} onPress={() => complete(habit.id)} style={[styles.primaryButton, habit.completedToday && styles.disabledButton]}><Text style={styles.primaryButtonText}>{habit.completedToday ? 'Выполнено сегодня' : 'Отметить выполнение'}</Text></Pressable>
    </View>)}
  </ScrollView><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
}

function GoalsScreen({ goals, onAdd, onProgress, onClose, activeTab, onTabChange }) {
  const [title, setTitle] = useState(''); const [targetDate, setTargetDate] = useState(''); const [error, setError] = useState(null);
  async function add() { try { await onAdd(title, targetDate); setTitle(''); setTargetDate(''); setError(null); } catch (reason) { setError(reason.message); } }
  async function progress(goal) { try { await onProgress(goal.id, Math.min(100, goal.progress + 10)); setError(null); } catch (reason) { setError(reason.message); } }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.resultContent}>
    <Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable><Text style={styles.resultTitle}>Цели</Text>
    <View style={styles.resultSection}><TextInput value={title} onChangeText={setTitle} placeholder="Новая цель" placeholderTextColor="#7D7593" style={styles.input} /><TextInput value={targetDate} onChangeText={setTargetDate} placeholder="Срок: ГГГГ-ММ-ДД (необязательно)" placeholderTextColor="#7D7593" style={styles.input} /><Pressable onPress={add} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Создать цель</Text></Pressable>{error && <Text style={styles.error}>{error}</Text>}</View>
    {goals.length === 0 ? <Text style={styles.body}>Добавь цель, к которой хочешь двигаться.</Text> : goals.map((goal) => <View key={goal.id} style={styles.resultSection}><Text style={styles.body}>{goal.title}</Text><Text style={styles.historyDate}>{goal.progress}%{goal.targetDate ? ` · до ${goal.targetDate}` : ''}</Text><Pressable disabled={goal.status === 'completed'} onPress={() => progress(goal)} style={[styles.primaryButton, goal.status === 'completed' && styles.disabledButton]}><Text style={styles.primaryButtonText}>{goal.status === 'completed' ? 'Цель выполнена' : '+10% прогресса'}</Text></Pressable></View>)}
  </ScrollView><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
}

function InsightsScreen({ insights, onClose, activeTab, onTabChange }) {
  return <SafeAreaView style={styles.screen}><View style={styles.flexGrow}><View style={styles.card}><Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable><Text style={styles.resultTitle}>Неделя</Text><Text style={styles.body}>Записей: {insights.journalCount}</Text><Text style={styles.body}>Среднее настроение: {insights.averageMood ?? 'пока нет данных'}/5</Text><Text style={styles.body}>Привычки сегодня: {insights.habitsCompleted}/{insights.habitsTotal}</Text><Text style={styles.body}>Активные цели: {insights.activeGoals}</Text><Text style={styles.body}>Выполненные цели: {insights.completedGoals}</Text></View></View><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
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
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.resultContent} keyboardShouldPersistTaps="handled"><Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable><Text style={styles.resultTitle}>Профиль</Text><View style={styles.resultSection}><Text style={styles.profileLabel}>Почта</Text><Text style={styles.body}>{email}</Text><Text style={styles.profileLabel}>Как к тебе обращаться</Text><TextInput value={draft.displayName} onChangeText={(displayName) => setDraft((current) => ({ ...current, displayName }))} placeholder="Например, Алексей" placeholderTextColor="#7D7593" style={styles.input} /><Text style={styles.profileLabel}>Главный фокус сейчас</Text><TextInput value={draft.currentFocus} onChangeText={(currentFocus) => setDraft((current) => ({ ...current, currentFocus }))} placeholder="Например, спокойствие и сон" placeholderTextColor="#7D7593" style={styles.input} /><Text style={styles.profileLabel}>Часовой пояс</Text><TextInput value={draft.timezone} onChangeText={(timezone) => setDraft((current) => ({ ...current, timezone }))} placeholder="Например, Asia/Bangkok" placeholderTextColor="#7D7593" style={styles.input} /><Text style={styles.profileLabel}>Как общаться</Text><View style={styles.styleOptions}>{[{ id: 'supportive', label: 'Поддерживающе' }, { id: 'balanced', label: 'Бережно и по делу' }, { id: 'direct', label: 'Прямо' }].map((option) => <Pressable key={option.id} onPress={() => setDraft((current) => ({ ...current, communicationStyle: option.id }))} style={[styles.styleOption, draft.communicationStyle === option.id && styles.styleOptionActive]}><Text style={[styles.styleOptionText, draft.communicationStyle === option.id && styles.styleOptionTextActive]}>{option.label}</Text></Pressable>)}</View><Pressable disabled={saving} onPress={save} style={[styles.primaryButton, saving && styles.disabledButton]}><Text style={styles.primaryButtonText}>{saving ? 'Сохраняем…' : 'Сохранить профиль'}</Text></Pressable>{message && <Text style={styles.info}>{message}</Text>}{error && <Text style={styles.error}>{error}</Text>}</View><View style={styles.resultSection}><Text style={styles.body}>Твои записи, привычки и цели принадлежат только тебе.</Text><Pressable onPress={onSignOut} style={styles.voiceButton}><Text style={styles.voiceButtonText}>Выйти из аккаунта</Text></Pressable></View></ScrollView><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
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
      <View style={styles.card}>
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
        <Pressable onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>← На главную</Text>
        </Pressable>
        <Text style={styles.resultTitle}>{result.title}</Text>
        <ResultSection title="Краткий конспект"><Text style={styles.body}>{result.summary}</Text></ResultSection>
        {result.emotions.length > 0 && <ResultSection title="Эмоции"><View style={styles.tagRow}>{result.emotions.map((emotion) => (
          <View key={emotion.label} style={styles.emotionTag}><Text style={styles.tagText}>{emotion.label} · {emotion.percentage}%</Text></View>
        ))}</View></ResultSection>}
        {result.topics.length > 0 && <ResultSection title="Главные темы"><View style={styles.tagRow}>{result.topics.map((topic) => (
          <View key={topic} style={styles.topicTag}><Text style={styles.tagText}>{topic}</Text></View>
        ))}</View></ResultSection>}
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
        <Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable>
        <Text style={styles.resultTitle}>История</Text>
        {loading && <Text style={styles.body}>Загружаем записи…</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {records.length === 0
          ? <Text style={styles.body}>Здесь появятся твои записи после AI-анализа.</Text>
          : records.map((record) => <View key={record.id} style={styles.resultSection}>
            <Text style={styles.historyDate}>{record.dateLabel}{record.mood ? ` · настроение ${record.mood}/5` : ''}</Text>
            <Text style={styles.body}>{record.summary ?? record.preview}</Text>
            <Pressable onPress={() => Alert.alert('Удалить запись?', 'Текст записи и её AI-анализ будут удалены без возможности восстановления.', [
              { text: 'Отмена', style: 'cancel' },
              { text: 'Удалить', style: 'destructive', onPress: () => onDelete(record.id) },
            ])} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Удалить</Text>
            </Pressable>
          </View>)}
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
  deleteButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  deleteButtonText: { color: '#B42318', fontSize: 14, fontWeight: '600' },
  homeContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 128, gap: 16 },
  homeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 },
  brandName: { color: '#6652A4', fontSize: 18, fontWeight: '800', letterSpacing: -0.2, marginBottom: 16 },
  homeTitle: { color: '#30294B', fontSize: 31, lineHeight: 38, fontWeight: '800', letterSpacing: -0.7 },
  homeSubtitle: { color: '#686177', fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 292 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#D7CCF0', backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#6652A4', fontSize: 18, fontWeight: '800' },
  checkInSurface: { gap: 14, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E7E1F1', backgroundColor: '#FFFFFF' },
  checkInTitle: { color: '#30294B', fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  moodChoice: { flex: 1, alignItems: 'center', gap: 6, minHeight: 60, paddingVertical: 6, borderRadius: 12 },
  moodDot: { width: 22, height: 22, borderWidth: 2, borderColor: '#A39BAD', borderRadius: 11, backgroundColor: '#FFFFFF' },
  moodDotSelected: { borderColor: '#7562B8', backgroundColor: '#E8E0FB' },
  moodLabel: { color: '#716A82', fontSize: 10, textAlign: 'center', fontWeight: '700' },
  moodLabelSelected: { color: '#6652A4' },
  quickThoughtSurface: { gap: 8, padding: 4, borderWidth: 1, borderColor: '#D6CBEF', borderRadius: 16, backgroundColor: '#FFFFFF' },
  quickThoughtInput: { minHeight: 104, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, color: '#30294B', fontSize: 17, lineHeight: 24, textAlignVertical: 'top' },
  voiceShortcut: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, marginLeft: 4, marginBottom: 4, borderRadius: 10, backgroundColor: '#F0EBFF' },
  voiceShortcutText: { color: '#6652A4', fontSize: 14, fontWeight: '800' },
  homePrimaryButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 16, minHeight: 58, paddingHorizontal: 16, backgroundColor: '#7562B8' },
  homePrimaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E3DAF1', backgroundColor: '#F8F5FF' },
  todayIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9E1FA' },
  todayIconText: { color: '#6652A4', fontSize: 20, fontWeight: '800' },
  flexGrow: { flex: 1 },
  todayTitle: { color: '#30294B', fontSize: 17, fontWeight: '800', marginBottom: 3 },
  todayText: { color: '#716A82', fontSize: 14 },
  rowArrow: { color: '#6652A4', fontSize: 28, lineHeight: 28 },
  insightSurface: { gap: 12, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#DCD1F3', backgroundColor: '#F3EFFF' },
  insightHeading: { color: '#6652A4', fontSize: 16, fontWeight: '800' },
  insightText: { color: '#30294B', fontSize: 19, lineHeight: 27, fontWeight: '700', letterSpacing: -0.25 },
  insightAction: { color: '#6652A4', fontSize: 15, fontWeight: '800', marginTop: 4 },
  bottomNavigation: { position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', minHeight: 70, marginHorizontal: 12, marginBottom: 14, paddingHorizontal: 4, borderRadius: 16, borderWidth: 1, borderColor: '#E1DBEC', backgroundColor: '#FFFFFF' },
  activeTabIndicator: { position: 'absolute', bottom: 6, height: 3, borderRadius: 99, backgroundColor: '#7562B8' },
  bottomItem: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 56 },
  bottomLabel: { color: '#716A82', fontSize: 12, fontWeight: '700' },
  bottomLabelActive: { color: '#6652A4' },
  composerContent: { padding: 24, paddingBottom: 44, gap: 18 },
  composerTitle: { color: '#30294B', fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -0.7 },
  composerSubtitle: { color: '#686177', fontSize: 17, lineHeight: 25, marginBottom: 4 },
  composerInput: { minHeight: 260, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#D6CBEF', backgroundColor: '#FFFFFF', color: '#30294B', fontSize: 17, lineHeight: 25, textAlignVertical: 'top' },
  voiceCaptureButton: { alignItems: 'center', borderWidth: 1, borderColor: '#CEC4EC', borderRadius: 16, minHeight: 56, justifyContent: 'center', backgroundColor: '#F7F3FF' },
  voiceCaptureText: { color: '#6652A4', fontSize: 16, fontWeight: '800' },
  privacyNote: { color: '#716A82', fontSize: 14, textAlign: 'center', marginTop: 4 },
});
