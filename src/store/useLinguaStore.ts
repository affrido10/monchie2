import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Language {
  code: string;
  name: string;
  flag: string;
  color: string;
}

export const LANGUAGES: Language[] = [
  { code: 'fr', name: 'Французский', flag: '🇫🇷', color: '#3b82f6' },
  { code: 'es', name: 'Испанский', flag: '🇪🇸', color: '#ef4444' },
  { code: 'de', name: 'Немецкий', flag: '🇩🇪', color: '#f59e0b' },
  { code: 'it', name: 'Итальянский', flag: '🇮🇹', color: '#10b981' },
  { code: 'en', name: 'Английский', flag: '🇬🇧', color: '#8b5cf6' },
  { code: 'ja', name: 'Японский', flag: '🇯🇵', color: '#ec4899' },
  { code: 'zh', name: 'Китайский', flag: '🇨🇳', color: '#f97316' },
  { code: 'pt', name: 'Португальский', flag: '🇧🇷', color: '#14b8a6' },
  { code: 'ar', name: 'Арабский', flag: '🇸🇦', color: '#84cc16' },
  { code: 'ko', name: 'Корейский', flag: '🇰🇷', color: '#06b6d4' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', color: '#a78bfa' },
  { code: 'custom', name: 'Другой...', flag: '🌐', color: '#9ca3af' },
];

export type ActivityType =
  | 'grammar' | 'vocabulary' | 'reading' | 'listening'
  | 'speaking' | 'writing' | 'series' | 'music'
  | 'duolingo' | 'anki' | 'immersion' | 'tutor'
  | 'sport' | 'work' | 'books' | 'coding' | 'meditation'
  | 'walking' | 'cooking' | 'drawing' | 'other';

export interface Activity {
  id: ActivityType;
  label: string;
  icon: string;
  xpPerMin: number;
  color: string;
  category: 'language' | 'life';
}

export const ACTIVITIES: Activity[] = [
  // Language
  { id: 'grammar',    label: 'Грамматика',        icon: '📐', xpPerMin: 2,   color: '#3b82f6', category: 'language' },
  { id: 'vocabulary', label: 'Словарный запас',    icon: '📚', xpPerMin: 2,   color: '#8b5cf6', category: 'language' },
  { id: 'reading',    label: 'Чтение',             icon: '📖', xpPerMin: 2,   color: '#10b981', category: 'language' },
  { id: 'listening',  label: 'Аудирование',        icon: '🎧', xpPerMin: 2.5, color: '#f59e0b', category: 'language' },
  { id: 'speaking',   label: 'Разговор',           icon: '🗣️', xpPerMin: 3,   color: '#ef4444', category: 'language' },
  { id: 'writing',    label: 'Письмо',             icon: '✍️', xpPerMin: 2.5, color: '#ec4899', category: 'language' },
  { id: 'series',     label: 'Сериал / фильм',     icon: '🎬', xpPerMin: 1.5, color: '#f97316', category: 'language' },
  { id: 'music',      label: 'Музыка',             icon: '🎵', xpPerMin: 1,   color: '#14b8a6', category: 'language' },
  { id: 'duolingo',   label: 'Duolingo',           icon: '🦉', xpPerMin: 1.5, color: '#84cc16', category: 'language' },
  { id: 'anki',       label: 'Anki / карточки',    icon: '🃏', xpPerMin: 2,   color: '#06b6d4', category: 'language' },
  { id: 'immersion',  label: 'Погружение',         icon: '🌊', xpPerMin: 2,   color: '#a78bfa', category: 'language' },
  { id: 'tutor',      label: 'Урок с репетитором', icon: '👨‍🏫', xpPerMin: 4,   color: '#fbbf24', category: 'language' },
  // Life
  { id: 'sport',      label: 'Спорт / тренировка', icon: '💪', xpPerMin: 3,   color: '#ef4444', category: 'life' },
  { id: 'work',       label: 'Работа / учёба',     icon: '💼', xpPerMin: 2,   color: '#6366f1', category: 'life' },
  { id: 'books',      label: 'Чтение книг',        icon: '📕', xpPerMin: 2,   color: '#10b981', category: 'life' },
  { id: 'coding',     label: 'Программирование',   icon: '💻', xpPerMin: 3,   color: '#3b82f6', category: 'life' },
  { id: 'meditation', label: 'Медитация',          icon: '🧘', xpPerMin: 2,   color: '#8b5cf6', category: 'life' },
  { id: 'walking',    label: 'Прогулка',           icon: '🚶', xpPerMin: 1,   color: '#84cc16', category: 'life' },
  { id: 'cooking',    label: 'Готовка',            icon: '🍳', xpPerMin: 1.5, color: '#f97316', category: 'life' },
  { id: 'drawing',    label: 'Рисование',          icon: '🎨', xpPerMin: 2,   color: '#ec4899', category: 'life' },
  { id: 'other',      label: 'Другое',             icon: '✨', xpPerMin: 1.5, color: '#9ca3af', category: 'life' },
];

export type Mood = 1 | 2 | 3 | 4 | 5;

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 1, emoji: '😩', label: 'Очень плохо' },
  { value: 2, emoji: '😕', label: 'Плохо' },
  { value: 3, emoji: '😐', label: 'Нейтрально' },
  { value: 4, emoji: '😊', label: 'Хорошо' },
  { value: 5, emoji: '🔥', label: 'Отлично!' },
];

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  languageCode: string;
  customLanguage?: string;
  activityType: ActivityType;
  durationMinutes: number;
  mood: Mood;
  notes: string;
  xp: number;
  createdAt: string;
}

