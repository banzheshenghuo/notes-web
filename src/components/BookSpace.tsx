import { useEffect, useMemo, useRef, useState } from 'react';
import { Book, Chapter, ReadingNote, addReading, updateReading, deleteReading, updateBook } from '../lib/storage';
import NoteCard from './NoteCard';
import { TimelineItem } from '../lib/storage';

interface Props {
  book: Book;
  reading: ReadingNote[]; // 本书笔记（App 统一数据源过滤后传入）
  chapters: Chapter[];   // 本书目录（workbench 录入，按 seq 排序后使用）
  onBack: () => void;
  editId?: string | null; // 从主时间流跳入编辑的读书笔记
  onDoneEdit: () => void;
  onChanged: () => void; // 通知 App 刷新数据
}

export default function BookSpace({ book, reading, chapters, onBack, editId, onDoneEdit, onChanged }: Props) {
  const [chapter, setChapter] = useState(book.lastChapter);
  const [excerpt, setExcerpt] = useState('');
  const [thought, setThought] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [chapterEditing, setChapterEditing] = useState(false); // 手动输入模式（无目录/兜底）
  const [pickerOpen, setPickerOpen] = useState(false);         // 目录点选抽屉
  const [busy, setBusy] = useState(false);
  const chapterInput = useRef<HTMLInputElement>(null);

  const toc = useMemo(() => [...chapters].sort((a, b) => a.seq - b.seq), [chapters]);

  // 从主时间流跳入编辑
  useEffect(() => {
    if (!editId) return;
    const n = reading.find(x => x.id === editId);
    if (n) {
      setEditing(n.id);
      setExcerpt(n.excerpt);
      setThought(n.thought);
      setChapter(n.chapter);
    }
    onDoneEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  useEffect(() => {
    if (chapterEditing) chapterInput.current?.focus();
  }, [chapterEditing]);

  const submit = async () => {
    if (busy) return;
    if (!excerpt.trim() && !thought.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        await updateReading(editing, chapter.trim(), excerpt.trim(), thought.trim());
        setEditing(null);
        setExcerpt('');
        setThought('');
      } else {
        await addReading(book, chapter.trim(), excerpt.trim(), thought.trim());
        setExcerpt('');
        setThought('');
      }
      onChanged();
    } catch (e) {
      console.error('save reading failed', e);
    } finally {
      setBusy(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  const startEdit = (n: ReadingNote) => {
    setEditing(n.id);
    setExcerpt(n.excerpt);
    setThought(n.thought);
    setChapter(n.chapter);
  };

  const commitChapter = async (v: string) => {
    setChapter(v);
    setChapterEditing(false);
    try {
      await updateBook(book.id, { lastChapter: v });
      onChanged();
    } catch (e) {
      console.error('update chapter failed', e);
    }
  };

  // 按章节分组：目录中的章节按目录顺序排最前；手打的非目录章节按时间倒序居中；未分章节垫底
  const groups = useMemo(() => {
    const map = new Map<string, ReadingNote[]>();
    for (const n of reading) {
      const key = n.chapter || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    const tocTitles = new Set(toc.map(c => c.title));
    const inToc = toc.filter(c => map.has(c.title)).map(c => [c.title, map.get(c.title)!] as [string, ReadingNote[]]);
    const handTyped = [...map.entries()]
      .filter(([k]) => k && !tocTitles.has(k))
      .sort((a, b) => (a[1][0].created_at < b[1][0].created_at ? 1 : -1));
    const none = map.has('') ? [['', map.get('')!] as [string, ReadingNote[]]] : [];
    return [...inToc, ...handTyped, ...none];
  }, [reading, toc]);

  const usedChapters = useMemo(
    () => [...new Set(reading.map(n => n.chapter).filter(Boolean))],
    [reading],
  );

  const toCard = (n: ReadingNote): TimelineItem => ({
    kind: 'reading', id: n.id, created_at: n.created_at, reading: n,
  });

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* 书空间头部：返回 + 书名 + 章节chip */}
      <div className="shrink-0">
        <div className="w-full max-w-[680px] mx-auto px-4 py-3 flex items-center gap-2">
          <button onClick={onBack} className="text-stone-500 text-lg active:text-stone-800 px-1 -ml-1">
            ‹
          </button>
          <span className="font-medium truncate">《{book.title}》</span>
          <div className="flex-1" />
          {chapterEditing ? (
            <input
              ref={chapterInput}
              defaultValue={chapter}
              list="chapter-list"
              onBlur={e => commitChapter(e.target.value.trim())}
              onKeyDown={e => e.key === 'Enter' && commitChapter((e.target as HTMLInputElement).value.trim())}
              placeholder="章节，如：第3章"
              className="bg-white text-xs rounded-lg px-2 py-1.5 w-32 outline-none shadow-sm"
            />
          ) : (
            <button
              onClick={() => {
                if (toc.length > 0) setPickerOpen(true);
                else setChapterEditing(true);
              }}
              className={`text-xs px-2.5 py-1.5 rounded-lg max-w-[45%] truncate ${
                chapter ? 'bg-amber-100 text-amber-700' : 'bg-stone-200/70 text-stone-400'
              }`}
            >
              {chapter || (toc.length > 0 ? '☰ 选章节' : '+ 章节')}
            </button>
          )}
          <datalist id="chapter-list">
            {[...toc.map(c => c.title), ...usedChapters].map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      {/* 目录点选抽屉：workbench 录入的章节一触即达 */}
      {pickerOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <button
            aria-label="关闭"
            className="absolute inset-0 bg-stone-900/30"
            onClick={() => setPickerOpen(false)}
          />
          <div
            className="relative bg-white rounded-t-2xl px-4 pt-3 pb-2 shadow-lg"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">选择章节</span>
              <button
                onClick={() => { setPickerOpen(false); setChapterEditing(true); }}
                className="text-xs text-stone-400 px-2 py-1"
              >
                手动输入
              </button>
            </div>
            <div className="max-h-[45vh] overflow-y-auto overscroll-contain no-scrollbar">
              {toc.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setPickerOpen(false);
                    commitChapter(c.title);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm active:bg-stone-100 flex items-center gap-2 ${
                    chapter === c.title ? 'text-amber-700' : 'text-stone-700'
                  }`}
                >
                  <span className="text-xs text-stone-300 tabular-nums w-6 text-right shrink-0">{c.seq + 1}</span>
                  <span className="flex-1 min-w-0 truncate">{c.title}</span>
                  {chapter === c.title && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[680px] mx-auto px-4 flex-1 min-h-0 flex flex-col">
        {/* 输入区：书与章节都是上下文，表单只有摘录和想法 */}
        <div className="bg-amber-50 rounded-2xl shadow-sm p-4 shrink-0">
          {editing && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-600">修改中</span>
              <button
                onClick={() => { setEditing(null); setExcerpt(''); setThought(''); }}
                className="text-xs text-stone-400 px-2 py-1"
              >
                取消
              </button>
            </div>
          )}
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="摘录原文（可选）…"
            rows={2}
            className="w-full resize-none outline-none border-none bg-transparent text-base italic text-stone-500 leading-relaxed placeholder:text-stone-300"
          />
          <div className="border-l-2 border-amber-200 my-1 ml-1" />
          <textarea
            value={thought}
            onChange={e => setThought(e.target.value)}
            onKeyDown={handleKey}
            placeholder="我的想法…"
            enterKeyHint="send"
            rows={3}
            autoFocus
            className="w-full resize-none outline-none border-none bg-transparent text-base leading-relaxed placeholder:text-stone-300"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={submit}
              disabled={busy || (!excerpt.trim() && !thought.trim())}
              className="text-sm bg-amber-600 text-white px-4 py-2 rounded-xl active:opacity-70 disabled:opacity-30"
            >
              记下
            </button>
          </div>
        </div>

        {/* 本书笔记，按章节分组 */}
        <div
          className="pt-4 flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
          style={{ paddingBottom: 'calc(48px + env(safe-area-inset-bottom))' }}
        >
          {reading.length === 0 ? (
            <div className="text-center text-stone-300 text-sm py-14">还没有这本书的笔记</div>
          ) : (
            groups.map(([ch, items]) => (
              <div key={ch || '_none'} className="mb-2">
                <div className="flex items-center gap-2 py-2">
                  <span className="text-xs text-stone-400">{ch || '未分章节'}</span>
                  <span className="text-xs text-stone-300">{items.length}</span>
                  <div className="flex-1 border-t border-stone-200/70" />
                </div>
                <div className="flex flex-col gap-2.5">
                  {items.map(n => (
                    <div key={n.id} className="relative">
                      <NoteCard
                        item={toCard(n)}
                        onEdit={() => startEdit(n)}
                        onDelete={() => {
                          if (confirm('删除这条读书笔记？')) {
                            deleteReading(n.id)
                              .then(onChanged)
                              .catch(e => console.error('delete reading failed', e));
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
