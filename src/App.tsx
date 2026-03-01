import { useState, useEffect } from 'react';
import { useLinguaStore, LANGUAGES, AppTab } from './store/useLinguaStore';
import { SessionForm } from './components/SessionForm';
import { CalendarView } from './components/CalendarView';
import { StatsView } from './components/StatsView';
import { SessionsView } from './components/SessionsView';

const NAV_ITEMS: { id: AppTab; icon: string; label: string }[] = [
  { id: 'calendar', icon: '📅', label: 'Календарь' },
  { id: 'sessions', icon: '📝', label: 'Сессии' },
  { id: 'stats',    icon: '📊', label: 'Статистика' },
  { id: 'settings', icon: '⚙️', label: 'Настройки' },
];

function SettingsView() {
  const store = useLinguaStore();
  const usedLanguages = [...new Set(store.sessions.map(s => s.languageCode))];

  const exportData = () => {
    const data = JSON.stringify({ sessions: store.sessions, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diary-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.sessions && Array.isArray(data.sessions)) {
            if (confirm(`Импортировать ${data.sessions.length} сессий?`)) {
              useLinguaStore.setState(s => ({
                sessions: [...s.sessions, ...data.sessions.filter(
                  (ns: { id: string }) => !s.sessions.find(es => es.id === ns.id)
                )],
              }));
              alert('Импорт завершён!');
            }
          }
        } catch { alert('Ошибка чтения файла'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const clearAll = () => {
    if (confirm('Удалить ВСЕ данные? Это действие необратимо.')) {
      useLinguaStore.setState({ sessions: [] });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, fontFamily: "'Playfair Display', serif", color: 'var(--text-primary)' }}>
          📊 Данные
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Всего сессий</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Записей о занятиях</div>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
              {store.sessions.length}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Активностей</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {usedLanguages.map(c => LANGUAGES.find(l => l.code === c)?.flag ?? '🌐').join(' ')}
              </div>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
              {usedLanguages.length}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Синхронизация</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supabase</div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--green)', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 6 }}>
              ✓ Активна
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, fontFamily: "'Playfair Display', serif", color: 'var(--text-primary)' }}>
          💾 Экспорт и импорт
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-ghost" onClick={exportData} style={{ justifyContent: 'flex-start', padding: '14px 16px' }}>
            <span>⬇️</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Экспортировать</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Скачать JSON-файл</div>
            </div>
          </button>
          <button className="btn-ghost" onClick={importData} style={{ justifyContent: 'flex-start', padding: '14px 16px' }}>
            <span>⬆️</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Импортировать</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Загрузить JSON</div>
            </div>
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 24, borderColor: 'rgba(239,68,68,0.2)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: '#ef4444', fontFamily: "'Playfair Display', serif" }}>
          ⚠️ Опасная зона
        </h3>
        <button
          onClick={clearAll}
          style={{ padding: '12px 20px', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 500, width: '100%' }}
        >
          🗑️ Удалить все данные
        </button>
      </div>
    </div>
  );
}

export default function App() {
  // ← FIXED: use setTab not setActiveTab
  const { activeTab, setTab, sessions, openForm, getCurrentStreak, getTotalXP, loadFromSupabase, syncing } = useLinguaStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { loadFromSupabase(); }, []);

  const streak = getCurrentStreak();
  const totalXP = getTotalXP();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMinutes = useLinguaStore.getState().getTotalMinutesForDate(todayStr);

  const renderView = () => {
    switch (activeTab) {
      case 'calendar': return <CalendarView />;
      case 'sessions': return <SessionsView />;
      case 'stats':    return <StatsView />;
      case 'settings': return <SettingsView />;
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
    }}>
      {/* ── Header ─────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        zIndex: 40,
        background: 'rgba(13,13,13,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, height: 52 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 30, height: 30,
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
              boxShadow: '0 0 12px rgba(245,158,11,0.4)',
            }}>🌍</div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Playfair Display', serif" }}>
              DayTrack
            </span>
          </div>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: 2, flex: 1, justifyContent: 'center' }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`tab-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {syncing && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>⟳</span>}
            {streak > 0 && (
              <div className="streak-badge" style={{ fontSize: 12, padding: '3px 8px' }}>
                🔥 {streak}д
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
              ⚡{totalXP} XP
            </div>
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => openForm()}>
              + Занятие
            </button>
          </div>
        </div>
      </header>

      {/* ── Today bar ──────────────────────────────── */}
      {todayMinutes > 0 && (
        <div style={{
          flexShrink: 0,
          background: 'rgba(245,158,11,0.06)',
          borderBottom: '1px solid rgba(245,158,11,0.1)',
          padding: '6px 16px',
        }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
              ✨ Сегодня: {todayMinutes < 60 ? `${todayMinutes} мин` : `${Math.floor(todayMinutes/60)}ч ${todayMinutes%60}м`}
            </span>
            {streak > 1 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🔥 {streak} дней подряд</span>
            )}
          </div>
        </div>
      )}

      {/* ── Main scrollable content ─────────────────── */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px',
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {renderView()}
      </main>

      {/* ── Mobile bottom nav ──────────────────────── */}
      <nav className="mobile-nav" style={{ display: 'none' }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`mobile-nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>

      {/* ── Session form modal ──────────────────────── */}
      <SessionForm />

      <style>{`
        @media (max-width: 768px) {
          nav.mobile-nav { display: flex !important; }
          main { padding-bottom: 70px !important; }
        }
        @media (max-width: 900px) {
          .calendar-layout { flex-direction: column !important; }
          .calendar-layout > div:last-child { width: 100% !important; }
        }
        @media (max-width: 640px) {
          .stats-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