export type AppTab = 'calendar' | 'stats' | 'sessions' | 'settings';

const today = () => new Date().toISOString().split('T')[0];
const calcXP = (activity: ActivityType, duration: number) => {
  const act = ACTIVITIES.find((a) => a.id === activity);
  return Math.round((act?.xpPerMin ?? 1.5) * duration);
};

interface LinguaState {
  sessions: Session[];
  activeTab: AppTab;
  selectedDate: string;
  selectedLanguageFilter: string | null;

  formOpen: boolean;
  editingSession: Session | null;
  formDate: string;
  formLanguage: string;
  formCustomLanguage: string;
  formActivity: ActivityType;
  formDuration: number;
  formMood: Mood;
  formNotes: string;

  // Supabase
  syncing: boolean;
  synced: boolean;
  loadFromSupabase: () => Promise<void>;
  syncToSupabase: (session: Session) => Promise<void>;
  deleteFromSupabase: (id: string) => Promise<void>;

  setTab: (tab: AppTab) => void;
  setSelectedDate: (date: string) => void;
  setLanguageFilter: (lang: string | null) => void;
  openForm: (date?: string, session?: Session) => void;
  closeForm: () => void;
  setFormField: (field: string, value: unknown) => void;
  submitForm: () => void;
  deleteSession: (id: string) => void;

  getSessionsForDate: (date: string) => Session[];
  getTotalMinutesForDate: (date: string) => number;
  getCurrentStreak: () => number;
  getLongestStreak: () => number;
  getTotalXP: () => number;
  getTotalMinutes: () => number;
  getTotalDays: () => number;
  getXPByLanguage: () => Record<string, number>;
  getMinutesByActivity: () => Record<string, number>;
}

