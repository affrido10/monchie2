import React from 'react';
import { useLinguaStore, LANGUAGES, ACTIVITIES, MOODS } from '../store/useLinguaStore';

const QUICK_DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

export const SessionForm: React.FC = () => {
  const {
    formOpen, closeForm, editingSession,
    formDate, formLanguage, formCustomLanguage,
    formActivity, formDuration, formMood, formNotes,
    setFormField, submitForm,
  } = useLinguaStore();

  if (!formOpen) return null;

  const selectedActivity = ACTIVITIES.find((a) => a.id === formActivity);
  const previewXP = Math.round((selectedActivity?.xpPerMin ?? 2) * formDuration);

  const formatDuration = (min: number) => {
    if (min < 60) return `${min} мин`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeForm()}>
      <div
        className="glass animate-slide-up"
        style={{
          width: '100%',
          maxWidth: 540,
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Playfair Display', serif" }}>
              {editingSession ? 'Редактировать сессию' : 'Новая сессия'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Запиши что изучал сегодня
            </p>
          </div>
          <button
            onClick={closeForm}
            style={{
              width: 36, height: 36,
              border: '1px solid var(--border)',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Date */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Дата
            </label>
            <input
              type="date"
              className="input"
              value={formDate}
              onChange={(e) => setFormField('formDate', e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Language */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Язык
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setFormField('formLanguage', lang.code)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 10,
                    border: `2px solid ${formLanguage === lang.code ? lang.color : 'var(--border)'}`,
                    background: formLanguage === lang.code ? `${lang.color}20` : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{lang.flag}</span>
                  <span style={{ fontSize: 10, color: formLanguage === lang.code ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 500 }}>
                    {lang.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
            {formLanguage === 'custom' && (
              <input
                className="input"
                style={{ marginTop: 8 }}
                placeholder="Название языка..."
                value={formCustomLanguage}
                onChange={(e) => setFormField('formCustomLanguage', e.target.value)}
              />
            )}
          </div>

          {/* Activity */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Тип активности
            </label>
            {/* Language activities */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🌍 Языки</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 12 }}>
              {ACTIVITIES.filter(a => a.category === 'language').map((act) => (
                <button
                  key={act.id}
                  onClick={() => setFormField('formActivity', act.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `2px solid ${formActivity === act.id ? act.color : 'var(--border)'}`,
                    background: formActivity === act.id ? `${act.color}20` : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{act.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: formActivity === act.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {act.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {act.xpPerMin} XP/мин
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Длительность
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatDuration(formDuration)}
                </span>
                <span style={{ fontSize: 12, padding: '2px 8px', background: 'var(--accent-dim)', borderRadius: 6, color: 'var(--accent)' }}>
                  +{previewXP} XP
                </span>
              </div>
            </div>
            <input
              type="range"
              min={5}
              max={300}
              step={5}
              value={formDuration}
              onChange={(e) => setFormField('formDuration', Number(e.target.value))}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {QUICK_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setFormField('formDuration', d)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: `1px solid ${formDuration === d ? 'var(--accent)' : 'var(--border)'}`,
                    background: formDuration === d ? 'var(--accent-dim)' : 'transparent',
                    color: formDuration === d ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {formatDuration(d)}
                </button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Настроение
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  className={`mood-btn ${formMood === m.value ? 'active' : ''}`}
                  onClick={() => setFormField('formMood', m.value)}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Заметки (что изучил, трудности, инсайты...)
            </label>
            <textarea
              className="input"
              placeholder="Выучил слова: bonjour, merci, s'il vous plaît..."
              value={formNotes}
              onChange={(e) => setFormField('formNotes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit */}
          <button
            className="btn-primary"
            onClick={submitForm}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}
          >
            {editingSession ? '✓ Сохранить изменения' : '+ Добавить сессию'}
          </button>
        </div>
      </div>
    </div>
  );
};
