import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, FileText, FolderOpen, CheckCircle2,
  AlertCircle, ChevronRight, Loader2, Package, Tag,
  Link, ArrowRight, Info
} from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import { v4 as uuidv4 } from 'uuid';

interface ParsedNote {
  id: string;
  filename: string;
  path: string;
  title: string;
  content: string;
  rawContent: string;
  tags: string[];
  type: 'fleeting' | 'literature' | 'permanent' | 'moc';
  wikiLinks: string[];
  frontmatter: Record<string, string | string[]>;
  createdAt: Date;
  updatedAt: Date;
  folderPath: string;
}

interface ImportStats {
  total: number;
  parsed: number;
  withTags: number;
  withLinks: number;
  folders: number;
  failed: string[];
}

// ── YAML frontmatter parser ───────────────────────────────────────────────────
function parseFrontmatter(raw: string): {
  frontmatter: Record<string, string | string[]>;
  body: string;
} {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = raw.match(fmRegex);
  if (!match) return { frontmatter: {}, body: raw };

  const yamlBlock = match[1];
  const body = raw.slice(match[0].length);
  const frontmatter: Record<string, string | string[]> = {};

  let currentKey = '';
  let inArray = false;
  const arrayValues: string[] = [];

  const lines = yamlBlock.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;

    // Array item
    if (line.match(/^\s+-\s+/)) {
      const val = line.replace(/^\s+-\s+/, '').replace(/^['"]|['"]$/g, '').trim();
      arrayValues.push(val);
      inArray = true;
      continue;
    }

    // Key: value
    const kvMatch = line.match(/^(\w[\w\s-]*):\s*(.*)?$/);
    if (kvMatch) {
      if (inArray && currentKey) {
        frontmatter[currentKey] = [...arrayValues];
        arrayValues.length = 0;
        inArray = false;
      }
      currentKey = kvMatch[1].trim();
      const val = (kvMatch[2] || '').replace(/^['"]|['"]$/g, '').trim();

      // Inline array: [a, b, c]
      if (val.startsWith('[') && val.endsWith(']')) {
        frontmatter[currentKey] = val
          .slice(1, -1)
          .split(',')
          .map((v) => v.replace(/^['"\s]+|['"\s]+$/g, '').trim())
          .filter(Boolean);
      } else if (val === '' || val === '|' || val === '>') {
        // Will be filled by array items below
        inArray = false;
      } else {
        frontmatter[currentKey] = val;
      }
    }
  }

  if (inArray && currentKey && arrayValues.length > 0) {
    frontmatter[currentKey] = [...arrayValues];
  }

  return { frontmatter, body };
}

// ── Extract wiki-links [[...]] ────────────────────────────────────────────────
function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
  const links: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    links.push(m[1].trim());
  }
  return [...new Set(links)];
}

// ── Extract inline #tags ──────────────────────────────────────────────────────
function extractInlineTags(content: string): string[] {
  const regex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    tags.push(m[1]);
  }
  return [...new Set(tags)];
}

// ── Detect note type from frontmatter / tags / content ───────────────────────
function detectNoteType(
  fm: Record<string, string | string[]>,
  tags: string[],
  content: string
): ParsedNote['type'] {
  const typeVal = (fm['type'] || fm['note-type'] || '').toString().toLowerCase();
  if (typeVal.includes('moc') || typeVal.includes('map')) return 'moc';
  if (typeVal.includes('lit') || typeVal.includes('source') || typeVal.includes('reference')) return 'literature';
  if (typeVal.includes('perm') || typeVal.includes('evergreen') || typeVal.includes('atomic')) return 'permanent';
  if (typeVal.includes('fleet') || typeVal.includes('inbox') || typeVal.includes('scratch')) return 'fleeting';

  const allTags = tags.map((t) => t.toLowerCase());
  if (allTags.some((t) => ['moc', 'map-of-content', 'index'].includes(t))) return 'moc';
  if (allTags.some((t) => ['literature', 'reference', 'source', 'book'].includes(t))) return 'literature';
  if (allTags.some((t) => ['permanent', 'evergreen', 'atomic'].includes(t))) return 'permanent';
  if (allTags.some((t) => ['fleeting', 'inbox', 'scratch', 'todo'].includes(t))) return 'fleeting';

  // Heuristic: many links = MOC
  const wikiLinks = extractWikiLinks(content);
  if (wikiLinks.length >= 6) return 'moc';

  return 'fleeting';
}

// ── Parse a single .md file ───────────────────────────────────────────────────
function parseMarkdownFile(filename: string, filePath: string, rawContent: string): ParsedNote {
  const { frontmatter, body } = parseFrontmatter(rawContent);

  // Title from frontmatter or first H1 or filename
  let title =
    (frontmatter['title'] as string) ||
    (frontmatter['name'] as string) ||
    '';

  if (!title) {
    const h1Match = body.match(/^#\s+(.+)$/m);
    title = h1Match ? h1Match[1].trim() : filename.replace(/\.md$/i, '');
  }

  // Tags from frontmatter
  let fmTags: string[] = [];
  const rawTags = frontmatter['tags'];
  if (Array.isArray(rawTags)) {
    fmTags = rawTags.map((t) => String(t).toLowerCase().trim()).filter(Boolean);
  } else if (typeof rawTags === 'string') {
    fmTags = rawTags
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, '').toLowerCase().trim())
      .filter(Boolean);
  }

  // Inline tags
  const inlineTags = extractInlineTags(body);
  const allTags = [...new Set([...fmTags, ...inlineTags])];

  // Wiki-links
  const wikiLinks = extractWikiLinks(body);

  // Note type
  const type = detectNoteType(frontmatter, allTags, body);

  // Dates
  const createdStr = frontmatter['created'] || frontmatter['date'] || frontmatter['createdAt'];
  const updatedStr = frontmatter['updated'] || frontmatter['modified'] || frontmatter['updatedAt'];
  const createdAt = createdStr ? new Date(createdStr as string) : new Date();
  const updatedAt = updatedStr ? new Date(updatedStr as string) : new Date();

  // Folder path from file path
  const parts = filePath.split('/');
  const folderPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';

  return {
    id: uuidv4(),
    filename,
    path: filePath,
    title: title || 'Untitled',
    content: body,
    rawContent,
    tags: allTags,
    type,
    wikiLinks,
    frontmatter,
    createdAt: isNaN(createdAt.getTime()) ? new Date() : createdAt,
    updatedAt: isNaN(updatedAt.getTime()) ? new Date() : updatedAt,
    folderPath,
  };
}

// ── Read files from FileList ──────────────────────────────────────────────────
async function readFiles(
  fileList: FileList,
  onProgress: (n: number) => void
): Promise<{ parsed: ParsedNote[]; failed: string[] }> {
  const parsed: ParsedNote[] = [];
  const failed: string[] = [];
  const files = Array.from(fileList).filter((f) => f.name.endsWith('.md'));

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const text = await file.text();
      // Build relative path from webkitRelativePath or just name
      const filePath =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const note = parseMarkdownFile(file.name, filePath, text);
      parsed.push(note);
    } catch {
      failed.push(file.name);
    }
    onProgress(i + 1);
  }

  return { parsed, failed };
}

