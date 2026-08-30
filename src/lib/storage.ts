// 数据层：云端版（apiServer 的 /notes 接口）。
// 函数语义与 localStorage 时代一一对应，但全部异步。
// 本地仅保留：登录 token（lib/api.ts）、迁移标记、当前书 ID 偏好。
// 四类数据对齐 D1 表：quick_notes / books / reading_notes / work_reviews。
import { api } from './api';

export type NoteType = 'idea' | 'note';
export type HalfDay = 'am' | 'pm';

export interface Note {
  id: string;
  content: string;
  type: NoteType; // 存量兼容，UI 已不区分
  created_at: string; // 'YYYY-MM-DD HH:mm:ss'
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  lastChapter: string; // 当前章节上下文（可空）
  lastOpened: string;  // 书架排序用
}

// 章节目录：PC 后台（workbench）录入，C 端只读点选
export interface Chapter {
  id: string;
  bookId: string;
  seq: number;    // 目录顺序
  title: string;
}

export interface ReadingNote {
  id: string;
  bookId: string;
  book: string; // 冗余书名，展示与搜索用
  chapter: string; // 可空
  excerpt: string;
  thought: string;
  created_at: string;
  updated_at: string;
}

// 工作复盘：天/半天颗粒的产出小结
export interface WorkReview {
  id: string;
  date: string;    // 'YYYY-MM-DD'
  period: HalfDay; // 上午/下午
  project: string; // 项目/主题（可空）
  did: string;     // 做了什么
  output: string;  // 产出（可空）
  created_at: string;
  updated_at: string;
}

// 统一时间流条目（主界面混排展示）
export interface TimelineItem {
  kind: 'note' | 'reading' | 'work';
  id: string;
  created_at: string;
  note?: Note;
  reading?: ReadingNote;
  work?: WorkReview;
}

export interface NotesData {
  notes: Note[];
  books: Book[];
  reading: ReadingNote[];
  work: WorkReview[];
  chapters: Chapter[];
}

export function buildTimeline(d: NotesData): TimelineItem[] {
  return [
    ...d.notes.map(note => ({ kind: 'note' as const, id: note.id, created_at: note.created_at, note })),
    ...d.reading.map(reading => ({ kind: 'reading' as const, id: reading.id, created_at: reading.created_at, reading })),
    ...d.work.map(work => ({ kind: 'work' as const, id: work.id, created_at: work.created_at, work })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

/* ---------- 客户端工具 ---------- */

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function localNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 本地日期 key，offset 为相对今天的天数（0=今天，-1=昨天） */
export function dayKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dayKey();
}

/** 条目归属日期：复盘按业务日期，其余按创建日期（'YYYY-MM-DD'） */
export function itemDay(item: TimelineItem): string {
  return item.kind === 'work' ? item.work!.date : item.created_at.slice(0, 10);
}

export function nowHalfDay(): HalfDay {
  return new Date().getHours() < 12 ? 'am' : 'pm';
}

/* ---------- 全量拉取 ---------- */

export async function fetchAll(): Promise<NotesData> {
  return api<NotesData>('/notes/all');
}

/* ---------- 随手记 ---------- */

export async function addNote(content: string): Promise<Note> {
  const now = localNow();
  return api<Note>('/notes/notes', {
    method: 'POST',
    body: JSON.stringify({ id: genId(), content, type: 'idea', created_at: now, updated_at: now }),
  });
}

export async function updateNote(id: string, content: string): Promise<void> {
  await api(`/notes/notes/${id}`, { method: 'PUT', body: JSON.stringify({ content, updated_at: localNow() }) });
}

export async function deleteNote(id: string): Promise<void> {
  await api(`/notes/notes/${id}`, { method: 'DELETE' });
}

/* ---------- 书架 ---------- */

export async function addBook(title: string): Promise<Book> {
  return api<Book>('/notes/books', {
    method: 'POST',
    body: JSON.stringify({ id: genId(), title, lastOpened: localNow() }),
  });
}

/** 局部更新：title / lastChapter / lastOpened 任意组合 */
export async function updateBook(id: string, patch: { title?: string; lastChapter?: string; lastOpened?: string }): Promise<void> {
  await api(`/notes/books/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

/** 删书及其全部读书笔记（服务端级联） */
export async function deleteBook(id: string): Promise<void> {
  await api(`/notes/books/${id}`, { method: 'DELETE' });
}

/* ---------- 当前书（本地偏好，不入库） ---------- */

const CURRENT_BOOK_KEY = 'quicknotes.currentBook';

export function currentBookId(): string | null {
  try {
    return localStorage.getItem(CURRENT_BOOK_KEY);
  } catch {
    return null;
  }
}

export function setCurrentBookId(id: string) {
  try {
    localStorage.setItem(CURRENT_BOOK_KEY, id);
  } catch {}
}

/* ---------- 读书笔记 ---------- */

export async function addReading(book: Book, chapter: string, excerpt: string, thought: string): Promise<void> {
  const now = localNow();
  await api('/notes/reading', {
    method: 'POST',
    body: JSON.stringify({ id: genId(), bookId: book.id, book: book.title, chapter, excerpt, thought, created_at: now, updated_at: now }),
  });
}

export async function updateReading(id: string, chapter: string, excerpt: string, thought: string): Promise<void> {
  await api(`/notes/reading/${id}`, { method: 'PUT', body: JSON.stringify({ chapter, excerpt, thought, updated_at: localNow() }) });
}

export async function deleteReading(id: string): Promise<void> {
  await api(`/notes/reading/${id}`, { method: 'DELETE' });
}

/* ---------- 工作复盘 ---------- */

export async function addWorkReview(date: string, period: HalfDay, project: string, did: string, output: string): Promise<void> {
  const now = localNow();
  await api('/notes/work', {
    method: 'POST',
    body: JSON.stringify({ id: genId(), date, period, project, did, output, created_at: now, updated_at: now }),
  });
}

export async function updateWorkReview(id: string, date: string, period: HalfDay, project: string, did: string, output: string): Promise<void> {
  await api(`/notes/work/${id}`, { method: 'PUT', body: JSON.stringify({ date, period, project, did, output, updated_at: localNow() }) });
}

export async function deleteWorkReview(id: string): Promise<void> {
  await api(`/notes/work/${id}`, { method: 'DELETE' });
}

/* ---------- 存量迁移：localStorage → 云端（登录后执行一次） ---------- */

const MIGRATED_KEY = 'quicknotes.migrated';

function loadLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

/** 幂等（本地标记 + 服务端 upsert）；旧数据保留在本地不删除 */
export async function migrateLocalToCloud(): Promise<{ imported: number; skipped: number } | null> {
  try {
    if (localStorage.getItem(MIGRATED_KEY) === '1') return null;
  } catch {
    return null;
  }
  const payload = {
    notes: loadLocal<Note>('quicknotes.notes'),
    books: loadLocal<Book>('quicknotes.books'),
    reading: loadLocal<ReadingNote>('quicknotes.reading'),
    work: loadLocal<WorkReview>('quicknotes.work'),
  };
  let result: { imported: number; skipped: number } | null = null;
  const total = payload.notes.length + payload.books.length + payload.reading.length + payload.work.length;
  if (total > 0) {
    result = await api<{ imported: number; skipped: number }>('/notes/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  try {
    localStorage.setItem(MIGRATED_KEY, '1');
  } catch {}
  return result;
}
