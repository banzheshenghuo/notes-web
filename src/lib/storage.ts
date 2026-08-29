// 存储层：localStorage 薄封装。
// 四类归属：书架(books) → 读书笔记(reading，含可选 chapter)；随手记(notes)；工作复盘(work，天/半天颗粒)。
// 字段对齐未来 D1：books / notes / reading_notes / work_reviews 四张表，迁移时各走一次 import。

export type NoteType = 'idea' | 'note';
export type HalfDay = 'am' | 'pm';

export interface Note {
  id: string;
  content: string;
  type: NoteType;
  created_at: string; // 'YYYY-MM-DD HH:mm:ss'
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  lastChapter: string; // 当前章节上下文（可空）
  lastOpened: string;  // 书架排序用
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

const NOTES_KEY = 'quicknotes.notes';
const READING_KEY = 'quicknotes.reading';
const BOOKS_KEY = 'quicknotes.books';
const CURRENT_BOOK_KEY = 'quicknotes.currentBook';
const WORK_KEY = 'quicknotes.work';

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

/* ---------- 随手记（单一类型，type 字段仅为存量兼容保留） ---------- */

export function loadNotes(): Note[] {
  return load<Note>(NOTES_KEY);
}

export function addNote(content: string): Note {
  const now = localNow();
  const note: Note = { id: genId(), content, type: 'idea', created_at: now, updated_at: now };
  save(NOTES_KEY, [note, ...loadNotes()]);
  return note;
}

export function updateNote(id: string, content: string): Note | null {
  const notes = loadNotes();
  const n = notes.find(x => x.id === id);
  if (!n) return null;
  n.content = content;
  n.updated_at = localNow();
  save(NOTES_KEY, notes);
  return n;
}

export function deleteNote(id: string) {
  save(NOTES_KEY, loadNotes().filter(n => n.id !== id));
}

/* ---------- 书架 ---------- */

export function loadBooks(): Book[] {
  migrate();
  return load<Book>(BOOKS_KEY).sort((a, b) => (a.lastOpened < b.lastOpened ? 1 : -1));
}

export function addBook(title: string): Book {
  const now = localNow();
  const book: Book = { id: genId(), title, lastChapter: '', lastOpened: now };
  save(BOOKS_KEY, [...load<Book>(BOOKS_KEY), book]);
  return book;
}

export function touchBook(id: string) {
  const books = load<Book>(BOOKS_KEY);
  const b = books.find(x => x.id === id);
  if (b) {
    b.lastOpened = localNow();
    save(BOOKS_KEY, books);
  }
}

export function setBookChapter(id: string, chapter: string) {
  const books = load<Book>(BOOKS_KEY);
  const b = books.find(x => x.id === id);
  if (b) {
    b.lastChapter = chapter;
    save(BOOKS_KEY, books);
  }
}

/** 删书及其全部读书笔记 */
export function deleteBook(id: string) {
  save(BOOKS_KEY, load<Book>(BOOKS_KEY).filter(b => b.id !== id));
  save(READING_KEY, load<ReadingNote>(READING_KEY).filter(r => r.bookId !== id));
  if (localStorage.getItem(CURRENT_BOOK_KEY) === id) {
    localStorage.removeItem(CURRENT_BOOK_KEY);
  }
}

export function currentBook(): Book | null {
  migrate();
  const id = localStorage.getItem(CURRENT_BOOK_KEY);
  if (!id) return null;
  return load<Book>(BOOKS_KEY).find(b => b.id === id) || null;
}

export function setCurrentBook(id: string) {
  localStorage.setItem(CURRENT_BOOK_KEY, id);
  touchBook(id);
}

// 存量迁移：旧版读书笔记只有 book 字符串，补建 books 集合并回填 bookId/chapter
let migrated = false;
function migrate() {
  if (migrated) return;
  migrated = true;
  const reading = load<ReadingNote>(READING_KEY);
  const hasBooks = localStorage.getItem(BOOKS_KEY) !== null;
  if (hasBooks || reading.length === 0) return;
  const now = localNow();
  const books: Book[] = [];
  const idByTitle = new Map<string, string>();
  for (const r of reading) {
    if (!idByTitle.has(r.book)) {
      const id = genId();
      idByTitle.set(r.book, id);
      books.push({ id, title: r.book, lastChapter: '', lastOpened: now });
    }
    r.bookId = idByTitle.get(r.book)!;
    if (r.chapter === undefined) r.chapter = '';
  }
  save(BOOKS_KEY, books);
  save(READING_KEY, reading);
  localStorage.setItem(CURRENT_BOOK_KEY, books[0].id);
}

/* ---------- 读书笔记 ---------- */

export function loadReading(): ReadingNote[] {
  migrate();
  return load<ReadingNote>(READING_KEY);
}

export function readingOfBook(bookId: string): ReadingNote[] {
  return loadReading().filter(r => r.bookId === bookId);
}

/** 本书用过的章节（chip 候选） */
export function chaptersUsed(bookId: string): string[] {
  const seen = new Set<string>();
  for (const r of readingOfBook(bookId)) {
    if (r.chapter) seen.add(r.chapter);
  }
  return [...seen];
}

export function addReading(book: Book, chapter: string, excerpt: string, thought: string): ReadingNote {
  const now = localNow();
  const r: ReadingNote = {
    id: genId(), bookId: book.id, book: book.title, chapter, excerpt, thought,
    created_at: now, updated_at: now,
  };
  save(READING_KEY, [r, ...loadReading()]);
  return r;
}

export function updateReading(id: string, chapter: string, excerpt: string, thought: string): ReadingNote | null {
  const arr = loadReading();
  const r = arr.find(x => x.id === id);
  if (!r) return null;
  r.chapter = chapter;
  r.excerpt = excerpt;
  r.thought = thought;
  r.updated_at = localNow();
  save(READING_KEY, arr);
  return r;
}

export function deleteReading(id: string) {
  save(READING_KEY, loadReading().filter(r => r.id !== id));
}

/* ---------- 时间流 ---------- */

export function loadTimeline(): TimelineItem[] {
  const items: TimelineItem[] = [
    ...loadNotes().map(note => ({ kind: 'note' as const, id: note.id, created_at: note.created_at, note })),
    ...loadReading().map(reading => ({ kind: 'reading' as const, id: reading.id, created_at: reading.created_at, reading })),
    ...loadWork().map(work => ({ kind: 'work' as const, id: work.id, created_at: work.created_at, work })),
  ];
  return items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

/* ---------- 工作复盘 ---------- */

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowHalfDay(): HalfDay {
  return new Date().getHours() < 12 ? 'am' : 'pm';
}

export function loadWork(): WorkReview[] {
  return load<WorkReview>(WORK_KEY);
}

export function addWorkReview(date: string, period: HalfDay, project: string, did: string, output: string): WorkReview {
  const now = localNow();
  const w: WorkReview = { id: genId(), date, period, project, did, output, created_at: now, updated_at: now };
  save(WORK_KEY, [w, ...loadWork()]);
  return w;
}

export function updateWorkReview(id: string, date: string, period: HalfDay, project: string, did: string, output: string): WorkReview | null {
  const arr = loadWork();
  const w = arr.find(x => x.id === id);
  if (!w) return null;
  w.date = date;
  w.period = period;
  w.project = project;
  w.did = did;
  w.output = output;
  w.updated_at = localNow();
  save(WORK_KEY, arr);
  return w;
}

export function deleteWorkReview(id: string) {
  save(WORK_KEY, loadWork().filter(w => w.id !== id));
}

/** 用过的项目/主题（datalist 候选） */
export function projectsUsed(): string[] {
  const seen = new Set<string>();
  for (const w of loadWork()) {
    if (w.project) seen.add(w.project);
  }
  return [...seen];
}
