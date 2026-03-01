import React from 'react';
import { useLinguaStore, LANGUAGES, ACTIVITIES } from '../store/useLinguaStore';

export const StatsView: React.FC = () => {
  const {
    sessions,
    getCurrentStreak,
    getLongestStreak,
    getTotalXP,
    getTotalMinutes,
    getTotalDays,
    getXPByLanguage,
    getMinutesByActivity,
  } = useLinguaStore();

  const streak = getCurrentStreak();
  const longestStreak = getLongestStreak();
  const totalXP = getTotalXP();
  const totalMinutes = getTotalMinutes();
  const totalDays = getTotalDays();
  const xpByLang = getXPByLanguage();
  const minByActivity = getMinutesByActivity();

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMin = totalMinutes % 60;

  const maxLangXP = Math.max(...Object.values(xpByLang), 1);
  const maxActMin = Math.max(...Object.values(minByActivity), 1);

  const formatTime = (min: number) => {
    if (min < 60) return `${min}м`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
  };

  // Last 12 weeks heatmap
  const today = new Date();
  const weeks: string[][] = [];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 83); // 12 weeks back

  for (let w = 0; w < 12; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      week.push(date.toISOString().split('T')[0]);
    }
    weeks.push(week);
  }

  const getHeatLevel = (dateStr: string) => {
    const min = sessions
      .filter((s) => s.date === dateStr)
      .reduce((acc, s) => acc + s.durationMinutes, 0);
    if (min === 0) return 0;
    if (min < 15) return 1;
    if (min < 30) return 2;
    if (min < 60) return 3;
    if (min < 90) return 4;
    return 5;
  };

  const statCards = [
    { label: 'Текущая серия', value: `🔥 ${streak}`, sub: 'дней подряд', color: '#f59e0b' },
    { label: 'Рекорд серии', value: `⚡ ${longestStreak}`, sub: 'дней', color: '#ef4444' },
    { label: 'Всего XP', value: totalXP.toLocaleString(), sub: 'опыта накоплено', color: '#8b5cf6' },
    { label: 'Время занятий', value: totalHours > 0 ? `${totalHours}ч ${remainingMin}м` : `${totalMinutes}м`, sub: 'всего', color: '#10b981' },
    { label: 'Дней занятий', value: String(totalDays), sub: 'уникальных дней', color: '#3b82f6' },
    { label: 'Сессий', value: String(sessions.length), sub: 'записей', color: '#ec4899' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {statCards.map((s) => (
          <div key={s.label} className="card animate-fade-in" style={{ padding: '20px 16px' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: s.color, lineHeight: 1, marginBottom: 8 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* XP by language */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', fontFamily: "'Playfair Display', serif" }}>
            По языкам
          </h3>
          {Object.keys(xpByLang).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Нет данных</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(xpByLang)
                .sort((a, b) => b[1] - a[1])
                .map(([code, xp]) => {
                  const lang = LANGUAGES.find((l) => l.code === code);
                  const pct = (xp / maxLangXP) * 100;
                  return (
                    <div key={code}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {lang?.flag} {lang?.name ?? code}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {xp} XP
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${lang?.color ?? 'var(--accent)'}, ${lang?.color ?? 'var(--accent)'}99)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Minutes by activity */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', fontFamily: "'Playfair Display', serif" }}>
            По активностям
          </h3>
          {Object.keys(minByActivity).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Нет данных</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(minByActivity)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 7)
                .map(([actId, min]) => {
                  const act = ACTIVITIES.find((a) => a.id === actId);
                  const pct = (min / maxActMin) * 100;
                  return (
                    <div key={actId}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {act?.icon} {act?.label ?? actId}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatTime(min)}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${act?.color ?? 'var(--accent)'}, ${act?.color ?? 'var(--accent)'}99)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Heatmap 12 weeks */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', fontFamily: "'Playfair Display', serif" }}>
          Активность за 12 недель
        </h3>
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{ display: 'flex', gap: 4, minWidth: 'fit-content' }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {week.map((date) => (
                  <div
                    key={date}
                    className={`heat-cell heat-${getHeatLevel(date)}`}
                    title={`${date}: ${formatTime(sessions.filter(s => s.date === date).reduce((a, s) => a + s.durationMinutes, 0))}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Меньше</span>
          {[0,1,2,3,4,5].map(l => (
            <div key={l} className={`heat-cell heat-${l}`} style={{ cursor: 'default' }} />
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Больше</span>
        </div>
      </div>
    </div>
  );
};
