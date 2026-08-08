import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { createAnalysisResultViewModel } from './src/analysis-result-view-model.js';
import { analyzeDiaryThought, deleteDiaryRecord, fetchDiaryHistory } from './src/diary-api.js';
import { createJournalHistoryViewModel, prependJournalRecord } from './src/journal-history.js';
import { refreshSession, signInWithEmail, signUpWithEmail } from './src/supabase-auth-api.js';
import { getSupabasePublicConfig } from './src/supabase-config.js';
import { secureSessionStore } from './src/secure-session-store.js';
import { completeHabit, createHabit, fetchHabits } from './src/supabase-habits-api.js';
import { createGoal, fetchGoals, updateGoalProgress } from './src/supabase-goals-api.js';
import { createWeeklyInsights } from './src/weekly-insights.js';
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { transcribeLocalAudio } from './src/local-transcription-api.js';
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
  const [restoringSession, setRestoringSession] = useState(true);
  const pagerRef = useRef(null);

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
      const text = await transcribeLocalAudio({ transcriptionUrl: process.env.EXPO_PUBLIC_LIFEOS_TRANSCRIPTION_URL, uri: recorder.uri });
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

  function openPrimaryTab(tab) {
    setShowResult(false);
    setShowComposer(false);
    setShowHabits(false);
    setShowInsights(false);
    setActiveTab(tab);
    pagerRef.current?.setPage(['home', 'diary', 'goals', 'profile'].indexOf(tab));
  }

  if (showResult && analysis) {
    return <AnalysisScreen result={createAnalysisResultViewModel(analysis)} onClose={() => setShowResult(false)} activeTab={activeTab} onTabChange={openPrimaryTab} />;
  }

  if (showHabits) {
    return <HabitsScreen habits={habits} onAdd={addHabit} onComplete={markHabitComplete} onClose={() => setShowHabits(false)} activeTab={activeTab} onTabChange={openPrimaryTab} />;
  }

  if (showInsights) return <InsightsScreen insights={createWeeklyInsights({ records: history, habits, goals })} onClose={() => setShowInsights(false)} activeTab={activeTab} onTabChange={openPrimaryTab} />;
  if (showComposer) return <ComposerScreen mood={mood} onMoodChange={setMood} thought={thought} onThoughtChange={setThought} onClose={() => setShowComposer(false)} onSubmit={submitThought} onToggleVoice={toggleVoiceRecording} isRecording={recorderState.isRecording} voiceLoading={voiceLoading} loading={loading} error={error} activeTab={activeTab} onTabChange={openPrimaryTab} />;

  if (restoringSession) {
    return <SafeAreaView style={styles.screen}><Text style={styles.body}>Загружаем LifeOS…</Text></SafeAreaView>;
  }

  if (!session) {
    return <AuthScreen onAuthenticated={setSession} />;
  }

  return (
    <PagerView ref={pagerRef} style={styles.pager} initialPage={['home', 'diary', 'goals', 'profile'].indexOf(activeTab)} onPageSelected={(event) => setActiveTab(['home', 'diary', 'goals', 'profile'][event.nativeEvent.position])}>
      <View key="home" style={styles.pagerPage}><HomeScreen mood={mood} onMoodChange={setMood} habits={habits} history={history} onOpenComposer={() => setShowComposer(true)} onOpenHabits={() => setShowHabits(true)} onOpenInsights={() => setShowInsights(true)} onOpenProfile={() => openPrimaryTab('profile')} activeTab={activeTab} onTabChange={openPrimaryTab} /></View>
      <View key="diary" style={styles.pagerPage}><HistoryScreen records={createJournalHistoryViewModel(history)} loading={historyLoading} error={historyError} onDelete={removeRecord} onClose={() => openPrimaryTab('home')} activeTab={activeTab} onTabChange={openPrimaryTab} /></View>
      <View key="goals" style={styles.pagerPage}><GoalsScreen goals={goals} onAdd={addGoal} onProgress={setGoalProgress} onClose={() => openPrimaryTab('home')} activeTab={activeTab} onTabChange={openPrimaryTab} /></View>
      <View key="profile" style={styles.pagerPage}><ProfileScreen email={session.user.email} onSignOut={signOut} onClose={() => openPrimaryTab('home')} activeTab={activeTab} onTabChange={openPrimaryTab} /></View>
    </PagerView>
  );
}

