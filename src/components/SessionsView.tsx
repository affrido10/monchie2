import React, { useState } from 'react';
import { useLinguaStore, LANGUAGES, ACTIVITIES, MOODS, Session } from '../store/useLinguaStore';

export const SessionsView: React.FC = () => {
  const { sessions, openForm, deleteSession, selectedLanguageFilter, setSelectedLanguageFilter } = useLinguaStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'xp' | 'duration'>('date');

  const getLangInfo = (s: Session) => {
    const lang = LANGUAGES.find(l => l.code === s.languageCode);
    return lang ?? { flag: '🌐', name: s.customLanguage ?? 'Другой', color: '#9ca3af', code: 'custom' };
  };

  const getActivityInfo = (s: Session) => {
    return ACTIVITIES.find(a => a.id === s.activityType) ?? ACTIVITIES[ACTIVITIES.length - 1];
  };

  const getMoodEmoji = (mood: number) => MOODS.find(m => m.value === mood)?.emoji ?? '😐';

  const formatTime = (min: number) => {
    if (min < 60) return `${min} мин`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
  };

  const usedLanguages = [...new Set(sessions.map(s => s.languageCode))];

  const filtered = sessions
    .filter(s => {
      if (selectedLanguageFilter && s.languageCode !== selectedLanguageFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const lang = getLangInfo(s);
        const act = getActivityInfo(s);
        return (
          s.notes.toLowerCase().includes(q) ||
          lang.name.toLowerCase().includes(q) ||
          act.label.toLowerCase().includes(q) ||
          s.date.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'xp') return b.xp - a.xp;
      if (sortBy === 'duration') return b.durationMinutes - a.durationMinutes;
      return 0;
    });

  // Group by date
  const grouped: Record<string, Session[]> = {};
  for (const s of filtered) {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const formatDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Сегодня';
    if (dateStr === yesterday) return 'Вчера';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="Поиск по заметкам, языку, активности..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select
            className="input"
            style={{ width: 'auto', flexShrink: 0 }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'date' | 'xp' | 'duration')}
          >
            <option value="date">По дате</option>
            <option value="xp">По XP</option>
            <option value="duration">По времени</option>
          </select>
          <button
            className="btn-primary"
            onClick={() => openForm()}
          >
            + Добавить
          </button>
        </div>

        {/* Language filter chips */}
        {usedLanguages.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedLanguageFilter(null)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: `1px solid ${!selectedLanguageFilter ? 'var(--accent)' : 'var(--border)'}`,
                background: !selectedLanguageFilter ? 'var(--accent-dim)' : 'transparent',
                color: !selectedLanguageFilter ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Все языки
            </button>
            {usedLanguages.map(code => {
              const lang = LANGUAGES.find(l => l.code === code);
              const isActive = selectedLanguageFilter === code;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedLanguageFilter(isActive ? null : code)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    border: `1px solid ${isActive ? (lang?.color ?? 'var(--accent)') : 'var(--border)'}`,
                    background: isActive ? `${lang?.color ?? 'var(--accent)'}20` : 'transparent',
                    color: isActive ? (lang?.color ?? 'var(--accent)') : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {lang?.flag} {lang?.name ?? code}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sessions grouped by date */}
      {sortedDates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📝</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
            Нет сессий
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
            Начни отслеживать свои занятия языком
          </p>
          <button className="btn-primary" onClick={() => openForm()}>
            + Добавить первую сессию
          </button>
        </div>
      ) : (
        sortedDates.map(date => {
          const dateSessions = grouped[date];
          const dayMinutes = dateSessions.reduce((a, s) => a + s.durationMinutes, 0);
          const dayXP = dateSessions.reduce((a, s) => a + s.xp, 0);

          return (
            <div key={date} className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, paddingLeft: 4 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {formatDateLabel(date)}
                </h3>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatTime(dayMinutes)} · {dayXP} XP
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dateSessions.map(s => {
                  const lang = getLangInfo(s);
                  const act = getActivityInfo(s);
                  return (
                    <div key={s.id} className="session-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 26, flexShrink: 0 }}>{lang.flag}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {act.icon} {act.label}
                          </span>
                          <span style={{ fontSize: 12, color: lang.color, fontWeight: 500 }}>
                            {lang.name}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '1px 7px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                            +{s.xp} XP
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {formatTime(s.durationMinutes)}
                          </span>
                          <span style={{ fontSize: 14 }}>{getMoodEmoji(s.mood)}</span>
                        </div>
                        {s.notes && (
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.notes}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => openForm(s.date, s)}
                          style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => { if (confirm('Удалить сессию?')) deleteSession(s.id); }}
                          style={{ padding: '6px 10px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
