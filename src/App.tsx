import { useMemo, useState } from 'react';
import Composer from './components/Composer';
import NoteCard from './components/NoteCard';
import { Note, NoteType, loadNotes, addNote, updateNote, deleteNote, getTypePref, setTypePref } from './lib/storage';

export default function App() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [draft, setDraft] = useState('');
  const [type, setType] = useState<NoteType>(getTypePref);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const refresh = () => setNotes(loadNotes());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n => n.content.toLowerCase().includes(q));
  }, [notes, query]);

  const submit = () => {
    const content = draft.trim();
    if (!content) return;
    if (editingId) {
      updateNote(editingId, content, type);
      setEditingId(null);
    } else {
      addNote(content, type);
      setTypePref(type);
    }
    setDraft('');
    refresh();
  };

  const startEdit = (n: Note) => {
    setEditingId(n.id);
    setDraft(n.content);
    setType(n.type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  const remove = (id: string) => {
    if (!confirm('删除这条记录？')) return;
    deleteNote(id);
    if (editingId === id) cancelEdit();
    refresh();
  };

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
          value={draft}
          onChange={setDraft}
          type={type}
          onTypeChange={setType}
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
              placeholder="搜索…"
              className="flex-1 bg-stone-200/70 rounded-xl px-3 py-2 text-sm outline-none"
            />
          ) : (
            <>
              <span className="text-xs text-stone-400 flex-1">
                {filtered.length === notes.length ? `${notes.length} 条` : `${filtered.length} / ${notes.length} 条`}
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
            {notes.length === 0 ? '记下第一条吧' : '没有匹配的记录'}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 pb-8">
            {filtered.map(n => (
              <NoteCard
                key={n.id}
                note={n}
                onEdit={() => startEdit(n)}
                onDelete={() => remove(n.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
