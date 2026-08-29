import { useRef, useState } from 'react';
import { TimelineItem } from '../lib/storage';
import { fmtTime, fmtDayPeriod } from '../lib/format';

interface Props {
  item: TimelineItem;
  onEdit: () => void;
  onDelete: () => void;
}

const REVEAL = 140; // 左侧操作区宽度：编辑 + 删除

// 右滑卡片露出左侧「编辑 / 删除」；垂直方向让给页面滚动
export default function NoteCard({ item, onEdit, onDelete }: Props) {
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef(false);
  const suppressClick = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    locked.current = false;
    suppressClick.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const ddx = e.clientX - startX.current;
    const ddy = e.clientY - startY.current;
    if (!locked.current && Math.abs(ddy) > Math.abs(ddx)) locked.current = true;
    if (locked.current) return;
    if (Math.abs(ddx) > 6) suppressClick.current = true;
    setDx(Math.max(Math.min(ddx, REVEAL), 0));
  };

  const onPointerUp = () => {
    setDx(prev => (prev > REVEAL / 2 ? REVEAL : 0));
  };

  const onBodyClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (dx > 0) setDx(0);
  };

  const isReading = item.kind === 'reading';
  const isWork = item.kind === 'work';
  const w = item.work;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* 左侧操作区：删除在最左，编辑贴近卡片（轻扫先露出安全的编辑） */}
      <div className="absolute inset-y-0 left-0 flex">
        <button
          onClick={() => { setDx(0); onDelete(); }}
          className="w-[70px] bg-red-500 text-white text-sm flex items-center justify-center"
        >
          删除
        </button>
        <button
          onClick={() => { setDx(0); onEdit(); }}
          className="w-[70px] bg-stone-500 text-white text-sm flex items-center justify-center"
        >
          编辑
        </button>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onBodyClick}
        style={{ transform: `translateX(${dx}px)`, transition: 'transform .15s' }}
        className={`group relative rounded-2xl shadow-sm p-4 touch-pan-y select-none ${
          isReading ? 'bg-amber-50' : isWork ? 'bg-blue-50/70' : 'bg-white'
        }`}
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
      </div>
    </div>
  );
}