function HomeScreen({ mood, onMoodChange, habits, history, onOpenComposer, onOpenHabits, onOpenInsights, onOpenProfile, activeTab, onTabChange }) {
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
      <View style={styles.homeHeader}>
        <View><Text style={styles.overline}>LIFEOS</Text><Text style={styles.homeTitle}>Добрый вечер</Text><Text style={styles.homeTitle}>Алексей</Text></View>
        <Pressable onPress={onOpenProfile} style={styles.avatar}><Text style={styles.avatarText}>А</Text></Pressable>
      </View>
      <View style={styles.checkInSurface}><Text style={styles.checkInTitle}>Как ты сейчас?</Text><MoodPicker mood={mood} onChange={onMoodChange} /><Pressable onPress={onOpenComposer} style={styles.homePrimaryButton}><Text style={styles.homePrimaryButtonText}>Поделиться мыслью</Text></Pressable></View>
      <Pressable onPress={onOpenHabits} style={styles.todayRow}><View style={styles.todayIcon}><Text style={styles.todayIconText}>✓</Text></View><View style={styles.flexGrow}><Text style={styles.todayTitle}>Сегодня</Text><Text style={styles.todayText}>Привычки · {habits.filter((habit) => habit.completedToday).length} из {habits.length || 1}</Text></View><Text style={styles.rowArrow}>›</Text></Pressable>
      <Pressable onPress={onOpenInsights} style={styles.insightSurface}><Text style={styles.insightEyebrow}>LIFEOS ЗАМЕТИЛ</Text><Text style={styles.insightText}>{history.length > 0 ? 'Твои записи уже начинают складываться в личную картину.' : 'Поделись первой мыслью — я помогу увидеть важное.'}</Text><Text style={styles.insightAction}>Посмотреть разбор  ›</Text></Pressable>
    </ScrollView>
    <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
  </SafeAreaView>;
}

function MoodPicker({ mood, onChange }) {
  const moods = ['Тяжело', 'Тревожно', 'Нейтрально', 'Хорошо', 'Отлично'];
  return <View style={styles.moodRow}>{moods.map((label, index) => <Pressable key={label} onPress={() => onChange(index + 1)} style={[styles.moodChoice, mood === index + 1 && styles.moodSelected]}><View style={[styles.moodDot, mood === index + 1 && styles.moodDotSelected]} /><Text style={[styles.moodLabel, mood === index + 1 && styles.moodLabelSelected]}>{label}</Text></Pressable>)}</View>;
}

function BottomNavigation({ activeTab, onTabChange }) {
  const { width } = useWindowDimensions();
  const tabs = [{ id: 'home', label: 'Главная' }, { id: 'diary', label: 'Дневник' }, { id: 'goals', label: 'Цели' }, { id: 'profile', label: 'Профиль' }];
  const itemWidth = (width - 32) / tabs.length;
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
  const indicatorX = useRef(new Animated.Value(activeIndex * itemWidth)).current;
  useEffect(() => {
    Animated.spring(indicatorX, { toValue: activeIndex * itemWidth, useNativeDriver: true, stiffness: 260, damping: 24, mass: 0.65 }).start();
  }, [activeIndex, itemWidth, indicatorX]);
  return <View style={styles.bottomNavigation}>
    <Animated.View pointerEvents="none" style={[styles.activeTabIndicator, { width: itemWidth, transform: [{ translateX: indicatorX }] }]} />
    {tabs.map((tab) => <Pressable key={tab.id} onPress={() => onTabChange(tab.id)} style={styles.bottomItem}><Text style={[styles.bottomLabel, activeTab === tab.id && styles.bottomLabelActive]}>{tab.label}</Text></Pressable>)}
  </View>;
}

