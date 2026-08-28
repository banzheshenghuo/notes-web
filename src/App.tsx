import { useMemo, useState } from 'react';
import Composer, { ReadingDraft } from './components/Composer';
import NoteCard from './components/NoteCard';
import {
  NoteType, TimelineItem,
  loadTimeline, addNote, updateNote, deleteNote,
  addReading, updateReading, deleteReading,
  getTypePref, setTypePref, lastBook, listBooks,
} from './lib/storage';

export default function App() {
  const [timeline, setTimeline] = useState<TimelineItem[]>(loadTimeline);
  const [mode, setMode] = useState<'quick' | 'reading'>(getTypePref);
  const [draft, setDraft] = useState('');
  const [type, setType] = useState<NoteType>('idea');
  const [readingDraft, setReadingDraft] = useState<ReadingDraft>({ book: lastBook(), excerpt: '', thought: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const books = useMemo(() => listBooks(), [timeline]);

  const refresh = () => setTimeline(loadTimeline());

  const submit = () => {
    if (editingId) {
      const item = timeline.find(x => x.id === editingId);
      if (item?.kind === 'reading') {
        updateReading(editingId, readingDraft.book.trim(), readingDraft.excerpt.trim(), readingDraft.thought.trim());
      } else if (item) {
        updateNote(editingId, draft.trim(), type);
      }
      setEditingId(null);
    } else if (mode === 'quick') {
      if (!draft.trim()) return;
      addNote(draft.trim(), type);
      setDraft('');
      setTypePref('quick');
    } else {
      const r = readingDraft;
      if (!r.thought.trim() && !r.excerpt.trim()) return;
      addReading(r.book.trim(), r.excerpt.trim(), r.thought.trim());
      setReadingDraft({ book: r.book.trim(), excerpt: '', thought: '' });
      setTypePref('reading');
    }
    refresh();
  };

  const startEdit = (item: TimelineItem) => {
    setEditingId(item.id);
    if (item.kind === 'reading') {
      setMode('reading');
      setReadingDraft({ book: item.reading!.book, excerpt: item.reading!.excerpt, thought: item.reading!.thought });
    } else {
      setMode('quick');
      setDraft(item.note!.content);
      setType(item.note!.type);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
    setReadingDraft({ book: lastBook(), excerpt: '', thought: '' });
  };

  const remove = (id: string) => {
    if (!confirm('删除这条记录？')) return;
    const item = timeline.find(x => x.id === id);
    if (item?.kind === 'reading') deleteReading(id);
    else deleteNote(id);
    if (editingId === id) cancelEdit();
    refresh();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return timeline;
    return timeline.filter(item => {
      if (item.kind === 'reading') {
        const r = item.reading!;
        return `${r.book} ${r.excerpt} ${r.thought}`.toLowerCase().includes(q);
      }
      return item.note!.content.toLowerCase().includes(q);
    });
  }, [timeline, query]);

  return (
    <div
      className="min-h-full flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(48px + env(safe-area-inset-bottom))',
      }}
    >
      {/* 同轴滚动的第一段：输入区 */}
      <div className="w-full max-w-[680px] mx-auto px-4 pt-4 sticky top-0 z-10 bg-[#f5f5f4]/90 backdrop-blur pb-2">
        <Composer
          mode={mode}
          onModeChange={setMode}
          value={draft}
          onChange={setDraft}
          type={type}
          onTypeChange={setType}
          readingDraft={readingDraft}
          onReadingChange={setReadingDraft}
          books={books}
          onSubmit={submit}
          editing={editingId !== null}
          onCancelEdit={cancelEdit}
        />
      </div>

      {/* 第二段：时间流 */}
      <div className="w-full max-w-[680px] mx-auto px-4 flex-1">
        <div className="flex items-center gap-2 py-3">
          {searchOpen ? (
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onBlur={() => !query && setSearchOpen(false)}
              placeholder="搜索（含书名）…"
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
    </div>
  );
}
