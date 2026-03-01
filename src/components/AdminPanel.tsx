import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Trash2, Shield, Lock } from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import { format } from 'date-fns';

// ── Admin Login Modal ─────────────────────────────────────────────────────────
export function AdminLoginModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);
  const { adminLogin } = useVaultStore();

  const handle = () => {
    const ok = adminLogin(pwd);
    if (ok) onSuccess();
    else {
      setError(true);
      setPwd('');
      setTimeout(() => setError(false), 1200);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 16 }}
        animate-error={error ? { x: [-8,8,-6,6,-4,4,0] } : {}}
        className="w-full max-w-sm rounded-2xl p-7"
        style={{
          background: 'rgba(8,8,18,0.98)',
          border: error ? '1px solid rgba(180,60,60,0.5)' : '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <Shield className="w-4 h-4" style={{ color: '#c9a84c' }} />
          </div>
          <div>
            <h3 className="heading-display text-sm tracking-[0.15em] gold-text">SANCTUM</h3>
            <p className="font-sans text-xs text-stone-700">Administrator access</p>
          </div>
        </div>

        <div className="ornament mb-5"><span>✦</span></div>

        <div className="space-y-4">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handle()}
            placeholder="Administrator password…"
            autoFocus
            className="atheneum-input text-sm"
            style={error ? { borderColor: 'rgba(180,60,60,0.5)' } : undefined}
          />
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-red-400/70 text-xs font-sans text-center">
                Access denied. The vault remains sealed.
              </motion.p>
            )}
          </AnimatePresence>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-sans btn-ghost transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              Cancel
            </button>
            <button onClick={handle} disabled={!pwd.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-sans btn-gold disabled:opacity-40 transition-all">
              Enter Sanctum
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { notes, deleteNote, hideNote, updateNote, adminLogout, toggleShowHidden, showHidden, isAdmin } = useVaultStore();
  const [activeTab, setActiveTab] = useState<'all'|'hidden'|'stats'>('all');
  const [searchQ, setSearchQ] = useState('');

  if (!isAdmin) return null;

  const allNotes = notes.filter(n =>
    !searchQ || n.title.toLowerCase().includes(searchQ.toLowerCase())
  );
  const hiddenNotes = notes.filter(n => n.isHidden);
  const visibleNotes = notes.filter(n => !n.isHidden);

  const displayNotes = activeTab === 'hidden'
    ? hiddenNotes.filter(n => !searchQ || n.title.toLowerCase().includes(searchQ.toLowerCase()))
    : allNotes;

  const typeCount = notes.reduce((acc, n) => { acc[n.type] = (acc[n.type] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: [0.16,1,0.3,1] }}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,8,18,0.99)',
          border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 0 80px rgba(201,168,76,0.06), 0 40px 80px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <Shield className="w-4 h-4" style={{ color: '#c9a84c' }} />
            </div>
            <div>
              <h2 className="heading-display text-sm tracking-[0.15em] gold-text">THE SANCTUM</h2>
              <p className="font-sans text-xs text-stone-700">Administrator Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { adminLogout(); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans btn-ghost transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <Lock className="w-3 h-3" />
              Leave
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg btn-ghost transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
          {[
            { label: 'Total', value: notes.length, color: '#c9a84c' },
            { label: 'Visible', value: visibleNotes.length, color: '#4ade80' },
            { label: 'Hidden', value: hiddenNotes.length, color: '#f87171' },
            { label: 'Connections', value: notes.reduce((s,n) => s + n.linkedNoteIds.length, 0), color: '#818cf8' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center py-2 rounded-xl"
              style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
              <div className="font-mono text-lg font-bold" style={{ color }}>{value}</div>
              <div className="heading-display text-[9px] tracking-widest text-stone-700">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="flex items-center gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
          {[
            { id: 'all', label: 'All Thoughts' },
            { id: 'hidden', label: `Hidden (${hiddenNotes.length})` },
            { id: 'stats', label: 'Chronicle' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
              className="tab-item transition-all"
              style={{
                background: activeTab === id ? 'rgba(201,168,76,0.1)' : 'transparent',
                color: activeTab === id ? '#c9a84c' : '#4a4a5a',
                border: activeTab === id ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
              }}>
              {label}
            </button>
          ))}
          <div className="flex-1" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search…" className="atheneum-input text-xs w-36"
            style={{ padding: '6px 12px' }} />
        </div>

        {/* Admin controls */}
        <div className="flex items-center gap-3 px-5 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
          <button onClick={toggleShowHidden}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans transition-all btn-ghost"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {showHidden ? <Eye className="w-3 h-3" style={{ color: '#c9a84c' }} /> : <EyeOff className="w-3 h-3" />}
            {showHidden ? 'Showing hidden' : 'Show hidden'}
          </button>
          <span className="font-mono text-[10px] text-stone-700">
            {displayNotes.length} of {notes.length} thoughts
          </span>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {activeTab === 'stats' ? (
            <div className="p-5 space-y-4">
              <div className="ornament"><span className="heading-display text-[10px] tracking-widest text-yellow-800/60">TYPE DISTRIBUTION</span></div>
              <div className="space-y-2">
                {Object.entries(typeCount).map(([type, count]) => {
                  const pct = Math.round((count / notes.length) * 100);
                  const colors: Record<string,string> = { fleeting:'#c9a84c', literature:'#818cf8', permanent:'#4ade80', moc:'#f472b6' };
                  const icons: Record<string,string> = { fleeting:'⚡', literature:'📖', permanent:'💎', moc:'🗺️' };
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-sans text-xs text-stone-500">{icons[type]} {type}</span>
                        <span className="font-mono text-xs" style={{ color: colors[type] }}>{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <motion.div className="h-full rounded-full" style={{ background: colors[type], width: `${pct}%` }}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="ornament mt-4"><span className="heading-display text-[10px] tracking-widest text-yellow-800/60">RECENT ACTIVITY</span></div>
              <div className="space-y-1">
                {[...notes].sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0,8).map(n => (
                  <div key={n.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="font-serif italic text-sm text-stone-400 truncate flex-1">{n.title}</span>
                    <span className="font-mono text-[10px] text-stone-700 ml-3 flex-shrink-0">
                      {format(n.updatedAt, 'MMM d, HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {displayNotes.length === 0 && (
                <div className="text-center py-12">
                  <p className="font-serif italic text-sm text-stone-700">
                    {activeTab === 'hidden' ? 'No hidden thoughts…' : 'No thoughts found…'}
                  </p>
                </div>
              )}
              {displayNotes.map((note) => (
                <motion.div key={note.id} layout
                  className="flex items-center gap-3 p-3 rounded-xl group transition-all"
                  style={{
                    background: note.isHidden ? 'rgba(201,168,76,0.03)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${note.isHidden ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-serif italic text-sm truncate"
                        style={{ color: note.isHidden ? '#6b6b5a' : '#c4c0b3' }}>
                        {note.title}
                      </span>
                      {note.isHidden && (
                        <span className="heading-display text-[9px] tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)' }}>
                          HIDDEN
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-stone-700 font-mono">
                      <span>{format(note.updatedAt, 'MMM d')}</span>
                      <span>{note.wordCount}w</span>
                      {note.tags.length > 0 && <span>{note.tags.slice(0,2).map(t=>`#${t}`).join(' ')}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Edit type */}
                    <select
                      value={note.type}
                      onChange={(e) => updateNote(note.id, { type: e.target.value as typeof note.type })}
                      className="text-[10px] font-sans rounded px-1 py-0.5 outline-none cursor-pointer"
                      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', color: '#c9a84c' }}
                    >
                      <option value="fleeting">⚡ Fleeting</option>
                      <option value="literature">📖 Literature</option>
                      <option value="permanent">💎 Permanent</option>
                      <option value="moc">🗺️ MOC</option>
                    </select>

                    <button onClick={() => hideNote(note.id)}
                      title={note.isHidden ? 'Reveal' : 'Hide'}
                      className="p-1.5 rounded-lg btn-ghost transition-colors"
                      style={{ color: note.isHidden ? '#c9a84c' : undefined }}>
                      {note.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button onClick={() => { if (confirm(`Delete "${note.title}"?`)) deleteNote(note.id); }}
                      className="p-1.5 rounded-lg btn-ghost hover:text-red-500/70 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
