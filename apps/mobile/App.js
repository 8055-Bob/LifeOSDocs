import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createAnalysisResultViewModel } from './src/analysis-result-view-model.js';
import { analyzeDiaryThought, deleteDiaryRecord, fetchDiaryHistory } from './src/diary-api.js';
import { createJournalHistoryViewModel, prependJournalRecord } from './src/journal-history.js';
import { createDemoHomeState } from './src/mobile-ui-state.js';
import { refreshSession, signInWithEmail, signUpWithEmail } from './src/supabase-auth-api.js';
import { getSupabasePublicConfig } from './src/supabase-config.js';
import { secureSessionStore } from './src/secure-session-store.js';
import { completeHabit, createHabit, fetchHabits } from './src/supabase-habits-api.js';
import { createGoal, fetchGoals, updateGoalProgress } from './src/supabase-goals-api.js';
import { createWeeklyInsights } from './src/weekly-insights.js';
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { transcribeLocalAudio } from './src/local-transcription-api.js';

export default function App() {
  const home = createDemoHomeState();
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
  const [voiceLoading, setVoiceLoading] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [session, setSession] = useState(null);
  const [restoringSession, setRestoringSession] = useState(true);

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
      if (showHistory) { setShowHistory(false); return true; }
      if (showHabits) { setShowHabits(false); return true; }
      if (showGoals) { setShowGoals(false); return true; }
      if (showInsights) { setShowInsights(false); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [showResult, showHistory, showHabits, showGoals, showInsights]);

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

  if (showResult && analysis) {
    return <AnalysisScreen result={createAnalysisResultViewModel(analysis)} onClose={() => setShowResult(false)} />;
  }

  if (showHistory) {
    return <HistoryScreen records={createJournalHistoryViewModel(history)} loading={historyLoading} error={historyError} onDelete={removeRecord} onClose={() => setShowHistory(false)} />;
  }

  if (showHabits) {
    return <HabitsScreen habits={habits} onAdd={addHabit} onComplete={markHabitComplete} onClose={() => setShowHabits(false)} />;
  }

  if (showGoals) return <GoalsScreen goals={goals} onAdd={addGoal} onProgress={setGoalProgress} onClose={() => setShowGoals(false)} />;
  if (showInsights) return <InsightsScreen insights={createWeeklyInsights({ records: history, habits, goals })} onClose={() => setShowInsights(false)} />;
  if (showProfile) return <ProfileScreen email={session.user.email} onSignOut={signOut} onClose={() => setShowProfile(false)} />;

  if (restoringSession) {
    return <SafeAreaView style={styles.screen}><Text style={styles.body}>Загружаем LifeOS…</Text></SafeAreaView>;
  }

  if (!session) {
    return <AuthScreen onAuthenticated={setSession} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{home.greeting}</Text>
        <Text style={styles.body}>{home.recommendation}</Text>
        <Pressable onPress={() => setShowHistory(true)} style={styles.historyButton}>
          <Text style={styles.historyButtonText}>История записей ({history.length})</Text>
        </Pressable>
        <Pressable onPress={() => setShowHabits(true)} style={styles.historyButton}>
          <Text style={styles.historyButtonText}>Привычки ({habits.filter((habit) => habit.completedToday).length}/{habits.length})</Text>
        </Pressable>
        <Pressable onPress={() => setShowGoals(true)} style={styles.historyButton}><Text style={styles.historyButtonText}>Цели ({goals.filter((goal) => goal.status === 'active').length})</Text></Pressable>
        <Pressable onPress={() => setShowInsights(true)} style={styles.historyButton}><Text style={styles.historyButtonText}>Аналитика недели</Text></Pressable>
        <Pressable onPress={() => setShowProfile(true)} style={styles.historyButton}><Text style={styles.historyButtonText}>Профиль и данные</Text></Pressable>
        <Text style={styles.section}>Как ты себя чувствуешь?</Text>
        <View style={styles.moodRow}>
          {['😔', '😕', '😐', '🙂', '😄'].map((emoji, index) => (
            <Pressable key={emoji} onPress={() => setMood(index + 1)} style={[styles.moodButton, mood === index + 1 && styles.moodSelected]}>
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={thought}
          onChangeText={setThought}
          multiline
          placeholder="Что сейчас у тебя в голове?"
          placeholderTextColor="#8591A8"
          style={styles.input}
        />
        {recorderState.isRecording && <Text style={styles.recordingIndicator}>● Идёт запись — говорите</Text>}
        <Pressable disabled={voiceLoading} onPress={toggleVoiceRecording} style={[styles.voiceButton, recorderState.isRecording && styles.recordingButton, voiceLoading && styles.disabledButton]}>
          <Text style={[styles.voiceButtonText, recorderState.isRecording && styles.recordingButtonText]}>{voiceLoading ? 'Расшифровываем…' : recorderState.isRecording ? '■ Остановить запись' : '🎙 Записать голосом'}</Text>
        </Pressable>
        <Pressable disabled={loading} onPress={submitThought} style={[styles.primaryButton, loading && styles.disabledButton]}>
          <Text style={styles.primaryButtonText}>{loading ? 'Анализируем…' : 'Поделиться мыслью'}</Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.meta}>Привычки сегодня: {home.habits.completedCount}/{home.habits.totalCount}</Text>
      </View>
    </SafeAreaView>
  );
}

function HabitsScreen({ habits, onAdd, onComplete, onClose }) {
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
  </ScrollView></SafeAreaView>;
}

function GoalsScreen({ goals, onAdd, onProgress, onClose }) {
  const [title, setTitle] = useState(''); const [targetDate, setTargetDate] = useState(''); const [error, setError] = useState(null);
  async function add() { try { await onAdd(title, targetDate); setTitle(''); setTargetDate(''); setError(null); } catch (reason) { setError(reason.message); } }
  async function progress(goal) { try { await onProgress(goal.id, Math.min(100, goal.progress + 10)); setError(null); } catch (reason) { setError(reason.message); } }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.resultContent}>
    <Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable><Text style={styles.resultTitle}>Цели</Text>
    <View style={styles.resultSection}><TextInput value={title} onChangeText={setTitle} placeholder="Новая цель" placeholderTextColor="#8591A8" style={styles.input} /><TextInput value={targetDate} onChangeText={setTargetDate} placeholder="Срок: ГГГГ-ММ-ДД (необязательно)" placeholderTextColor="#8591A8" style={styles.input} /><Pressable onPress={add} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Создать цель</Text></Pressable>{error && <Text style={styles.error}>{error}</Text>}</View>
    {goals.length === 0 ? <Text style={styles.body}>Добавь цель, к которой хочешь двигаться.</Text> : goals.map((goal) => <View key={goal.id} style={styles.resultSection}><Text style={styles.body}>{goal.title}</Text><Text style={styles.historyDate}>{goal.progress}%{goal.targetDate ? ` · до ${goal.targetDate}` : ''}</Text><Pressable disabled={goal.status === 'completed'} onPress={() => progress(goal)} style={[styles.primaryButton, goal.status === 'completed' && styles.disabledButton]}><Text style={styles.primaryButtonText}>{goal.status === 'completed' ? 'Цель выполнена' : '+10% прогресса'}</Text></Pressable></View>)}
  </ScrollView></SafeAreaView>;
}

function InsightsScreen({ insights, onClose }) {
  return <SafeAreaView style={styles.screen}><View style={styles.card}><Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable><Text style={styles.resultTitle}>Неделя</Text><Text style={styles.body}>Записей: {insights.journalCount}</Text><Text style={styles.body}>Среднее настроение: {insights.averageMood ?? 'пока нет данных'}/5</Text><Text style={styles.body}>Привычки сегодня: {insights.habitsCompleted}/{insights.habitsTotal}</Text><Text style={styles.body}>Активные цели: {insights.activeGoals}</Text><Text style={styles.body}>Выполненные цели: {insights.completedGoals}</Text></View></SafeAreaView>;
}

function ProfileScreen({ email, onSignOut, onClose }) {
  return <SafeAreaView style={styles.screen}><View style={styles.card}><Pressable onPress={onClose} style={styles.backButton}><Text style={styles.backButtonText}>← На главную</Text></Pressable><Text style={styles.resultTitle}>Профиль</Text><Text style={styles.body}>{email}</Text><Text style={styles.body}>Твои записи, привычки и цели принадлежат только тебе.</Text><Pressable onPress={onSignOut} style={styles.voiceButton}><Text style={styles.voiceButtonText}>Выйти из аккаунта</Text></Pressable></View></SafeAreaView>;
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

function AnalysisScreen({ result, onClose }) {
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
    </SafeAreaView>
  );
}

function ResultSection({ title, children, highlighted = false }) {
  return <View style={[styles.resultSection, highlighted && styles.highlightedSection]}><Text style={styles.analysisTitle}>{title}</Text>{children}</View>;
}

function HistoryScreen({ records, loading, error, onDelete, onClose }) {
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F5F7FA' },
  card: { gap: 14, padding: 24, borderRadius: 20, backgroundColor: '#FFFFFF' },
  title: { fontSize: 28, fontWeight: '700', color: '#162033' },
  body: { fontSize: 17, lineHeight: 24, color: '#40506A' },
  section: { fontSize: 16, fontWeight: '600', color: '#162033', marginTop: 8 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodButton: { padding: 8, borderRadius: 12 },
  moodSelected: { backgroundColor: '#DDE9FF' },
  emoji: { fontSize: 24 },
  input: { minHeight: 96, borderWidth: 1, borderColor: '#D9E0EB', borderRadius: 14, padding: 14, fontSize: 16, textAlignVertical: 'top', color: '#162033' },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 14, padding: 15 },
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
});
