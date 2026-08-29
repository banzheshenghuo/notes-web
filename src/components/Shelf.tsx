import { useState } from 'react';
import { Book, ReadingNote, deleteBook } from '../lib/storage';
import { fmtTime } from '../lib/format';

interface Props {
  books: Book[];
  reading: ReadingNote[]; // 计算每本书的笔记数
  currentId: string | null;
  onBack: () => void;
  onSelect: (id: string) => void;
  onAdd: (title: string) => Promise<void>;
  onChanged: () => void;
}

export default function Shelf({ books, reading, currentId, onBack, onSelect, onAdd, onChanged }: Props) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const countOf = (id: string) => reading.filter(r => r.bookId === id).length;

  const submit = async () => {
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await onAdd(t);
      setTitle('');
    } catch (e) {
      console.error('add book failed', e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (b: Book) => {
    const n = countOf(b.id);
    if (!confirm(`删除《${b.title}》${n ? `及其 ${n} 条笔记` : ''}？`)) return;
    try {
      await deleteBook(b.id);
      onChanged();
    } catch (e) {
      console.error('delete book failed', e);
    }
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="shrink-0">
        <div className="w-full max-w-[680px] mx-auto px-4 py-3 flex items-center gap-2">
          <button onClick={onBack} className="text-stone-500 text-lg active:text-stone-800 px-1 -ml-1">
            ‹
          </button>
          <span className="font-medium">书架</span>
        </div>
      </div>

      <div className="w-full max-w-[680px] mx-auto px-4 flex-1 min-h-0 flex flex-col">
        {/* 添加新书 */}
        <div className="flex gap-2 mb-4 shrink-0">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="书名，如《学会提问》"
            className="flex-1 bg-white rounded-xl px-3 py-2.5 text-sm outline-none shadow-sm"
          />
          <button
            onClick={submit}
            disabled={!title.trim() || busy}
            className="text-sm bg-stone-800 text-white px-4 rounded-xl active:opacity-70 disabled:opacity-30"
          >
            加书
          </button>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
          style={{ paddingBottom: 'calc(48px + env(safe-area-inset-bottom))' }}
        >
          {books.length === 0 ? (
            <div className="text-center text-stone-300 text-sm py-14">书架还是空的</div>
          ) : (
            <div className="flex flex-col gap-2.5 pb-8">
              {books.map(b => (
                <div key={b.id} className="group relative bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                  <button
                    onClick={() => onSelect(b.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <span className="text-2xl">📖</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">《{b.title}》</span>
                      <span className="block text-xs text-stone-400 mt-0.5">
                        {countOf(b.id)} 条{b.lastChapter ? ` · ${b.lastChapter}` : ''} · {fmtTime(b.lastOpened)}
                      </span>
                    </span>
                    {b.id === currentId && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full shrink-0">在读</span>
                    )}
                  </button>
                  <button
                    onClick={() => remove(b)}
                    className="text-xs text-stone-300 hover:text-red-500 px-2 py-1 shrink-0"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