function ComposerScreen({ mood, onMoodChange, thought, onThoughtChange, onClose, onSubmit, onToggleVoice, isRecording, voiceLoading, loading, error, activeTab, onTabChange }) {
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.composerContent} keyboardShouldPersistTaps="handled">
    <Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>‹ Назад</Text></Pressable>
    <Text style={styles.composerTitle}>Новая мысль</Text><Text style={styles.composerSubtitle}>Расскажи как есть — я помогу навести ясность.</Text>
    <MoodPicker mood={mood} onChange={onMoodChange} />
    <TextInput value={thought} onChangeText={onThoughtChange} multiline placeholder="Что сейчас у тебя в голове?" placeholderTextColor="#8994AA" style={styles.composerInput} />
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
      <TextInput value={name} onChangeText={setName} placeholder="Новая привычка" placeholderTextColor="#8591A8" style={styles.input} />
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
    <View style={styles.resultSection}><TextInput value={title} onChangeText={setTitle} placeholder="Новая цель" placeholderTextColor="#8591A8" style={styles.input} /><TextInput value={targetDate} onChangeText={setTargetDate} placeholder="Срок: ГГГГ-ММ-ДД (необязательно)" placeholderTextColor="#8591A8" style={styles.input} /><Pressable onPress={add} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Создать цель</Text></Pressable>{error && <Text style={styles.error}>{error}</Text>}</View>
    {goals.length === 0 ? <Text style={styles.body}>Добавь цель, к которой хочешь двигаться.</Text> : goals.map((goal) => <View key={goal.id} style={styles.resultSection}><Text style={styles.body}>{goal.title}</Text><Text style={styles.historyDate}>{goal.progress}%{goal.targetDate ? ` · до ${goal.targetDate}` : ''}</Text><Pressable disabled={goal.status === 'completed'} onPress={() => progress(goal)} style={[styles.primaryButton, goal.status === 'completed' && styles.disabledButton]}><Text style={styles.primaryButtonText}>{goal.status === 'completed' ? 'Цель выполнена' : '+10% прогресса'}</Text></Pressable></View>)}
  </ScrollView><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
}

function InsightsScreen({ insights, onClose, activeTab, onTabChange }) {
  return <SafeAreaView style={styles.screen}><View style={styles.flexGrow}><View style={styles.card}><Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable><Text style={styles.resultTitle}>Неделя</Text><Text style={styles.body}>Записей: {insights.journalCount}</Text><Text style={styles.body}>Среднее настроение: {insights.averageMood ?? 'пока нет данных'}/5</Text><Text style={styles.body}>Привычки сегодня: {insights.habitsCompleted}/{insights.habitsTotal}</Text><Text style={styles.body}>Активные цели: {insights.activeGoals}</Text><Text style={styles.body}>Выполненные цели: {insights.completedGoals}</Text></View></View><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
}

