import { useRef, useState } from 'react';
import { TimelineItem } from '../lib/storage';
import { fmtTime, fmtDayPeriod } from '../lib/format';

interface Props {
  item: TimelineItem;
  onEdit: () => void;
  onDelete: () => void;
}

// 移动端左滑露出删除；桌面端 hover 显示操作
export default function NoteCard({ item, onEdit, onDelete }: Props) {
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const ddx = e.touches[0].clientX - startX.current;
    const ddy = e.touches[0].clientY - startY.current;
    if (!locked.current && Math.abs(ddy) > Math.abs(ddx)) locked.current = true;
    if (locked.current) return;
    setDx(Math.max(Math.min(ddx, 0), -72));
  };
  const onTouchEnd = () => {
    setDx(dx < -36 ? -72 : 0);
  };

  const isReading = item.kind === 'reading';
  const isWork = item.kind === 'work';
  const w = item.work;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button
        onClick={onDelete}
        className="absolute inset-y-0 right-0 w-[72px] bg-red-500 text-white text-sm flex items-center justify-center"
      >
        删除
      </button>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${dx}px)`, transition: 'transform .15s' }}
        className={`group relative rounded-2xl shadow-sm p-4 ${isReading ? 'bg-amber-50' : isWork ? 'bg-blue-50/70' : 'bg-white'}`}
      >
        <div className="flex items-center gap-2 mb-1.5 text-xs text-stone-400">
          {isReading ? (
            <>
              <span className="text-amber-700 truncate">📖 {item.reading!.book || '未命名'}</span>
              {item.reading!.chapter && (
                <span className="text-amber-600/70 bg-amber-100/60 px-1.5 py-0.5 rounded shrink-0">{item.reading!.chapter}</span>
              )}
            </>
          ) : isWork ? (
            <>
              <span className="text-stone-600 shrink-0">📋 {fmtDayPeriod(w!.date, w!.period)}</span>
              {w!.project && (
                <span className="text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded truncate max-w-[45%]">{w!.project}</span>
              )}
            </>
          ) : (
            <span className="w-2 h-2 rounded-full bg-stone-300" />
          )}
          <div className="flex-1" />
          <span>{fmtTime(item.created_at)}</span>
        </div>

        {isReading ? (
          <>
            {item.reading!.excerpt && (
              <div className="text-[14px] leading-relaxed text-stone-500 whitespace-pre-wrap break-words border-l-2 border-amber-300 pl-3 mb-2">
                {item.reading!.excerpt}
              </div>
            )}
            {item.reading!.thought && (
              <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{item.reading!.thought}</div>
            )}
          </>
        ) : isWork ? (
          <>
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{w!.did}</div>
            {w!.output && (
              <div className="text-[13px] leading-relaxed text-stone-500 mt-1.5 whitespace-pre-wrap break-words">→ {w!.output}</div>
            )}
          </>
        ) : (
          <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{item.note!.content}</div>
        )}

        <div className="absolute top-2 right-3 hidden group-hover:flex gap-3 text-xs text-stone-400">
          <button onClick={onEdit} className="hover:text-stone-800">编辑</button>
          <button onClick={onDelete} className="hover:text-red-500">删除</button>
        </div>
      </div>
    </div>
  );
}
