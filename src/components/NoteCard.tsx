import { useRef, useState } from 'react';
import { Note } from '../lib/storage';
import { fmtTime, TYPE_LABEL, TYPE_DOT } from '../lib/format';

interface Props {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}

// 移动端左滑露出删除；桌面端 hover 显示操作
export default function NoteCard({ note, onEdit, onDelete }: Props) {
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef(false); // 垂直滚动时锁定，不再响应横向滑动

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
        className="group relative bg-white rounded-2xl shadow-sm p-4"
      >
        <div className="flex items-center gap-2 mb-1.5 text-xs text-stone-400">
          <span className={`w-2 h-2 rounded-full ${TYPE_DOT[note.type] || 'bg-stone-300'}`} />
          <span>{TYPE_LABEL[note.type] || note.type}</span>
          <div className="flex-1" />
          <span>{fmtTime(note.created_at)}</span>
        </div>
        <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{note.content}</div>
        <div className="absolute top-2 right-3 hidden group-hover:flex gap-3 text-xs text-stone-400">
          <button onClick={onEdit} className="hover:text-stone-800">编辑</button>
          <button onClick={onDelete} className="hover:text-red-500">删除</button>
        </div>
      </div>
    </div>
  );
}
