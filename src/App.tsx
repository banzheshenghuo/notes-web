import { useMemo, useState } from 'react';
import Composer from './components/Composer';
import NoteCard from './components/NoteCard';
import BookSpace from './components/BookSpace';
import Shelf from './components/Shelf';
import ReviewSheet from './components/ReviewSheet';
import {
  TimelineItem, Book, WorkReview,
  deleteReading, deleteWorkReview, deleteNote,
  loadTimeline, addNote, updateNote,
  addBook, currentBook, setCurrentBook,
  addWorkReview, updateWorkReview,
} from './lib/storage';

type View = 'main' | 'book' | 'shelf';

export default function App() {
  const [view, setView] = useState<View>('main');
  const [timeline, setTimeline] = useState<TimelineItem[]>(loadTimeline);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null); // 随手记编辑
  const [editReadingId, setEditReadingId] = useState<string | null>(null); // 读书笔记编辑（跳书空间）
  const [book, setBook] = useState<Book | null>(() => currentBook());
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false); // 工作复盘抽屉
  const [reviewEdit, setReviewEdit] = useState<WorkReview | null>(null);

  const refresh = () => {
    setTimeline(loadTimeline());
    setBook(currentBook());
  };

  const submitQuick = () => {
    const content = draft.trim();
    if (!content) return;
    if (editingId) {
      updateNote(editingId, content);
      setEditingId(null);
    } else {
      addNote(content);
    }
    setDraft('');
    refresh();
  };

  const startEdit = (item: TimelineItem) => {
    if (item.kind === 'reading') {
      setEditReadingId(item.id);
      setBook(currentBook());
      setView('book');
    } else if (item.kind === 'work') {
      setReviewEdit(item.work!);
      setReviewOpen(true);
      return;
    } else {
      setEditingId(item.id);
      setDraft(item.note!.content);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (id: string) => {
    if (!confirm('删除这条记录？')) return;
    const item = timeline.find(x => x.id === id);
    if (item?.kind === 'reading') {
      deleteReading(id);
      refresh();
    } else if (item?.kind === 'work') {
      deleteWorkReview(id);
      refresh();
    } else {
      deleteNote(id);
      if (editingId === id) {
        setEditingId(null);
        setDraft('');
      }
      refresh();
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

  const selectBook = (id: string) => {
    setCurrentBook(id);
    const b = currentBook();
    setBook(b);
    setView('book');
  };

  if (view === 'shelf') {
    return (
      <Shelf
        currentId={book?.id ?? null}
        onBack={() => setView('main')}
        onSelect={selectBook}
        onAdd={t => {
          const b = addBook(t);
          setCurrentBook(b.id);
          setBook(b);
          refresh();
        }}
        onChanged={refresh}
      />
    );
  }

  if (view === 'book' && book) {
    return (
      <BookSpace
        book={book}
        onBack={() => setView('main')}
        editId={editReadingId}
        onDoneEdit={() => setEditReadingId(null)}
        onChanged={refresh}
      />
    );
  }

  // 主视图：随手记输入 + 正在读横条 + 复盘入口 + 混排时间流
  return (
    <div
      className="min-h-full flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(48px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-[680px] mx-auto px-4 pt-4 sticky top-0 z-10 bg-[#f5f5f4]/90 backdrop-blur pb-2">
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

      <div className="w-full max-w-[680px] mx-auto px-4 flex-1">
        <div className="flex items-center gap-2 py-3">
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

      {reviewOpen && (
        <ReviewSheet
          init={reviewEdit}
          onClose={() => setReviewOpen(false)}
          onSave={v => {
            if (reviewEdit) updateWorkReview(reviewEdit.id, v.date, v.period, v.project, v.did, v.output);
            else addWorkReview(v.date, v.period, v.project, v.did, v.output);
            setReviewOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
