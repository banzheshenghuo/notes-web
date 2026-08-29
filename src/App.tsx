import { useEffect, useMemo, useState } from 'react';
import Composer from './components/Composer';
import NoteCard from './components/NoteCard';
import BookSpace from './components/BookSpace';
import Shelf from './components/Shelf';
import ReviewSheet from './components/ReviewSheet';
import {
  TimelineItem, WorkReview, NotesData, buildTimeline,
  fetchAll, migrateLocalToCloud, localNow,
  addNote, updateNote, deleteNote, deleteReading, deleteWorkReview,
  addBook, updateBook,
  currentBookId, setCurrentBookId,
  addWorkReview, updateWorkReview,
} from './lib/storage';

type View = 'main' | 'book' | 'shelf';

const EMPTY: NotesData = { notes: [], books: [], reading: [], work: [] };

export default function App() {
  const [view, setView] = useState<View>('main');
  const [data, setData] = useState<NotesData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null); // 随手记编辑
  const [editReadingId, setEditReadingId] = useState<string | null>(null); // 读书笔记编辑（跳书空间）
  const [bookId, setBookId] = useState<string | null>(currentBookId);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false); // 工作复盘抽屉
  const [reviewEdit, setReviewEdit] = useState<WorkReview | null>(null);

  const book = useMemo(() => data.books.find(b => b.id === bookId) ?? null, [data.books, bookId]);

  const refresh = async () => {
    try {
      setData(await fetchAll());
      setLoadErr(false);
    } catch (e) {
      console.error('load failed', e);
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  };

  // 登录后首载：一次性迁移旧 localStorage 数据 → 全量拉取云端
  useEffect(() => {
    (async () => {
      try {
        const r = await migrateLocalToCloud();
        if (r) console.log('localStorage 存量已迁移', r);
      } catch (e) {
        console.error('migrate failed', e);
      }
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeline = useMemo(() => buildTimeline(data), [data]);

  const submitQuick = async () => {
    const content = draft.trim();
    if (!content) return;
    try {
      if (editingId) {
        await updateNote(editingId, content);
        setEditingId(null);
      } else {
        await addNote(content);
      }
      setDraft('');
      await refresh();
    } catch (e) {
      console.error('save failed', e);
    }
  };

  const startEdit = (item: TimelineItem) => {
    if (item.kind === 'reading') {
      setEditReadingId(item.id);
      setView('book');
    } else if (item.kind === 'work') {
      setReviewEdit(item.work!);
      setReviewOpen(true);
    } else {
      setEditingId(item.id);
      setDraft(item.note!.content);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('删除这条记录？')) return;
    const item = timeline.find(x => x.id === id);
    try {
      if (item?.kind === 'reading') {
        await deleteReading(id);
      } else if (item?.kind === 'work') {
        await deleteWorkReview(id);
      } else {
        await deleteNote(id);
        if (editingId === id) {
          setEditingId(null);
          setDraft('');
        }
      }
      await refresh();
    } catch (e) {
      console.error('delete failed', e);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return timeline;
    return timeline.filter(item => {
      if (item.kind === 'reading') {
        const r = item.reading!;
        return `${r.book} ${r.chapter} ${r.excerpt} ${r.thought}`.toLowerCase().includes(q);
      }
      if (item.kind === 'work') {
        const w = item.work!;
        return `${w.project} ${w.did} ${w.output}`.toLowerCase().includes(q);
      }
      return item.note!.content.toLowerCase().includes(q);
    });
  }, [timeline, query]);

  const selectBook = async (id: string) => {
    setCurrentBookId(id);
    setBookId(id);
    setView('book');
    try {
      await updateBook(id, { lastOpened: localNow() });
      await refresh();
    } catch (e) {
      console.error('touch book failed', e);
    }
  };

  if (loading) {
    return <div className="h-dvh flex items-center justify-center text-sm text-stone-300">加载中…</div>;
  }
  if (loadErr && timeline.length === 0) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4 text-sm text-stone-400">
        加载失败
        <button onClick={refresh} className="bg-stone-800 text-white px-4 py-2 rounded-xl active:opacity-70">
          重试
        </button>
      </div>
    );
  }

  if (view === 'shelf') {
    return (
      <Shelf
        books={data.books}
        reading={data.reading}
        currentId={bookId}
        onBack={() => setView('main')}
        onSelect={selectBook}
        onAdd={async t => {
          const b = await addBook(t);
          setCurrentBookId(b.id);
          setBookId(b.id);
          await refresh();
        }}
        onChanged={refresh}
      />
    );
  }

  if (view === 'book' && book) {
    return (
      <BookSpace
        book={book}
        reading={data.reading.filter(r => r.bookId === book.id)}
        onBack={() => setView('main')}
        editId={editReadingId}
        onDoneEdit={() => setEditReadingId(null)}
        onChanged={refresh}
      />
    );
  }

  // 主视图：头部固定，仅时间流列表滚动
  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="w-full max-w-[680px] mx-auto px-4 pt-4 pb-2 shrink-0">
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={submitQuick}
          editing={editingId !== null}
          onCancelEdit={() => { setEditingId(null); setDraft(''); }}
        />
        <div className="mt-2 flex flex-col gap-1.5">
          {/* 正在读横条：进入书的空间 / 书架 */}
          <button
            onClick={() => book ? setView('book') : setView('shelf')}
            className="w-full bg-white/80 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm active:bg-white"
          >
            <span className="text-sm">{book ? `📖 正在读《${book.title}》` : '📖 选择一本在读的书'}</span>
            {book?.lastChapter && <span className="text-xs text-amber-600 truncate">{book.lastChapter}</span>}
            <span className="flex-1" />
            <span
              onClick={e => { e.stopPropagation(); setView('shelf'); }}
              className="text-xs text-stone-400 px-2 py-1"
            >
              书架
            </span>
            <span className="text-stone-300 text-sm">›</span>
          </button>
          {/* 工作复盘入口 */}
          <button
            onClick={() => { setReviewEdit(null); setReviewOpen(true); }}
            className="w-full bg-white/80 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm active:bg-white"
          >
            <span className="text-sm text-stone-600">📋 工作复盘</span>
            <span className="flex-1" />
            <span className="text-xs text-stone-300">记一笔今日小结</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-[680px] mx-auto px-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 py-3 shrink-0">
          {searchOpen ? (
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onBlur={() => !query && setSearchOpen(false)}
              placeholder="搜索（含书名/项目）…"
              className="flex-1 bg-stone-200/70 rounded-xl px-3 py-2 text-sm outline-none"
            />
          ) : (
            <>
              <span className="text-xs text-stone-400 flex-1">
                {filtered.length === timeline.length ? `${timeline.length} 条` : `${filtered.length} / ${timeline.length} 条`}
              </span>
              <button
                onClick={() => setSearchOpen(true)}
                className="text-xs text-stone-400 active:text-stone-800 px-2 py-1"
              >
                搜索
              </button>
            </>
          )}
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
          style={{ paddingBottom: 'calc(48px + env(safe-area-inset-bottom))' }}
        >
          {filtered.length === 0 ? (
            <div className="text-center text-stone-300 text-sm py-16">
              {timeline.length === 0 ? '记下第一条吧' : '没有匹配的记录'}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 pb-8">
              {filtered.map(item => (
                <NoteCard
                  key={item.id}
                  item={item}
                  onEdit={() => startEdit(item)}
                  onDelete={() => remove(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {reviewOpen && (
        <ReviewSheet
          init={reviewEdit}
          projects={[...new Set(data.work.map(w => w.project).filter(Boolean))]}
          onClose={() => setReviewOpen(false)}
          onSave={async v => {
            try {
              if (reviewEdit) await updateWorkReview(reviewEdit.id, v.date, v.period, v.project, v.did, v.output);
              else await addWorkReview(v.date, v.period, v.project, v.did, v.output);
              setReviewOpen(false);
              await refresh();
            } catch (e) {
              console.error('save review failed', e);
            }
          }}
        />
      )}
    </div>
  );
}
