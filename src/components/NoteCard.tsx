import { useRef, useState } from 'react';
import { TimelineItem } from '../lib/storage';
import { fmtTime, TYPE_LABEL } from '../lib/format';

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
        className={`group relative rounded-2xl shadow-sm p-4 ${isReading ? 'bg-amber-50' : 'bg-white'}`}
      >
        <div className="flex items-center gap-2 mb-1.5 text-xs text-stone-400">
          {isReading ? (
            <span className="text-amber-700">📖 {item.reading!.book || '未命名'}</span>
          ) : (
            <>
              <span className={`w-2 h-2 rounded-full ${item.note!.type === 'idea' ? 'bg-stone-400' : 'bg-blue-400'}`} />
              <span>{TYPE_LABEL[item.note!.type]}</span>
            </>
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