function ProfileScreen({ email, onSignOut, onClose, activeTab, onTabChange }) {
  return <SafeAreaView style={styles.screen}><View style={[styles.card, styles.flexGrow]}><Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable><Text style={styles.resultTitle}>Профиль</Text><Text style={styles.body}>{email}</Text><Text style={styles.body}>Твои записи, привычки и цели принадлежат только тебе.</Text><Pressable onPress={onSignOut} style={styles.voiceButton}><Text style={styles.voiceButtonText}>Выйти из аккаунта</Text></Pressable></View><BottomNavigation activeTab={activeTab} onTabChange={onTabChange} /></SafeAreaView>;
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
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email" placeholderTextColor="#8591A8" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Пароль (минимум 6 символов)" placeholderTextColor="#8591A8" style={styles.input} />
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
  pager: { flex: 1, backgroundColor: '#F7F8FC' },
  pagerPage: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#F7F8FC' },
  card: { gap: 14, padding: 24, margin: 24, borderRadius: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 28, fontWeight: '700', color: '#162033' },
  body: { fontSize: 17, lineHeight: 24, color: '#40506A' },
  section: { fontSize: 16, fontWeight: '600', color: '#162033', marginTop: 8 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodButton: { padding: 8, borderRadius: 12 },
  moodSelected: { backgroundColor: '#DDE9FF' },
  emoji: { fontSize: 24 },
  input: { minHeight: 96, borderWidth: 1, borderColor: '#D9E0EB', borderRadius: 14, padding: 14, fontSize: 16, textAlignVertical: 'top', color: '#162033' },
  primaryButton: { alignItems: 'center', backgroundColor: '#3563E9', borderRadius: 16, padding: 16 },
  disabledButton: { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  voiceButton: { alignItems: 'center', borderWidth: 1, borderColor: '#2563EB', borderRadius: 14, padding: 14 },
  voiceButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '700' },
  recordingButton: { borderColor: '#B42318', backgroundColor: '#FFF1F2' },
  recordingButtonText: { color: '#B42318' },
  recordingIndicator: { color: '#B42318', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  historyButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  historyButtonText: { color: '#2563EB', fontSize: 15, fontWeight: '600' },
  error: { color: '#B42318', fontSize: 14, lineHeight: 20 },
  info: { color: '#1E6A4E', fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 14, color: '#6B778C' },
  resultContent: { gap: 16, padding: 24, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8 },
  backButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  resultTitle: { color: '#162033', fontSize: 30, fontWeight: '700', marginBottom: 2 },
  resultSection: { gap: 10, padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF' },
  highlightedSection: { backgroundColor: '#EEF6FF', borderWidth: 1, borderColor: '#C9DDFE' },
  analysisTitle: { color: '#162033', fontSize: 14, fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emotionTag: { backgroundColor: '#FDECEF', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  topicTag: { backgroundColor: '#EAF5F0', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  tagText: { color: '#40506A', fontSize: 14, fontWeight: '600' },
  historyDate: { color: '#6B778C', fontSize: 14, fontWeight: '600' },
  deleteButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  deleteButtonText: { color: '#B42318', fontSize: 14, fontWeight: '600' },
  homeContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 128, gap: 18 },
  homeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  overline: { color: '#607092', fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 10 },
  homeTitle: { color: '#18233D', fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -0.8 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E9EEFC', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#3563E9', fontSize: 19, fontWeight: '800' },
  checkInSurface: { gap: 18, padding: 22, borderRadius: 24, backgroundColor: '#FFFFFF' },
  checkInTitle: { color: '#18233D', fontSize: 25, fontWeight: '800', letterSpacing: -0.4 },
  moodChoice: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 6, borderRadius: 16 },
  moodDot: { width: 24, height: 24, borderWidth: 2, borderColor: '#CBD4E5', borderRadius: 12, backgroundColor: '#FFFFFF' },
  moodDotSelected: { borderColor: '#3563E9', backgroundColor: '#DCE6FF' },
  moodLabel: { color: '#6E7A90', fontSize: 10, textAlign: 'center', fontWeight: '600' },
  moodLabelSelected: { color: '#3563E9' },
  homePrimaryButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 18, minHeight: 60, paddingHorizontal: 16, backgroundColor: '#3563E9' },
  homePrimaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, backgroundColor: '#FFFFFF' },
  todayIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5EF' },
  todayIconText: { color: '#2A9472', fontSize: 20, fontWeight: '800' },
  flexGrow: { flex: 1 },
  todayTitle: { color: '#18233D', fontSize: 17, fontWeight: '800', marginBottom: 3 },
  todayText: { color: '#758198', fontSize: 14 },
  rowArrow: { color: '#3563E9', fontSize: 28, lineHeight: 28 },
  insightSurface: { gap: 12, padding: 22, borderRadius: 24, backgroundColor: '#EEEFFF' },
  insightEyebrow: { color: '#5962D5', fontSize: 12, fontWeight: '800', letterSpacing: 1.1 },
  insightText: { color: '#18233D', fontSize: 21, lineHeight: 29, fontWeight: '700', letterSpacing: -0.3 },
  insightAction: { color: '#3563E9', fontSize: 16, fontWeight: '800', marginTop: 4 },
  bottomNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', minHeight: 68, marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E9EDF5', backgroundColor: '#FFFFFF' },
  bottomItem: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 56 },
  bottomLabel: { color: '#6F7B91', fontSize: 12, fontWeight: '700' },
  bottomLabelActive: { color: '#3563E9' },
  composerContent: { padding: 24, paddingBottom: 44, gap: 18 },
  composerTitle: { color: '#18233D', fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  composerSubtitle: { color: '#66738C', fontSize: 17, lineHeight: 25, marginBottom: 4 },
  composerInput: { minHeight: 260, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#DCE3F1', backgroundColor: '#FFFFFF', color: '#18233D', fontSize: 17, lineHeight: 25, textAlignVertical: 'top' },
  voiceCaptureButton: { alignItems: 'center', borderWidth: 1, borderColor: '#BFCBF3', borderRadius: 18, padding: 17, backgroundColor: '#F0F4FF' },
  voiceCaptureText: { color: '#3563E9', fontSize: 16, fontWeight: '800' },
  privacyNote: { color: '#7A869B', fontSize: 14, textAlign: 'center', marginTop: 4 },
});
