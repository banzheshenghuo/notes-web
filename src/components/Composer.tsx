import { useEffect, useRef } from 'react';
import { NoteType } from '../lib/storage';
import { TYPE_LABEL } from '../lib/format';

export interface ReadingDraft {
  book: string;
  excerpt: string;
  thought: string;
}

interface Props {
  mode: 'quick' | 'reading';
  onModeChange: (m: 'quick' | 'reading') => void;
  // quick 模式
  value: string;
  onChange: (v: string) => void;
  type: NoteType;
  onTypeChange: (t: NoteType) => void;
  // reading 模式
  readingDraft: ReadingDraft;
  onReadingChange: (d: ReadingDraft) => void;
  books: string[];
  // 通用
  onSubmit: () => void;
  editing: boolean;
  onCancelEdit: () => void;
}

const TYPES: NoteType[] = ['idea', 'note'];

export default function Composer(props: Props) {
  const { mode, onModeChange, value, onChange, type, onTypeChange, readingDraft, onReadingChange, books, onSubmit, editing, onCancelEdit } = props;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  const canSubmit = mode === 'quick' ? value.trim() : readingDraft.thought.trim() || readingDraft.excerpt.trim();

  const inputCls = 'w-full resize-none outline-none border-none bg-transparent text-base leading-relaxed placeholder:text-stone-300';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      {/* 模式切换：随手 / 读书 */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => onModeChange('quick')}
          className={`text-[13px] px-3 py-1.5 rounded-lg transition-colors ${
            mode === 'quick' ? 'bg-stone-800 text-white' : 'text-stone-500 active:bg-stone-100'
          }`}
        >
          随手记
        </button>
        <button
          onClick={() => onModeChange('reading')}
          className={`text-[13px] px-3 py-1.5 rounded-lg transition-colors ${
            mode === 'reading' ? 'bg-amber-600 text-white' : 'text-stone-500 active:bg-stone-100'
          }`}
        >
          📖 读书
        </button>
        <div className="flex-1" />
        {editing && (
          <button onClick={onCancelEdit} className="text-sm text-stone-400 px-3 py-1.5 rounded-xl active:bg-stone-100">
            取消编辑
          </button>
        )}
      </div>

      {mode === 'quick' ? (
        <>
          <textarea
            ref={ref}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder={editing ? '修改中…' : '记点什么…'}
            enterKeyHint="send"
            rows={5}
            className={inputCls}
          />
          <div className="flex items-center gap-2 mt-2">
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => onTypeChange(t)}
                className={`text-[13px] px-3 py-1.5 rounded-lg transition-colors ${
                  type === t ? 'bg-stone-200 text-stone-800' : 'text-stone-400 active:bg-stone-100'
                }`}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={onSubmit}
              disabled={!value.trim()}
              className="text-sm bg-stone-800 text-white px-4 py-2 rounded-xl active:opacity-70 disabled:opacity-30"
            >
              记下
            </button>
          </div>
        </>
      ) : (
        <>
          {/* 书名：datalist 下拉历史书名 */}
          <input
            value={readingDraft.book}
            onChange={e => onReadingChange({ ...readingDraft, book: e.target.value })}
            placeholder="书名，如《学会提问》"
            list="bookshelf"
            className="w-full outline-none border-none bg-transparent text-base font-medium placeholder:text-stone-300 mb-2"
          />
          <datalist id="bookshelf">
            {books.map(b => (
              <option key={b} value={b} />
            ))}
          </datalist>

          <textarea
            value={readingDraft.excerpt}
            onChange={e => onReadingChange({ ...readingDraft, excerpt: e.target.value })}
            placeholder="摘录原文（可选）…"
            rows={2}
            className={`${inputCls} text-stone-500 italic`}
          />
          <div className="border-l-2 border-stone-200 my-1 ml-1" />
          <textarea
            value={readingDraft.thought}
            onChange={e => onReadingChange({ ...readingDraft, thought: e.target.value })}
            onKeyDown={handleKey}
            placeholder="我的想法…"
            enterKeyHint="send"
            rows={3}
            ref={ref}
            className={inputCls}
          />
          <div className="flex items-center justify-end mt-2">
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              className="text-sm bg-amber-600 text-white px-4 py-2 rounded-xl active:opacity-70 disabled:opacity-30"
            >
              记下
            </button>
          </div>
        </>
      )}
    </div>
  );
}
