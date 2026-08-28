// 存储层：localStorage 薄封装，两类记录分库存储。
// - notes（想法/随手记）：id/content/type/created_at/updated_at，对齐 D1 notes 表
// - reading（读书笔记）：id/book/excerpt/thought/created_at/updated_at，对齐 D1 reading_notes 表
// v2 迁移时各自走一次 import 接口即可，无需转换。

export type NoteType = 'idea' | 'note';

export interface Note {
  id: string;
  content: string;
  type: NoteType;
  created_at: string; // 'YYYY-MM-DD HH:mm:ss'
  updated_at: string;
}

export interface ReadingNote {
  id: string;
  book: string;
  excerpt: string;
  thought: string;
  created_at: string;
  updated_at: string;
}

// 统一时间流条目（展示用）
export interface TimelineItem {
  kind: 'note' | 'reading';
  id: string;
  created_at: string;
  note?: Note;
  reading?: ReadingNote;
}

const NOTES_KEY = 'quicknotes.notes';
const READING_KEY = 'quicknotes.reading';
const TYPE_PREF_KEY = 'quicknotes.typePref';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function localNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

function save(key: string, arr: unknown[]) {
  localStorage.setItem(key, JSON.stringify(arr));
}

/* ---------- 想法 / 随手记 ---------- */

export function loadNotes(): Note[] {
  return load<Note>(NOTES_KEY);
}

export function addNote(content: string, type: NoteType): Note {
  const now = localNow();
  const note: Note = { id: genId(), content, type, created_at: now, updated_at: now };
  save(NOTES_KEY, [note, ...loadNotes()]);
  return note;
}

export function updateNote(id: string, content: string, type: NoteType): Note | null {
  const notes = loadNotes();
  const n = notes.find(x => x.id === id);
  if (!n) return null;
  n.content = content;
  n.type = type;
  n.updated_at = localNow();
  save(NOTES_KEY, notes);
  return n;
}

export function deleteNote(id: string) {
  save(NOTES_KEY, loadNotes().filter(n => n.id !== id));
}

/* ---------- 读书笔记 ---------- */

export function loadReading(): ReadingNote[] {
  return load<ReadingNote>(READING_KEY);
}

export function addReading(book: string, excerpt: string, thought: string): ReadingNote {
  const now = localNow();
  const r: ReadingNote = { id: genId(), book, excerpt, thought, created_at: now, updated_at: now };
  save(READING_KEY, [r, ...loadReading()]);
  return r;
}

export function updateReading(id: string, book: string, excerpt: string, thought: string): ReadingNote | null {
  const arr = loadReading();
  const r = arr.find(x => x.id === id);
  if (!r) return null;
  r.book = book;
  r.excerpt = excerpt;
  r.thought = thought;
  r.updated_at = localNow();
  save(READING_KEY, arr);
  return r;
}

export function deleteReading(id: string) {
  save(READING_KEY, loadReading().filter(r => r.id !== id));
}

/** 书架：按最近使用排序的历史书名 */
export function listBooks(): string[] {
  const seen = new Map<string, string>(); // book -> 最近时间
  for (const r of loadReading()) {
    if (r.book && !seen.has(r.book)) seen.set(r.book, r.created_at);
  }
  return [...seen.keys()];
}

/** 最近一本（默认带出） */
export function lastBook(): string {
  const books = listBooks();
  return books.length ? books[0] : '';
}

/* ---------- 时间流 / 偏好 ---------- */

export function loadTimeline(): TimelineItem[] {
  const items: TimelineItem[] = [
    ...loadNotes().map(note => ({ kind: 'note' as const, id: note.id, created_at: note.created_at, note })),
    ...loadReading().map(reading => ({ kind: 'reading' as const, id: reading.id, created_at: reading.created_at, reading })),
  ];
  return items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function getTypePref(): 'quick' | 'reading' {
  return localStorage.getItem(TYPE_PREF_KEY) === 'reading' ? 'reading' : 'quick';
}

export function setTypePref(t: 'quick' | 'reading') {
  localStorage.setItem(TYPE_PREF_KEY, t);
}
