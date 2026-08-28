// 存储层：localStorage 薄封装。
// Note 字段与未来 apiServer D1 的 notes 表对齐（id/content/type/created_at/updated_at），
// 迁移时直接 POST /api/c/v1/notes/import 即可，无需转换。

export type NoteType = 'idea' | 'note' | 'reading';

export interface Note {
  id: string;
  content: string;
  type: NoteType;
  created_at: string; // ISO 本地时间 'YYYY-MM-DD HH:mm:ss'
  updated_at: string;
}

const KEY = 'quicknotes.notes';
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

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Note[]) : [];
  } catch {
    return [];
  }
}

function save(notes: Note[]) {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function addNote(content: string, type: NoteType): Note {
  const now = localNow();
  const note: Note = { id: genId(), content, type, created_at: now, updated_at: now };
  save([note, ...loadNotes()]);
  return note;
}

export function updateNote(id: string, content: string, type: NoteType): Note | null {
  const notes = loadNotes();
  const n = notes.find(x => x.id === id);
  if (!n) return null;
  n.content = content;
  n.type = type;
  n.updated_at = localNow();
  save(notes);
  return n;
}

export function deleteNote(id: string) {
  save(loadNotes().filter(n => n.id !== id));
}

export function getTypePref(): NoteType {
  const t = localStorage.getItem(TYPE_PREF_KEY);
  return t === 'note' || t === 'reading' ? t : 'idea';
}

export function setTypePref(t: NoteType) {
  localStorage.setItem(TYPE_PREF_KEY, t);
}
