import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, Clock, Flame,
  Trophy, Target, X, Check, Trash2, Edit3, Calendar,
  TrendingUp, Zap, Globe,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek,
  differenceInCalendarDays, parseISO, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface LangSession {
  id: string;
  date: string; // ISO yyyy-MM-dd
  language: string;
  activityType: string;
  customActivity?: string;
  duration: number; // minutes
  notes: string;
  xp: number;
  mood: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}

const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', color: '#4a90d9' },
  { code: 'es', name: 'Español', flag: '🇪🇸', color: '#e85d4a' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', color: '#f5a623' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', color: '#7ed321' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', color: '#bd10e0' },
  { code: 'zh', name: '中文', flag: '🇨🇳', color: '#e74c3c' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', color: '#2ecc71' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', color: '#f39c12' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', color: '#3498db' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', color: '#9b59b6' },
  { code: 'en', name: 'English', flag: '🇬🇧', color: '#1abc9c' },
  { code: 'other', name: 'Другой', flag: '🌐', color: '#95a5a6' },
];

const ACTIVITY_TYPES = [
  { id: 'grammar',    label: 'Грамматика',    emoji: '📝', xpPerMin: 2 },
  { id: 'vocab',      label: 'Словарный запас', emoji: '📚', xpPerMin: 2 },
  { id: 'reading',    label: 'Чтение',          emoji: '📖', xpPerMin: 1.5 },
  { id: 'listening',  label: 'Аудирование',     emoji: '🎧', xpPerMin: 2 },
  { id: 'speaking',   label: 'Разговор',         emoji: '🗣️', xpPerMin: 3 },
  { id: 'writing',    label: 'Письмо',           emoji: '✍️', xpPerMin: 2.5 },
  { id: 'watching',   label: 'Сериал/фильм',    emoji: '🎬', xpPerMin: 1 },
  { id: 'music',      label: 'Музыка/песни',    emoji: '🎵', xpPerMin: 1 },
  { id: 'duolingo',   label: 'Duolingo',         emoji: '🦉', xpPerMin: 1.5 },
  { id: 'anki',       label: 'Anki карточки',   emoji: '🃏', xpPerMin: 2.5 },
  { id: 'immersion',  label: 'Погружение',       emoji: '🌊', xpPerMin: 1.5 },
  { id: 'tutor',      label: 'Урок с репетитором', emoji: '👨‍🏫', xpPerMin: 4 },
  { id: 'other',      label: 'Другое',           emoji: '✨', xpPerMin: 1.5 },
];

const MOOD_LABELS = ['😩', '😕', '😐', '😊', '🔥'];
const MOOD_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#c9a84c'];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ── Storage helpers ────────────────────────────────────────────────────────────
const STORAGE_KEY = 'vault_lang_sessions';

function loadSessions(): LangSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: LangSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// ── Heatmap color ──────────────────────────────────────────────────────────────
function heatmapColor(minutes: number): string {
  if (minutes === 0) return 'rgba(255,255,255,0.04)';
  if (minutes < 10)  return 'rgba(201,168,76,0.12)';
  if (minutes < 20)  return 'rgba(201,168,76,0.28)';
  if (minutes < 40)  return 'rgba(201,168,76,0.5)';
  if (minutes < 60)  return 'rgba(201,168,76,0.72)';
  return 'rgba(201,168,76,0.95)';
}

// ── Session Form Modal ─────────────────────────────────────────────────────────
function SessionForm({
  initialDate,
  editSession,
  onSave,
  onClose,
}: {
  initialDate: string;
  editSession?: LangSession;
  onSave: (s: LangSession) => void;
  onClose: () => void;
}) {
  const [language, setLanguage] = useState(editSession?.language ?? LANGUAGES[0].code);
  const [activityType, setActivityType] = useState(editSession?.activityType ?? ACTIVITY_TYPES[0].id);
  const [customActivity, setCustomActivity] = useState(editSession?.customActivity ?? '');
  const [duration, setDuration] = useState(editSession?.duration ?? 30);
  const [notes, setNotes] = useState(editSession?.notes ?? '');
  const [mood, setMood] = useState<1|2|3|4|5>(editSession?.mood ?? 3);
  const [date, setDate] = useState(editSession?.date ?? initialDate);

  const activity = ACTIVITY_TYPES.find(a => a.id === activityType)!;
  const xp = Math.round(duration * activity.xpPerMin);

  const handleSave = () => {
    const session: LangSession = {
      id: editSession?.id ?? `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date,
      language,
      activityType,
      customActivity: activityType === 'other' ? customActivity : undefined,
      duration,
      notes,
      xp,
      mood,
      createdAt: editSession?.createdAt ?? new Date().toISOString(),
    };
    onSave(session);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin"
        style={{ border: '1px solid rgba(201,168,76,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="heading-display text-sm tracking-widest gold-text">
              {editSession ? 'РЕДАКТИРОВАТЬ' : 'НОВАЯ СЕССИЯ'}
            </h2>
            <p className="font-sans text-xs text-stone-600 mt-0.5">
              Запиши свои занятия языком
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Date */}
          <div>
            <label className="block font-sans text-xs text-stone-500 uppercase tracking-wider mb-2">Дата</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="atheneum-input font-sans text-sm"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Language */}
          <div>
            <label className="block font-sans text-xs text-stone-500 uppercase tracking-wider mb-2">Язык</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-center"
                  style={{
                    background: language === l.code ? `${l.color}18` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${language === l.code ? `${l.color}50` : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: language === l.code ? `0 0 16px ${l.color}20` : 'none',
                  }}
                >
                  <span className="text-lg">{l.flag}</span>
                  <span className="font-sans text-[10px]" style={{ color: language === l.code ? l.color : '#6b7280' }}>
                    {l.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div>
            <label className="block font-sans text-xs text-stone-500 uppercase tracking-wider mb-2">Тип активности</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map(a => (
                <button
                  key={a.id}
                  onClick={() => setActivityType(a.id)}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: activityType === a.id ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${activityType === a.id ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span className="text-base flex-shrink-0">{a.emoji}</span>
                  <span className="font-sans text-xs" style={{ color: activityType === a.id ? '#d4aa55' : '#6b7280' }}>
                    {a.label}
                  </span>
                </button>
              ))}
            </div>
            {activityType === 'other' && (
              <input
                value={customActivity}
                onChange={e => setCustomActivity(e.target.value)}
                placeholder="Что именно делал(а)?"
                className="atheneum-input font-sans text-sm mt-2"
              />
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block font-sans text-xs text-stone-500 uppercase tracking-wider mb-2">
              Длительность: <span style={{ color: '#c9a84c' }}>{duration} мин</span>
            </label>
            <input
              type="range" min={5} max={300} step={5}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full accent-yellow-600"
            />
            <div className="flex justify-between font-mono text-[10px] text-stone-700 mt-1">
              <span>5 мин</span>
              <span>1 ч</span>
              <span>2 ч</span>
              <span>5 ч</span>
            </div>
            {/* Quick presets */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[10, 15, 20, 30, 45, 60, 90, 120].map(d => (
                <button key={d}
                  onClick={() => setDuration(d)}
                  className="px-2.5 py-1 rounded-lg font-mono text-xs transition-all"
                  style={{
                    background: duration === d ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${duration === d ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)'}`,
                    color: duration === d ? '#c9a84c' : '#6b7280',
                  }}
                >
                  {d < 60 ? `${d}м` : `${d/60}ч`}
                </button>
              ))}
            </div>
          </div>

          {/* XP preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
            <Zap className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <span className="font-sans text-sm text-stone-400">
              Ты заработаешь{' '}
              <span className="font-bold" style={{ color: '#c9a84c' }}>{xp} XP</span>
              {' '}за эту сессию
            </span>
          </div>

          {/* Mood */}
          <div>
            <label className="block font-sans text-xs text-stone-500 uppercase tracking-wider mb-2">
              Настроение / продуктивность
            </label>
            <div className="flex gap-3 justify-center">
              {MOOD_LABELS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setMood((i + 1) as 1|2|3|4|5)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                  style={{
                    background: mood === i + 1 ? `${MOOD_COLORS[i]}15` : 'transparent',
                    border: `1px solid ${mood === i + 1 ? `${MOOD_COLORS[i]}40` : 'transparent'}`,
                    transform: mood === i + 1 ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  <span className="text-2xl">{emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-sans text-xs text-stone-500 uppercase tracking-wider mb-2">
              Заметки (что изучил, что понял, трудности)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Выучил спряжение глагола avoir... Понял разницу между passé composé и imparfait..."
              rows={3}
              className="atheneum-input font-sans text-sm resize-none"
            />
          </div>

          {/* Save */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-sans text-sm btn-ghost"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              Отмена
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-sans text-sm btn-gold font-medium"
            >
              <Check className="w-4 h-4" />
              {editSession ? 'Сохранить' : 'Добавить сессию'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Day Detail Panel ───────────────────────────────────────────────────────────
function DayDetail({
  date,
  sessions,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: {
  date: Date;
  sessions: LangSession[];
  onAdd: () => void;
  onEdit: (s: LangSession) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const totalMin = sessions.reduce((s, x) => s + x.duration, 0);
  const totalXP  = sessions.reduce((s, x) => s + x.xp, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full overflow-hidden"
      style={{ borderLeft: '1px solid rgba(201,168,76,0.1)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
        <div>
          <div className="heading-display text-xs tracking-widest"
            style={{ color: isToday(date) ? '#c9a84c' : '#6b7280' }}>
            {isToday(date) ? 'СЕГОДНЯ' : format(date, 'EEEE', { locale: ru }).toUpperCase()}
          </div>
          <div className="font-serif italic text-stone-300 text-sm">
            {format(date, 'd MMMM yyyy', { locale: ru })}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg btn-ghost md:hidden">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 gap-2 p-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="p-2 rounded-xl text-center"
            style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.12)' }}>
            <div className="font-mono text-lg font-bold" style={{ color: '#c9a84c' }}>
              {totalMin < 60 ? `${totalMin}м` : `${Math.floor(totalMin/60)}ч ${totalMin%60}м`}
            </div>
            <div className="font-sans text-[10px] text-stone-600 mt-0.5">Всего времени</div>
          </div>
          <div className="p-2 rounded-xl text-center"
            style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.12)' }}>
            <div className="font-mono text-lg font-bold" style={{ color: '#c9a84c' }}>
              +{totalXP} XP
            </div>
            <div className="font-sans text-[10px] text-stone-600 mt-0.5">Опыт получен</div>
          </div>
        </div>
      )}

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {sessions.length === 0 && (
          <div className="text-center py-10">
            <div className="text-3xl mb-3">📅</div>
            <p className="font-serif italic text-xs text-stone-600">
              Нет занятий в этот день
            </p>
          </div>
        )}
        <AnimatePresence>
          {sessions.map((s, i) => {
            const lang = LANGUAGES.find(l => l.code === s.language)!;
            const act  = ACTIVITY_TYPES.find(a => a.id === s.activityType)!;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl group relative"
                style={{ background: 'rgba(14,12,32,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                {/* Lang + activity header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{lang?.flag}</span>
                    <span className="font-sans text-xs font-medium" style={{ color: lang?.color }}>
                      {lang?.name}
                    </span>
                    <span className="text-sm">{act?.emoji}</span>
                    <span className="font-sans text-xs text-stone-500">
                      {s.activityType === 'other' ? s.customActivity : act?.label}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(s)}
                      className="p-1 rounded-lg btn-ghost"><Edit3 className="w-3 h-3" /></button>
                    <button onClick={() => onDelete(s.id)}
                      className="p-1 rounded-lg btn-ghost hover:text-red-500/70"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>

                {/* Duration + XP + mood */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-mono text-stone-400">
                    <Clock className="w-3 h-3" />
                    {s.duration < 60 ? `${s.duration}м` : `${Math.floor(s.duration/60)}ч ${s.duration%60}м`}
                  </span>
                  <span className="font-mono" style={{ color: '#c9a84c' }}>+{s.xp} XP</span>
                  <span className="text-sm">{MOOD_LABELS[s.mood - 1]}</span>
                </div>

                {/* Notes */}
                {s.notes && (
                  <p className="mt-2 font-sans text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {s.notes}
                  </p>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add button */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-sans text-sm btn-gold"
        >
          <Plus className="w-4 h-4" />
          Добавить занятие
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main Language Calendar ─────────────────────────────────────────────────────
export default function LanguageCalendar() {
  const [sessions, setSessions] = useState<LangSession[]>(loadSessions);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState<LangSession | undefined>();
  const [filterLang, setFilterLang] = useState<string | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats'>('calendar');

  // Persist
  const updateSessions = (fn: (prev: LangSession[]) => LangSession[]) => {
    setSessions(prev => {
      const next = fn(prev);
      saveSessions(next);
      return next;
    });
  };

  const addSession = (s: LangSession) => {
    updateSessions(prev => {
      const exists = prev.find(x => x.id === s.id);
      if (exists) return prev.map(x => x.id === s.id ? s : x);
      return [s, ...prev];
    });
    setShowForm(false);
    setEditSession(undefined);
  };

  const deleteSession = (id: string) => {
    updateSessions(prev => prev.filter(x => x.id !== id));
  };

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 1 });
  const calDays    = eachDayOfInterval({ start: calStart, end: calEnd });

  // Sessions by date
  const sessionsByDate = useMemo(() => {
    const map: Record<string, LangSession[]> = {};
    sessions.forEach(s => {
      const filtered = filterLang ? s.language === filterLang : true;
      if (!filtered) return;
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions, filterLang]);

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedSessions = sessionsByDate[selectedDateKey] ?? [];

  // Stats
  const stats = useMemo(() => {
    const filtered = filterLang ? sessions.filter(s => s.language === filterLang) : sessions;
    const totalMin = filtered.reduce((s, x) => s + x.duration, 0);
    const totalXP  = filtered.reduce((s, x) => s + x.xp, 0);
    const totalDays = new Set(filtered.map(s => s.date)).size;

    // Streak
    let streak = 0;
    let d = new Date();
    while (true) {
      const key = format(d, 'yyyy-MM-dd');
      if (!sessionsByDate[key]) break;
      streak++;
      d = new Date(d.getTime() - 86400000);
    }

    // Longest streak
    const allDates = [...new Set(filtered.map(s => s.date))].sort();
    let longestStreak = 0, cur = 0;
    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) { cur = 1; continue; }
      const prev = parseISO(allDates[i - 1]);
      const curr = parseISO(allDates[i]);
      if (differenceInCalendarDays(curr, prev) === 1) {
        cur++;
      } else {
        longestStreak = Math.max(longestStreak, cur);
        cur = 1;
      }
    }
    longestStreak = Math.max(longestStreak, cur);

    // By language
    const byLang: Record<string, number> = {};
    filtered.forEach(s => { byLang[s.language] = (byLang[s.language] ?? 0) + s.duration; });

    // By activity
    const byActivity: Record<string, number> = {};
    filtered.forEach(s => { byActivity[s.activityType] = (byActivity[s.activityType] ?? 0) + s.duration; });

    // This month
    const thisMonth = filtered.filter(s => s.date.startsWith(format(currentMonth, 'yyyy-MM')));
    const monthMin  = thisMonth.reduce((s, x) => s + x.duration, 0);

    return { totalMin, totalXP, totalDays, streak, longestStreak, byLang, byActivity, monthMin };
  }, [sessions, filterLang, sessionsByDate, currentMonth]);

  const usedLanguages = useMemo(() => {
    const codes = [...new Set(sessions.map(s => s.language))];
    return LANGUAGES.filter(l => codes.includes(l.code));
  }, [sessions]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <div>
          <div className="ornament">
            <span className="heading-display text-xs tracking-[0.2em] text-yellow-700/60">ЯЗЫКОВОЙ ТРЕКЕР</span>
          </div>
          <p className="font-serif italic text-xs text-stone-600 mt-0.5">
            Отслеживай прогресс в изучении языков
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['calendar', 'stats'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 font-sans text-xs transition-all"
                style={{
                  background: activeTab === tab ? 'rgba(201,168,76,0.12)' : 'transparent',
                  color: activeTab === tab ? '#c9a84c' : '#6b7280',
                }}>
                {tab === 'calendar' ? '📅 Календарь' : '📊 Статистика'}
              </button>
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditSession(undefined); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-sans text-xs btn-gold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Занятие</span>
          </motion.button>
        </div>
      </div>

      {/* ── Language filter chips ── */}
      {usedLanguages.length > 0 && (
        <div className="flex items-center gap-2 px-4 md:px-6 py-2 overflow-x-auto scrollbar-thin flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={() => setFilterLang(null)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full font-sans text-xs transition-all"
            style={{
              background: !filterLang ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${!filterLang ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: !filterLang ? '#c9a84c' : '#6b7280',
            }}>
            <Globe className="w-3 h-3" />
            Все языки
          </button>
          {usedLanguages.map(l => (
            <button key={l.code}
              onClick={() => setFilterLang(filterLang === l.code ? null : l.code)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full font-sans text-xs transition-all"
              style={{
                background: filterLang === l.code ? `${l.color}15` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filterLang === l.code ? `${l.color}40` : 'rgba(255,255,255,0.06)'}`,
                color: filterLang === l.code ? l.color : '#6b7280',
              }}>
              {l.flag} {l.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'calendar' ? (
            <motion.div key="calendar"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex h-full overflow-hidden">

              {/* Calendar grid */}
              <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-4 min-w-0">

                {/* Month nav */}
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                    className="p-1.5 rounded-lg btn-ghost">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <div className="font-serif italic text-stone-200 text-sm capitalize">
                      {format(currentMonth, 'LLLL yyyy', { locale: ru })}
                    </div>
                    <div className="font-mono text-xs text-stone-600 mt-0.5">
                      {stats.monthMin < 60
                        ? `${stats.monthMin} мин этот месяц`
                        : `${Math.floor(stats.monthMin/60)}ч ${stats.monthMin%60}м этот месяц`}
                    </div>
                  </div>
                  <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                    className="p-1.5 rounded-lg btn-ghost">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1 flex-shrink-0">
                  {WEEKDAYS.map(d => (
                    <div key={d} className="text-center font-mono text-[10px] text-stone-700 py-1">{d}</div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1 flex-shrink-0">
                  {calDays.map(day => {
                    const key = format(day, 'yyyy-MM-dd');
                    const daySessions = sessionsByDate[key] ?? [];
                    const dayMin = daySessions.reduce((s, x) => s + x.duration, 0);
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const today = isToday(day);

                    // Get unique languages for dots
                    const langs = [...new Set(daySessions.map(s => s.language))];

                    return (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedDate(day);
                          setShowDayDetail(true);
                        }}
                        className="relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all overflow-hidden"
                        style={{
                          background: isSelected
                            ? 'rgba(201,168,76,0.18)'
                            : dayMin > 0 ? heatmapColor(dayMin) : 'rgba(255,255,255,0.02)',
                          border: isSelected
                            ? '1px solid rgba(201,168,76,0.5)'
                            : today ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(255,255,255,0.04)',
                          opacity: isCurrentMonth ? 1 : 0.3,
                          boxShadow: isSelected ? '0 0 16px rgba(201,168,76,0.2)' : 'none',
                        }}
                      >
                        <span className="font-mono text-xs leading-none"
                          style={{ color: today ? '#c9a84c' : isCurrentMonth ? '#ccc8bd' : '#4a4a5a' }}>
                          {format(day, 'd')}
                        </span>

                        {/* Language dots */}
                        {langs.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {langs.slice(0, 3).map(code => {
                              const l = LANGUAGES.find(x => x.code === code);
                              return (
                                <div key={code} className="w-1 h-1 rounded-full flex-shrink-0"
                                  style={{ background: l?.color ?? '#c9a84c' }} />
                              );
                            })}
                          </div>
                        )}

                        {/* Today indicator */}
                        {today && (
                          <div className="absolute top-1 right-1 w-1 h-1 rounded-full"
                            style={{ background: '#c9a84c' }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-2 mt-3 flex-shrink-0">
                  <span className="font-sans text-[10px] text-stone-700">Меньше</span>
                  {[0, 10, 20, 40, 60].map(m => (
                    <div key={m} className="w-4 h-4 rounded-md"
                      style={{ background: heatmapColor(m), border: '1px solid rgba(255,255,255,0.05)' }} />
                  ))}
                  <span className="font-sans text-[10px] text-stone-700">Больше</span>
                </div>

                {/* Quick stats below calendar */}
                <div className="grid grid-cols-3 gap-2 mt-3 flex-shrink-0">
                  <div className="p-2 rounded-xl text-center"
                    style={{ background: 'rgba(14,12,32,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Flame className="w-3 h-3" style={{ color: '#e84a4a' }} />
                      <span className="font-mono text-base font-bold" style={{ color: '#e84a4a' }}>
                        {stats.streak}
                      </span>
                    </div>
                    <div className="font-sans text-[10px] text-stone-600">Серия дней</div>
                  </div>
                  <div className="p-2 rounded-xl text-center"
                    style={{ background: 'rgba(14,12,32,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-yellow-600" />
                      <span className="font-mono text-base font-bold" style={{ color: '#c9a84c' }}>
                        {stats.totalXP}
                      </span>
                    </div>
                    <div className="font-sans text-[10px] text-stone-600">Total XP</div>
                  </div>
                  <div className="p-2 rounded-xl text-center"
                    style={{ background: 'rgba(14,12,32,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Calendar className="w-3 h-3 text-blue-400" />
                      <span className="font-mono text-base font-bold text-blue-400">
                        {stats.totalDays}
                      </span>
                    </div>
                    <div className="font-sans text-[10px] text-stone-600">Дней занятий</div>
                  </div>
                </div>
              </div>

              {/* Day detail — desktop side panel */}
              <div className="hidden md:flex flex-col w-72 flex-shrink-0 overflow-hidden">
                <DayDetail
                  date={selectedDate}
                  sessions={selectedSessions}
                  onAdd={() => { setEditSession(undefined); setShowForm(true); }}
                  onEdit={s => { setEditSession(s); setShowForm(true); }}
                  onDelete={deleteSession}
                  onClose={() => setShowDayDetail(false)}
                />
              </div>

              {/* Day detail — mobile modal */}
              <AnimatePresence>
                {showDayDetail && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 flex items-end md:hidden"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowDayDetail(false); }}
                  >
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="w-full rounded-t-2xl overflow-hidden flex flex-col"
                      style={{
                        maxHeight: '80vh',
                        background: 'rgba(8,8,18,0.99)',
                        border: '1px solid rgba(201,168,76,0.15)',
                        borderBottom: 'none',
                      }}
                    >
                      <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.15)' }} />
                      <DayDetail
                        date={selectedDate}
                        sessions={selectedSessions}
                        onAdd={() => { setShowDayDetail(false); setEditSession(undefined); setShowForm(true); }}
                        onEdit={s => { setShowDayDetail(false); setEditSession(s); setShowForm(true); }}
                        onDelete={id => { deleteSession(id); }}
                        onClose={() => setShowDayDetail(false)}
                      />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

          ) : (
            /* ── Stats tab ── */
            <motion.div key="stats"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="h-full overflow-y-auto scrollbar-thin p-4 md:p-6"
            >
              <div className="max-w-2xl mx-auto space-y-5">

                {/* Big numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Всего часов', value: `${(stats.totalMin / 60).toFixed(1)}ч`, icon: Clock, color: '#c9a84c' },
                    { label: 'Total XP', value: stats.totalXP.toLocaleString(), icon: Zap, color: '#f59e0b' },
                    { label: 'Серия', value: `${stats.streak} дн`, icon: Flame, color: '#e84a4a' },
                    { label: 'Рекорд', value: `${stats.longestStreak} дн`, icon: Trophy, color: '#a78bfa' },
                  ].map(item => (
                    <div key={item.label} className="p-4 rounded-xl text-center"
                      style={{ background: 'rgba(14,12,32,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <item.icon className="w-5 h-5 mx-auto mb-2" style={{ color: item.color }} />
                      <div className="font-mono text-xl font-bold mb-1" style={{ color: item.color }}>
                        {item.value}
                      </div>
                      <div className="font-sans text-[10px] text-stone-600">{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* By language */}
                {Object.keys(stats.byLang).length > 0 && (
                  <div className="p-4 rounded-xl"
                    style={{ background: 'rgba(14,12,32,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="w-4 h-4 text-stone-500" />
                      <span className="heading-display text-xs tracking-widest text-stone-500">ПО ЯЗЫКАМ</span>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(stats.byLang)
                        .sort((a, b) => b[1] - a[1])
                        .map(([code, min]) => {
                          const lang = LANGUAGES.find(l => l.code === code)!;
                          const pct = (min / stats.totalMin) * 100;
                          return (
                            <div key={code}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-sans text-xs text-stone-400 flex items-center gap-1.5">
                                  {lang?.flag} {lang?.name}
                                </span>
                                <span className="font-mono text-xs" style={{ color: lang?.color }}>
                                  {min < 60 ? `${min}м` : `${Math.floor(min/60)}ч ${min%60}м`}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: 0.1 }}
                                  className="h-full rounded-full"
                                  style={{ background: lang?.color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* By activity */}
                {Object.keys(stats.byActivity).length > 0 && (
                  <div className="p-4 rounded-xl"
                    style={{ background: 'rgba(14,12,32,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-4 h-4 text-stone-500" />
                      <span className="heading-display text-xs tracking-widest text-stone-500">ПО АКТИВНОСТИ</span>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(stats.byActivity)
                        .sort((a, b) => b[1] - a[1])
                        .map(([actId, min]) => {
                          const act = ACTIVITY_TYPES.find(a => a.id === actId)!;
                          const pct = (min / stats.totalMin) * 100;
                          return (
                            <div key={actId}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-sans text-xs text-stone-400 flex items-center gap-1.5">
                                  {act?.emoji} {act?.label}
                                </span>
                                <span className="font-mono text-xs text-stone-500">
                                  {min < 60 ? `${min}м` : `${Math.floor(min/60)}ч ${min%60}м`}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: 0.1 }}
                                  className="h-full rounded-full"
                                  style={{ background: 'rgba(201,168,76,0.7)' }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Heatmap last 12 weeks */}
                {sessions.length > 0 && (
                  <div className="p-4 rounded-xl"
                    style={{ background: 'rgba(14,12,32,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-stone-500" />
                      <span className="heading-display text-xs tracking-widest text-stone-500">АКТИВНОСТЬ (12 НЕДЕЛЬ)</span>
                    </div>
                    <div className="overflow-x-auto scrollbar-thin">
                      <div className="flex gap-1" style={{ minWidth: 'max-content' }}>
                        {Array.from({ length: 12 }).map((_, weekIdx) => {
                          const weekStart = new Date();
                          weekStart.setDate(weekStart.getDate() - (11 - weekIdx) * 7 - getDay(weekStart) + 1);
                          return (
                            <div key={weekIdx} className="flex flex-col gap-1">
                              {Array.from({ length: 7 }).map((_, dayIdx) => {
                                const d = new Date(weekStart);
                                d.setDate(d.getDate() + dayIdx);
                                const key = format(d, 'yyyy-MM-dd');
                                const min = (sessionsByDate[key] ?? []).reduce((s, x) => s + x.duration, 0);
                                return (
                                  <div key={dayIdx}
                                    title={`${key}: ${min}мин`}
                                    className="w-4 h-4 rounded-sm"
                                    style={{
                                      background: heatmapColor(min),
                                      border: '1px solid rgba(255,255,255,0.04)',
                                    }}
                                  />
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Motivational if no sessions */}
                {sessions.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">🌱</div>
                    <h3 className="font-serif italic text-stone-400 text-lg mb-2">
                      Начни своё путешествие
                    </h3>
                    <p className="font-sans text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
                      Добавь первое занятие языком и начни отслеживать свой прогресс. Даже 10 минут в день меняют всё.
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setEditSession(undefined); setShowForm(true); setActiveTab('calendar'); }}
                      className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl font-sans text-sm btn-gold mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Первое занятие
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Session Form Modal ── */}
      <AnimatePresence>
        {showForm && (
          <SessionForm
            initialDate={format(selectedDate, 'yyyy-MM-dd')}
            editSession={editSession}
            onSave={addSession}
            onClose={() => { setShowForm(false); setEditSession(undefined); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
