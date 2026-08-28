import { useEffect, useRef } from 'react';
import { NoteType } from '../lib/storage';
import { TYPE_LABEL } from '../lib/format';

interface Props {
  value: string;
  onChange: (v: string) => void;
  type: NoteType;
  onTypeChange: (t: NoteType) => void;
  onSubmit: () => void;
  editing: boolean;
  onCancelEdit: () => void;
}

const TYPES: NoteType[] = ['idea', 'note'];

export default function Composer({ value, onChange, type, onTypeChange, onSubmit, editing, onCancelEdit }: Props) {
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

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={editing ? '修改中…' : '记点什么…'}
        enterKeyHint="send"
        rows={5}
        className="w-full resize-none outline-none border-none bg-transparent text-base leading-relaxed placeholder:text-stone-300"
      />
      <div className="flex items-center gap-2 mt-2">
        {editing ? (
          <>
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">编辑模式</span>
            <div className="flex-1" />
            <button onClick={onCancelEdit} className="text-sm text-stone-400 px-3 py-2 rounded-xl active:bg-stone-100">
              取消
            </button>
            <button
              onClick={onSubmit}
              disabled={!value.trim()}
              className="text-sm bg-stone-800 text-white px-4 py-2 rounded-xl active:opacity-70 disabled:opacity-30"
            >
              保存
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