// ── Resolve wiki-links to IDs ─────────────────────────────────────────────────
function resolveLinks(notes: ParsedNote[]): Map<string, string[]> {
  // Build title → id map (normalised)
  const titleToId = new Map<string, string>();
  notes.forEach((n) => {
    titleToId.set(n.title.toLowerCase(), n.id);
    titleToId.set(n.filename.replace(/\.md$/i, '').toLowerCase(), n.id);
  });

  const resolved = new Map<string, string[]>();
  notes.forEach((n) => {
    const ids: string[] = [];
    n.wikiLinks.forEach((link) => {
      const id = titleToId.get(link.toLowerCase());
      if (id && id !== n.id) ids.push(id);
    });
    resolved.set(n.id, ids);
  });
  return resolved;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  onClose: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export default function ObsidianImport({ onClose }: Props) {
  const { notes: existingNotes, folders: existingFolders, createFolder, updateNote } = useVaultStore();

  const [step, setStep] = useState<Step>('upload');
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedNotes, setParsedNotes] = useState<ParsedNote[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | ParsedNote['type']>('all');
  const [previewNote, setPreviewNote] = useState<ParsedNote | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'replace' | 'rename'>('skip');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);

  // ── Process dropped / selected files ─────────────────────────────────────
  const processFiles = useCallback(async (fileList: FileList) => {
    const mdCount = Array.from(fileList).filter((f) => f.name.endsWith('.md')).length;
    if (mdCount === 0) return;

    setStep('preview');

    const { parsed, failed } = await readFiles(fileList, () => {});

    const folders = new Set<string>();
    parsed.forEach((n) => { if (n.folderPath) folders.add(n.folderPath); });

    const s: ImportStats = {
      total: mdCount,
      parsed: parsed.length,
      withTags: parsed.filter((n) => n.tags.length > 0).length,
      withLinks: parsed.filter((n) => n.wikiLinks.length > 0).length,
      folders: folders.size,
      failed,
    };

    setParsedNotes(parsed);
    setStats(s);
    setSelectedNoteIds(new Set(parsed.map((n) => n.id)));
  }, []);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  // ── Import selected notes ─────────────────────────────────────────────────
  const doImport = useCallback(async () => {
    setStep('importing');

    const toImport = parsedNotes.filter((n) => selectedNoteIds.has(n.id));
    const resolvedLinks = resolveLinks(toImport);

    // Build folder map: folderPath → folder id
    const folderMap = new Map<string, string>();
    const existingFoldersByName = new Map<string, string>(existingFolders.map((f) => [f.name, f.id]));

    for (const note of toImport) {
      if (note.folderPath) {
        const parts = note.folderPath.split('/');
        let parentId: string | null = null;
              for (const part of parts) {
        const key: string = parentId ? `${parentId}/${part}` : part;
          if (!folderMap.has(key)) {
            if (existingFoldersByName.has(part)) {
              folderMap.set(key, existingFoldersByName.get(part)!);
            } else {
              const folder = createFolder(part, parentId);
              folderMap.set(key, folder.id);
              existingFoldersByName.set(part, folder.id);
            }
          }
          parentId = folderMap.get(key) || null;
        }
      }
    }

    // Build existing title set for duplicate check
    const existingTitles = new Map(existingNotes.map((n) => [n.title.toLowerCase(), n.id]));

    let count = 0;
    const store = useVaultStore.getState();

    for (const pn of toImport) {
      // Duplicate handling
      const existingId = existingTitles.get(pn.title.toLowerCase());
      if (existingId) {
        if (duplicateStrategy === 'skip') { count++; continue; }
        if (duplicateStrategy === 'replace') {
          updateNote(existingId, {
            content: pn.content,
            tags: pn.tags,
            updatedAt: pn.updatedAt,
          });
          count++;
          setImportedCount(count);
          continue;
        }
        // rename: append (imported) suffix
        pn.title = `${pn.title} (imported)`;
      }

      // Get folder id
      let folderId: string | null = null;
      if (pn.folderPath) {
        const parts = pn.folderPath.split('/');
        let key = '';
        for (let i = 0; i < parts.length; i++) {
          key = i === 0 ? parts[i] : `${key}/${parts[i]}`;
        }
        folderId = folderMap.get(key) || null;
      }

      // Add to store directly (bypass createNote to preserve dates and links)
      const resolvedLinkIds = resolvedLinks.get(pn.id) || [];
      const newNote = {
        id: pn.id,
        title: pn.title,
        content: pn.content,
        type: pn.type,
        tags: pn.tags,
        folderId,
        createdAt: pn.createdAt,
        updatedAt: pn.updatedAt,
        isFavorite: false,
        isHidden: false,
        linkedNoteIds: resolvedLinkIds,
        wordCount: pn.content.split(/\s+/).filter(Boolean).length,
        isDaily: false,
      };

      useVaultStore.setState((state) => ({
        notes: [newNote, ...state.notes],
      }));

      existingTitles.set(pn.title.toLowerCase(), pn.id);
      count++;
      setImportedCount(count);

      // Small delay to show progress
      if (count % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    // Auto-select first imported note
    if (toImport.length > 0) {
      store.setActiveNote(toImport[0].id);
      store.setPanelView('editor');
    }

    setStep('done');
    setImportedCount(count);
  }, [parsedNotes, selectedNoteIds, duplicateStrategy, existingNotes, existingFolders, createFolder, updateNote]);

  // ── Select all / none ─────────────────────────────────────────────────────
  const toggleAll = () => {
    const visible = filteredNotes.map((n) => n.id);
    const allSelected = visible.every((id) => selectedNoteIds.has(id));
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (allSelected) visible.forEach((id) => next.delete(id));
      else visible.forEach((id) => next.add(id));
      return next;
    });
  };

  const filteredNotes =
    filterType === 'all'
      ? parsedNotes
      : parsedNotes.filter((n) => n.type === filterType);

  const TYPE_ICONS: Record<string, string> = {
    fleeting: '⚡', literature: '📖', permanent: '💎', moc: '🗺️',
  };

  const TYPE_COLORS: Record<string, string> = {
    fleeting: '#f59e0b', literature: '#3b82f6', permanent: '#10b981', moc: '#8b5cf6',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(12,12,20,0.98)',
          border: '1px solid rgba(124,58,237,0.25)',
          boxShadow: '0 30px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}
            >
              <Package className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Import from Obsidian</h2>
              <p className="text-xs text-slate-500">
                {step === 'upload' && 'Upload your vault folder or .md files'}
                {step === 'preview' && `${parsedNotes.length} notes parsed — select which to import`}
                {step === 'importing' && `Importing ${importedCount} / ${selectedNoteIds.size} notes…`}
                {step === 'done' && `✅ ${importedCount} notes imported successfully!`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Step indicator ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-white/5 flex-shrink-0">
          {['Upload', 'Preview', 'Import'].map((label, i) => {
            const stepIdx = ['upload', 'preview', 'importing'].indexOf(step);
            const done = step === 'done' || i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={label} className="flex items-center">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: done || active ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${done || active ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)'}`,
                      color: done || active ? '#a78bfa' : '#475569',
                    }}
                  >
                    {done && step !== 'importing' ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                  </div>
                  <span
                    className="text-xs"
                    style={{ color: active ? '#a78bfa' : done ? '#6d28d9' : '#475569' }}
                  >
                    {label}
                  </span>
                </div>
                {i < 2 && <ChevronRight className="w-3 h-3 text-slate-700 mx-2" />}
              </div>
            );
          })}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">

            {/* ── UPLOAD STEP ─────────────────────────────────────────── */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col gap-4 p-6"
              >
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className="flex-1 flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all duration-200 min-h-48"
                  style={{
                    background: isDragOver ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `2px dashed ${isDragOver ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isDragOver ? '0 0 40px rgba(124,58,237,0.1) inset' : 'none',
                  }}
                  onClick={() => folderInputRef.current?.click()}
                >
                  <motion.div
                    animate={{ scale: isDragOver ? 1.08 : 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)' }}
                    >
                      <Upload className="w-7 h-7 text-violet-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-300">
                        {isDragOver ? 'Drop your vault here!' : 'Drop your Obsidian vault here'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Drag & drop a folder or .md files
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-sm text-slate-300 transition-all hover:text-violet-400"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-xs">Vault Folder</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-sm text-slate-300 transition-all hover:text-violet-400"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">Multiple .md</span>
                  </button>
                  <button
                    onClick={() => singleFileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-sm text-slate-300 transition-all hover:text-violet-400"
                    style={{
                      background: 'rgba(124,58,237,0.08)',
                      border: '1px solid rgba(124,58,237,0.2)',
                    }}
                  >
                    <FileText className="w-4 h-4 text-violet-400" />
                    <span className="text-xs text-violet-300">Single File</span>
                  </button>
                </div>

                {/* Info */}
                <div
                  className="flex gap-3 p-3.5 rounded-xl text-xs text-slate-400"
                  style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}
                >
                  <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-300 mb-1">What gets imported:</p>
                    <ul className="space-y-0.5 text-slate-500">
                      <li>✓ Markdown content &amp; formatting</li>
                      <li>✓ YAML frontmatter (title, tags, dates, type)</li>
                      <li>✓ [[Wiki-links]] resolved between notes</li>
                      <li>✓ Inline #tags from content</li>
                      <li>✓ Folder structure preserved</li>
                      <li>✓ Note type auto-detected</li>
                    </ul>
                  </div>
                </div>

                {/* Hidden inputs */}
                <input
                  ref={folderInputRef}
                  type="file"
                  className="hidden"
                  // @ts-expect-error non-standard attribute
                  webkitdirectory="true"
                  multiple
                  accept=".md"
                  onChange={(e) => e.target.files && processFiles(e.target.files)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".md"
                  onChange={(e) => e.target.files && processFiles(e.target.files)}
                />
                <input
                  ref={singleFileInputRef}
                  type="file"
                  className="hidden"
                  accept=".md"
                  onChange={(e) => e.target.files && processFiles(e.target.files)}
                />
              </motion.div>
            )}

            {/* ── PREVIEW STEP ────────────────────────────────────────── */}
            {step === 'preview' && stats && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Stats bar */}
                <div className="grid grid-cols-4 gap-px border-b border-white/5 flex-shrink-0">
                  {[
                    { label: 'Notes', value: stats.parsed, icon: FileText, color: '#a78bfa' },
                    { label: 'Tagged', value: stats.withTags, icon: Tag, color: '#34d399' },
                    { label: 'Linked', value: stats.withLinks, icon: Link, color: '#60a5fa' },
                    { label: 'Folders', value: stats.folders, icon: FolderOpen, color: '#f59e0b' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex flex-col items-center py-3 gap-0.5" style={{ background: 'rgba(255,255,255,0.01)' }}>
                      <Icon className="w-3.5 h-3.5 mb-0.5" style={{ color }} />
                      <span className="text-lg font-bold" style={{ color }}>{value}</span>
                      <span className="text-xs text-slate-600">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Failed files warning */}
                {stats.failed.length > 0 && (
                  <div
                    className="flex gap-2 items-start mx-4 mt-3 p-3 rounded-xl text-xs"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-red-400">
                      {stats.failed.length} file(s) could not be parsed: {stats.failed.join(', ')}
                    </span>
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 flex-shrink-0 flex-wrap gap-y-2">
                  {/* Filter by type */}
                  <div className="flex items-center gap-1">
                    {(['all', 'fleeting', 'literature', 'permanent', 'moc'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className="px-2 py-1 rounded-lg text-xs transition-all"
                        style={{
                          background: filterType === t ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${filterType === t ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          color: filterType === t ? '#a78bfa' : '#64748b',
                        }}
                      >
                        {t === 'all' ? 'All' : `${TYPE_ICONS[t]} ${t}`}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1" />

                  {/* Duplicate strategy */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>Duplicates:</span>
                    {(['skip', 'replace', 'rename'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setDuplicateStrategy(s)}
                        className="px-2 py-1 rounded-lg transition-all capitalize"
                        style={{
                          background: duplicateStrategy === s ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${duplicateStrategy === s ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          color: duplicateStrategy === s ? '#a78bfa' : '#64748b',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Select all */}
                  <button
                    onClick={toggleAll}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    {filteredNotes.every((n) => selectedNoteIds.has(n.id))
                      ? 'Deselect all'
                      : 'Select all'}
                  </button>
                </div>

                {/* Note list */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-white/[0.03]">
                    {filteredNotes.map((note, i) => {
                      const isSelected = selectedNoteIds.has(note.id);
                      const typeColor = TYPE_COLORS[note.type];
                      return (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.4) }}
                          className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-all cursor-pointer group"
                          onClick={() => {
                            setSelectedNoteIds((prev) => {
                              const next = new Set(prev);
                              isSelected ? next.delete(note.id) : next.add(note.id);
                              return next;
                            });
                          }}
                        >
                          {/* Checkbox */}
                          <div
                            className="w-4 h-4 rounded-[4px] flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                            style={{
                              background: isSelected ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isSelected ? 'rgba(124,58,237,0.7)' : 'rgba(255,255,255,0.1)'}`,
                            }}
                          >
                            {isSelected && (
                              <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none">
                                <path d="M1 4l3 3 5-6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>

                          {/* Type icon */}
                          <span className="text-sm flex-shrink-0 mt-0.5">{TYPE_ICONS[note.type]}</span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-slate-200 truncate">{note.title}</span>
                              {note.folderPath && (
                                <span className="text-xs text-slate-600 truncate hidden sm:inline">
                                  📁 {note.folderPath}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {note.tags.slice(0, 4).map((t) => (
                                <span key={t} className="text-xs text-slate-500">#{t}</span>
                              ))}
                              {note.tags.length > 4 && (
                                <span className="text-xs text-slate-600">+{note.tags.length - 4}</span>
                              )}
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {note.wikiLinks.length > 0 && (
                              <span className="text-xs text-slate-600 flex items-center gap-0.5">
                                <Link className="w-3 h-3" /> {note.wikiLinks.length}
                              </span>
                            )}
                            <div
                              className="text-xs px-1.5 py-0.5 rounded-md"
                              style={{ background: `${typeColor}15`, color: typeColor }}
                            >
                              {note.type}
                            </div>
                          </div>

                          {/* Preview button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewNote(previewNote?.id === note.id ? null : note);
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all text-slate-500 hover:text-slate-300"
                          >
                            <ChevronRight
                              className="w-3.5 h-3.5 transition-transform"
                              style={{ transform: previewNote?.id === note.id ? 'rotate(90deg)' : 'none' }}
                            />
                          </button>
                        </motion.div>
                      );
                    })}
                    {filteredNotes.length === 0 && (
                      <div className="text-center py-12 text-slate-600 text-sm">
                        No notes of this type
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-t border-white/5 flex-shrink-0"
                  style={{ background: 'rgba(10,10,20,0.6)' }}
                >
                  <span className="text-xs text-slate-500">
                    {selectedNoteIds.size} of {parsedNotes.length} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setParsedNotes([]); setStats(null); setStep('upload'); }}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 transition-all hover:text-slate-200"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={doImport}
                      disabled={selectedNoteIds.size === 0}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium text-white transition-all disabled:opacity-40"
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        boxShadow: '0 0 20px rgba(124,58,237,0.3)',
                      }}
                    >
                      Import {selectedNoteIds.size} notes
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── IMPORTING STEP ──────────────────────────────────────── */}
            {step === 'importing' && (
              <motion.div
                key="importing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center gap-6 p-8"
              >
                <div className="relative w-20 h-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    className="absolute inset-0"
                  >
                    <Loader2 className="w-20 h-20 text-violet-500 opacity-30" />
                  </motion.div>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">📦</div>
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium text-slate-300 mb-1">
                    Importing your vault…
                  </p>
                  <p className="text-xs text-slate-500">
                    {importedCount} / {selectedNoteIds.size} notes processed
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-xs rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(importedCount / Math.max(selectedNoteIds.size, 1)) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}

            {/* ── DONE STEP ───────────────────────────────────────────── */}
            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center gap-5 p-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
                >
                  🎉
                </motion.div>

                <div className="text-center">
                  <motion.h3
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-base font-semibold text-slate-200 mb-1"
                  >
                    Import complete!
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-slate-500"
                  >
                    {importedCount} notes imported into your Vault.
                    <br />
                    Wiki-links have been automatically resolved.
                  </motion.p>
                </div>

                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    boxShadow: '0 0 20px rgba(124,58,237,0.3)',
                  }}
                >
                  Open my notes →
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Preview sidebar (slides in over note list) ─────────────── */}
        <AnimatePresence>
          {previewNote && step === 'preview' && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="absolute right-0 top-0 bottom-0 w-72 overflow-y-auto rounded-r-2xl"
              style={{
                background: 'rgba(10,10,20,0.97)',
                borderLeft: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-300">Preview</span>
                  <button
                    onClick={() => setPreviewNote(null)}
                    className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-xs font-semibold text-violet-300 mb-1">{previewNote.title}</div>
                <div className="flex gap-1 flex-wrap mb-3">
                  {previewNote.tags.map((t) => (
                    <span key={t} className="text-xs text-slate-500">#{t}</span>
                  ))}
                </div>
                {previewNote.wikiLinks.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-slate-600 mb-1">Links ({previewNote.wikiLinks.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {previewNote.wikiLinks.map((l) => (
                        <span
                          key={l}
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}
                        >
                          [[{l}]]
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <pre
                  className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed overflow-hidden"
                  style={{ maxHeight: 400 }}
                >
                  {previewNote.content.slice(0, 800)}{previewNote.content.length > 800 ? '\n…' : ''}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
