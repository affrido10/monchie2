import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Network, Shuffle, Plus, PackageOpen, Library, MessageSquare, Kanban } from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';

export const openObsidianImport = () => window.dispatchEvent(new CustomEvent('vault:openObsidianImport'));

interface Command {
  id: string; label: string; description?: string;
  icon: React.ReactNode; action: () => void; category: string;
}

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, notes, setActiveNote, createNote, setPanelView } = useVaultStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(!commandPaletteOpen); }
      if (e.key === 'Escape' && commandPaletteOpen) setCommandPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const commands: Command[] = [
    { id: 'new',      label: 'New Thought',           description: 'Create a fleeting note',       icon: <Plus className="w-4 h-4" />,           category: 'Create',    action: () => { createNote('fleeting'); setCommandPaletteOpen(false); setPanelView('editor'); } },
    { id: 'perm',     label: 'New Permanent Idea',    description: 'Create a permanent note (💎)', icon: <Plus className="w-4 h-4" />,           category: 'Create',    action: () => { createNote('permanent'); setCommandPaletteOpen(false); setPanelView('editor'); } },
    { id: 'graph',    label: 'Constellation View',    description: 'Visualize all connections',    icon: <Network className="w-4 h-4" />,        category: 'Navigate',  action: () => { setPanelView('graph'); setCommandPaletteOpen(false); } },
    { id: 'library',  label: 'The Library',           description: 'Browse all thoughts',          icon: <Library className="w-4 h-4" />,        category: 'Navigate',  action: () => { setPanelView('library'); setCommandPaletteOpen(false); } },
    { id: 'agora',    label: 'The Agora',             description: 'Debate with philosophers',     icon: <MessageSquare className="w-4 h-4" />,   category: 'Navigate',  action: () => { setPanelView('agora'); setCommandPaletteOpen(false); } },
    { id: 'kanban',   label: 'Kanban Board',          description: 'Task management',              icon: <Kanban className="w-4 h-4" />,          category: 'Navigate',  action: () => { setPanelView('kanban'); setCommandPaletteOpen(false); } },
    { id: 'random',   label: 'Random Thought',        description: 'Open a random note',           icon: <Shuffle className="w-4 h-4" />,         category: 'Navigate',  action: () => { if (notes.length > 0) { setActiveNote(notes[Math.floor(Math.random() * notes.length)].id); setPanelView('editor'); } setCommandPaletteOpen(false); } },
    { id: 'obsidian', label: 'Import from Obsidian',  description: 'Import .md files or folder',   icon: <PackageOpen className="w-4 h-4" />,     category: 'Actions',   action: () => { setCommandPaletteOpen(false); openObsidianImport(); } },
  ];

  const noteResults = notes.filter((n) =>
    !query ||
    n.title.toLowerCase().includes(query.toLowerCase()) ||
    n.content.toLowerCase().includes(query.toLowerCase()) ||
    n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 6);

  const filteredCommands = commands.filter((c) =>
    !query || c.label.toLowerCase().includes(query.toLowerCase()) || c.description?.toLowerCase().includes(query.toLowerCase())
  );

  const allResults = [
    ...filteredCommands.map((c) => ({ type: 'command' as const, data: c })),
    ...noteResults.map((n) => ({ type: 'note' as const, data: n })),
  ];

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      const item = allResults[selectedIndex];
      if (!item) return;
      if (item.type === 'command') (item.data as Command).action();
      else { setActiveNote((item.data as { id: string }).id); setPanelView('editor'); setCommandPaletteOpen(false); }
    }
  };

  const NOTE_ICONS: Record<string, string> = { fleeting: '⚡', literature: '📖', permanent: '💎', moc: '🗺️' };

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
          onClick={() => setCommandPaletteOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(8,8,18,0.98)',
              border: '1px solid rgba(201,168,76,0.25)',
              boxShadow: '0 0 80px rgba(201,168,76,0.08), 0 30px 80px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              <Search className="w-4 h-4 text-stone-600 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Seek knowledge…"
                className="flex-1 bg-transparent text-sm outline-none font-serif italic"
                style={{ color: '#d4cfc2' }}
              />
              <kbd className="text-[10px] text-stone-700 font-mono px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto scrollbar-thin py-1">
              {allResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-serif italic text-xs text-stone-700">No knowledge found…</p>
                </div>
              ) : (
                <>
                  {filteredCommands.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 heading-display text-[9px] tracking-[0.25em] text-yellow-800/60">COMMANDS</div>
                      {filteredCommands.map((cmd, i) => {
                        const isSelected = i === selectedIndex;
                        return (
                          <motion.button
                            key={cmd.id}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.025 }}
                            onClick={cmd.action}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                            style={{ background: isSelected ? 'rgba(201,168,76,0.08)' : 'transparent' }}
                            onMouseEnter={() => setSelectedIndex(i)}
                          >
                            <div className="p-1.5 rounded-lg flex-shrink-0"
                              style={{ background: 'rgba(201,168,76,0.08)', color: '#c9a84c' }}>
                              {cmd.icon}
                            </div>
                            <div>
                              <div className="text-sm font-serif italic" style={{ color: isSelected ? '#d4aa55' : '#c4c0b3' }}>{cmd.label}</div>
                              {cmd.description && <div className="text-xs text-stone-700 font-sans">{cmd.description}</div>}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {noteResults.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 heading-display text-[9px] tracking-[0.25em] text-yellow-800/60">THOUGHTS</div>
                      {noteResults.map((note, i) => {
                        const globalIdx = filteredCommands.length + i;
                        const isSelected = globalIdx === selectedIndex;
                        return (
                          <motion.button
                            key={note.id}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.025 }}
                            onClick={() => { setActiveNote(note.id); setPanelView('editor'); setCommandPaletteOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                            style={{ background: isSelected ? 'rgba(201,168,76,0.08)' : 'transparent' }}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.1)' }}>
                              {NOTE_ICONS[note.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-serif italic truncate" style={{ color: isSelected ? '#d4aa55' : '#c4c0b3' }}>{note.title}</div>
                              <div className="text-xs text-stone-700 truncate font-sans">
                                {note.tags.map(t => `#${t}`).join(' ')} · {note.content.slice(0,50)}
                              </div>
                            </div>
                            {isSelected && (
                              <kbd className="text-[10px] text-stone-700 font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                ↵
                              </kbd>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 font-mono text-[10px] text-stone-700"
              style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}>
              <span><kbd className="mr-1">↑↓</kbd>navigate</span>
              <span><kbd className="mr-1">↵</kbd>open</span>
              <span><kbd className="mr-1">⌘K</kbd>toggle</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