export const useLinguaStore = create<LinguaState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeTab: 'calendar',
      selectedDate: today(),
      selectedLanguageFilter: null,

      formOpen: false,
      editingSession: null,
      formDate: today(),
      formLanguage: 'fr',
      formCustomLanguage: '',
      formActivity: 'vocabulary',
      formDuration: 30,
      formMood: 3,
      formNotes: '',

      syncing: false,
      synced: false,

      // ── Supabase ────────────────────────────────────────────
      loadFromSupabase: async () => {
        if (!isSupabaseConfigured) return;
        set({ syncing: true });
        try {
          const { data, error } = await supabase
            .from('diary_sessions')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (data && data.length > 0) {
            const sessions: Session[] = data.map(r => ({
              id: r.id,
              date: r.date,
              languageCode: r.language_code,
              customLanguage: r.custom_language || undefined,
              activityType: r.activity_type as ActivityType,
              durationMinutes: r.duration_minutes,
              mood: r.mood as Mood,
              notes: r.notes || '',
              xp: r.xp,
              createdAt: r.created_at,
            }));
            set({ sessions, synced: true });
          }
        } catch (e) {
          console.warn('Supabase load error:', e);
        } finally {
          set({ syncing: false });
        }
      },

      syncToSupabase: async (session: Session) => {
        if (!isSupabaseConfigured) return;
        try {
          await supabase.from('diary_sessions').upsert({
            id: session.id,
            date: session.date,
            language_code: session.languageCode,
            custom_language: session.customLanguage || null,
            activity_type: session.activityType,
            duration_minutes: session.durationMinutes,
            mood: session.mood,
            notes: session.notes,
            xp: session.xp,
            created_at: session.createdAt,
          });
        } catch (e) {
          console.warn('Supabase sync error:', e);
        }
      },

      deleteFromSupabase: async (id: string) => {
        if (!isSupabaseConfigured) return;
        try {
          await supabase.from('diary_sessions').delete().eq('id', id);
        } catch (e) {
          console.warn('Supabase delete error:', e);
        }
      },

      // ── Actions ─────────────────────────────────────────────
      setTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setLanguageFilter: (lang) => set({ selectedLanguageFilter: lang }),

      openForm: (date, session) => {
        if (session) {
          set({
            formOpen: true,
            editingSession: session,
            formDate: session.date,
            formLanguage: session.languageCode,
            formCustomLanguage: session.customLanguage || '',
            formActivity: session.activityType,
            formDuration: session.durationMinutes,
            formMood: session.mood,
            formNotes: session.notes,
          });
        } else {
          set({
            formOpen: true,
            editingSession: null,
            formDate: date ?? today(),
            formLanguage: 'fr',
            formCustomLanguage: '',
            formActivity: 'vocabulary',
            formDuration: 30,
            formMood: 3,
            formNotes: '',
          });
        }
      },

      closeForm: () => set({ formOpen: false, editingSession: null }),
      setFormField: (field, value) => set((s) => ({ ...s, [field]: value })),

      submitForm: () => {
        const s = get();
        const xp = calcXP(s.formActivity, s.formDuration);

        if (s.editingSession) {
          const updated: Session = {
            ...s.editingSession,
            date: s.formDate,
            languageCode: s.formLanguage,
            customLanguage: s.formLanguage === 'custom' ? s.formCustomLanguage : undefined,
            activityType: s.formActivity,
            durationMinutes: s.formDuration,
            mood: s.formMood,
            notes: s.formNotes,
            xp,
          };
          set((state) => ({
            sessions: state.sessions.map((sess) => sess.id === updated.id ? updated : sess),
            formOpen: false,
            editingSession: null,
          }));
          get().syncToSupabase(updated);
        } else {
          const newSession: Session = {
            id: uuidv4(),
            date: s.formDate,
            languageCode: s.formLanguage,
            customLanguage: s.formLanguage === 'custom' ? s.formCustomLanguage : undefined,
            activityType: s.formActivity,
            durationMinutes: s.formDuration,
            mood: s.formMood,
            notes: s.formNotes,
            xp,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            sessions: [newSession, ...state.sessions],
            formOpen: false,
          }));
          get().syncToSupabase(newSession);
        }
      },

      deleteSession: (id) => {
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) }));
        get().deleteFromSupabase(id);
      },

      getSessionsForDate: (date) => get().sessions.filter((s) => s.date === date),
      getTotalMinutesForDate: (date) =>
        get().sessions.filter((s) => s.date === date).reduce((acc, s) => acc + s.durationMinutes, 0),

      getCurrentStreak: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) return 0;
        const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
        const todayStr = today();
        let streak = 0;
        let current = todayStr;
        for (const date of dates) {
          if (date === current) {
            streak++;
            const d = new Date(current);
            d.setDate(d.getDate() - 1);
            current = d.toISOString().split('T')[0];
          } else if (date < current) break;
        }
        return streak;
      },

      getLongestStreak: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) return 0;
        const dates = [...new Set(sessions.map((s) => s.date))].sort();
        let maxStreak = 1, currentStreak = 1;
        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1]);
          const curr = new Date(dates[i]);
          const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
          else currentStreak = 1;
        }
        return maxStreak;
      },

      getTotalXP: () => get().sessions.reduce((acc, s) => acc + s.xp, 0),
      getTotalMinutes: () => get().sessions.reduce((acc, s) => acc + s.durationMinutes, 0),
      getTotalDays: () => new Set(get().sessions.map((s) => s.date)).size,

      getXPByLanguage: () => {
        const result: Record<string, number> = {};
        for (const s of get().sessions) {
          const key = s.languageCode === 'custom' ? (s.customLanguage || 'Другой') : s.languageCode;
          result[key] = (result[key] ?? 0) + s.xp;
        }
        return result;
      },

      getMinutesByActivity: () => {
        const result: Record<string, number> = {};
        for (const s of get().sessions) {
          result[s.activityType] = (result[s.activityType] ?? 0) + s.durationMinutes;
        }
        return result;
      },
    }),
    { name: 'lingua-track-v2' }
  )
);
