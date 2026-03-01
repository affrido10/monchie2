import React, { useState } from 'react';
import { useLinguaStore, LANGUAGES, ACTIVITIES, MOODS, Session } from '../store/useLinguaStore';

function getHeatLevel(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  if (minutes < 90) return 4;
  return 5;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  let d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday-first
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const CalendarView: React.FC = () => {
  const {
    selectedDate, setSelectedDate,
    getTotalMinutesForDate, getSessionsForDate,
    openForm, deleteSession,
  } = useLinguaStore();

  const todayStr = new Date().toISOString().split('T')[0];
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else setViewMonth(m => m + 1);
  };

  const formatDateStr = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const selectedSessions = getSessionsForDate(selectedDate);
  const selectedMinutes = getTotalMinutesForDate(selectedDate);

  const formatTime = (min: number) => {
    if (min === 0) return '—';
    if (min < 60) return `${min} мин`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
  };

  const getLangInfo = (s: Session) => {
    const lang = LANGUAGES.find(l => l.code === s.languageCode);
    return lang ?? { flag: '🌐', name: s.customLanguage ?? 'Другой', color: '#9ca3af' };
  };

  const getActivityInfo = (s: Session) => {
    return ACTIVITIES.find(a => a.id === s.activityType) ?? ACTIVITIES[ACTIVITIES.length - 1];
  };

  const getMoodEmoji = (mood: number) => MOODS.find(m => m.value === mood)?.emoji ?? '😐';

  // Get dots for a day (unique languages)
  const getDotsForDay = (dateStr: string) => {
    const daySessions = getSessionsForDate(dateStr);
    const langs = [...new Set(daySessions.map(s => s.languageCode))];
    return langs.slice(0, 4).map(code => {
      const lang = LANGUAGES.find(l => l.code === code);
      return lang?.color ?? '#9ca3af';
    });
  };

  return (
    <div className="calendar-layout" style={{ display: 'flex', gap: 24, height: '100%', alignItems: 'flex-start' }}>
      {/* Calendar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card" style={{ padding: '16px' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              onClick={prevMonth}
              className="btn-ghost"
              style={{ padding: '8px 12px' }}
            >
              ←
            </button>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: 'var(--text-primary)' }}>
                {MONTH_NAMES[viewMonth]}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{viewYear}</p>
            </div>
            <button
              onClick={nextMonth}
              className="btn-ghost"
              style={{ padding: '8px 12px' }}
            >
              →
            </button>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {/* Empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = formatDateStr(viewYear, viewMonth, day);
              const minutes = getTotalMinutesForDate(dateStr);
              const heat = getHeatLevel(minutes);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dots = getDotsForDay(dateStr);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    height: 52,
                    borderRadius: 8,
                    border: isSelected
                      ? '2px solid var(--accent)'
                      : isToday
                        ? '2px solid rgba(245,158,11,0.4)'
                        : '2px solid transparent',
                    background: isSelected
                      ? 'var(--accent-dim)'
                      : heat > 0
                        ? `rgba(245,158,11,${heat * 0.08})`
                        : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    padding: '4px 2px',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 500,
                    color: isSelected ? 'var(--accent)' : isToday ? 'var(--accent)' : heat > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}>
                    {day}
                  </span>
                  {dots.length > 0 && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {dots.map((color, i) => (
                        <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: color }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Меньше</span>
            {[0,1,2,3,4,5].map(l => (
              <div key={l} className={`heat-cell heat-${l}`} style={{ cursor: 'default' }} />
            ))}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Больше</span>
          </div>
        </div>

      </div>

      {/* Day detail */}
      <div style={{ width: 320, flexShrink: 0 }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedDate === todayStr ? 'Сегодня' : selectedDate}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {selectedSessions.length === 0
                  ? 'Нет занятий'
                  : `${selectedSessions.length} ${selectedSessions.length === 1 ? 'сессия' : 'сессий'} · ${formatTime(selectedMinutes)}`
                }
              </p>
            </div>
            <button
              className="btn-primary"
              style={{ padding: '8px 14px', fontSize: 12 }}
              onClick={() => openForm(selectedDate)}
            >
              + Добавить
            </button>
          </div>

          {selectedSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                В этот день нет занятий.<br />Начни прямо сейчас!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedSessions.map((s) => {
                const lang = getLangInfo(s);
                const act = getActivityInfo(s);
                return (
                  <div key={s.id} className="session-card animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <span style={{ fontSize: 22 }}>{lang.flag}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {act.icon} {act.label}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '1px 6px', borderRadius: 4 }}>
                              +{s.xp} XP
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
                            <span>{formatTime(s.durationMinutes)}</span>
                            <span>{getMoodEmoji(s.mood)}</span>
                          </div>
                          {s.notes && (
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                              {s.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => openForm(s.date, s)}
                          style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => { if (confirm('Удалить эту сессию?')) deleteSession(s.id); }}
                          style={{ padding: '4px 8px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
