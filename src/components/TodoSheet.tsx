import { useState } from 'react';
import { Todo, dayKey } from '../lib/storage';

interface Props {
  init?: Todo | null; // 编辑时传入
  onClose: () => void;
  onSave: (v: { title: string; due_at: string }) => void;
}

// 待办录入/编辑：标题 + 可选截止（无截止/今天/明天快捷 + 日期 + 可选时间）。
// 只选日期按当天 23:59:59 截止（视为全天，展示时不带时刻）。
export default function TodoSheet({ init, onClose, onSave }: Props) {
  const [title, setTitle] = useState(init?.title ?? '');
  const [date, setDate] = useState(init?.due_at ? init.due_at.slice(0, 10) : '');
  const [time, setTime] = useState(() => {
    const t = init?.due_at?.slice(11);
    return t && t !== '23:59:59' ? t.slice(0, 5) : '';
  });

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onSave({ title: t, due_at: date ? `${date} ${time ? `${time}:59` : '23:59:59'}` : '' });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm ${active ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400'}`;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button aria-label="关闭" className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-[680px] mx-auto bg-white rounded-t-2xl p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="text-sm text-stone-400 px-1 py-1">取消</button>
          <span className="text-sm font-medium">{init ? '修改待办' : '新待办'}</span>
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="text-sm bg-stone-800 text-white px-4 py-1.5 rounded-xl active:opacity-70 disabled:opacity-30"
          >
            {init ? '保存' : '记下'}
          </button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleKey}
          placeholder="要做什么…"
          autoFocus
          className="w-full bg-stone-100 rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-stone-300"
        />

        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => { setDate(''); setTime(''); }} className={chip(date === '')}>无截止</button>
          <button onClick={() => setDate(dayKey(0))} className={chip(date === dayKey(0))}>今天</button>
          <button onClick={() => setDate(dayKey(1))} className={chip(date === dayKey(1))}>明天</button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); if (!e.target.value) setTime(''); }}
            className="flex-1 bg-stone-100 rounded-xl px-3 py-2 text-sm outline-none min-w-0"
          />
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            disabled={!date}
            className="bg-stone-100 rounded-xl px-3 py-2 text-sm outline-none disabled:opacity-40"
          />
        </div>
        <p className="text-xs text-stone-300 mt-2">截止可选；只选日期按当天结束算</p>
      </div>
    </div>
  );
}
