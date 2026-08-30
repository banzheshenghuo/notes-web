import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DailyItem, DailyLog, Todo, todayKey } from '../lib/storage';

// 首页「今日清单」：打卡项（每天重复，完成划线、次日自动恢复）与临时待办（一次性，
// 完成即收起）混排为一份清单。待办按 逾期(红) → 今天(橙) → 未来 → 无截止 排序。
interface Props {
  todos: Todo[];           // 未完成的待办（App 已过滤 done）
  dailyItems: DailyItem[]; // 已按 sort 排序
  dailyLogs: DailyLog[];   // 全量，组件内取今日
  onToggleDaily: (itemId: string, done: boolean) => void;
  onToggleTodo: (id: string, done: boolean) => void;
  onEditTodo: (todo: Todo) => void;
  onDeleteTodo: (id: string) => void;
  onAddTodo: () => void;
  onManageDaily: () => void;
}

const COLLAPSE = 6; // 超出折叠的条数阈值

function Box({ done }: { done: boolean }) {
  return (
    <span
      className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 text-[10px] leading-none text-white ${
        done ? 'bg-stone-700 border-stone-700' : 'border-stone-300'
      }`}
    >
      {done ? '✓' : ''}
    </span>
  );
}

/** 左滑露出「删除/编辑」，垂直方向让给页面滚动（同 NoteCard 手势） */
function SwipeRow({ children, onTap, onEdit, onDelete }: {
  children: ReactNode;
  onTap: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const REVEAL = 140;
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
    setDx(Math.max(Math.min(ddx, 0), -REVEAL));
  };
  const onPointerUp = () => setDx(prev => (prev < -REVEAL / 2 ? -REVEAL : 0));

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button onClick={() => { setDx(0); onDelete(); }} className="w-[70px] bg-red-500 text-white text-sm flex items-center justify-center">
          删除
        </button>
        <button onClick={() => { setDx(0); onEdit(); }} className="w-[70px] bg-stone-500 text-white text-sm flex items-center justify-center">
          编辑
        </button>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          setDx(0);
          onTap();
        }}
        style={{ transform: `translateX(${dx}px)`, transition: 'transform .15s' }}
        className="relative bg-white touch-pan-y select-none"
      >
        {children}
      </div>
    </div>
  );
}

/** 截止展示：逾期红 / 今天橙 / 其余灰；只选日期（23:59:59）视为全天不展示时刻 */
function dueInfo(dueAt: string, now: Date): { label: string; cls: string } | null {
  if (!dueAt) return null;
  const d = new Date(dueAt.replace(' ', 'T'));
  if (isNaN(d.getTime())) return null;
  const allDay = dueAt.slice(11) === '23:59:59';
  const hm = dueAt.slice(11, 16);
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.getTime() < now.getTime()) {
    return sameDay
      ? { label: `已过 ${hm}`, cls: 'text-red-500' }
      : { label: `逾期 ${d.getMonth() + 1}/${d.getDate()}`, cls: 'text-red-500' };
  }
  const y = d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()}/`;
  const md = `${y}${d.getMonth() + 1}/${d.getDate()}`;
  if (sameDay) return { label: allDay ? '今天' : `今天 ${hm}`, cls: 'text-orange-500' };
  if (d.toDateString() === tomorrow.toDateString()) return { label: allDay ? '明天' : `明天 ${hm}`, cls: 'text-stone-400' };
  return { label: allDay ? md : `${md} ${hm}`, cls: 'text-stone-400' };
}

function todoRank(t: Todo, now: Date): { rank: number; due: number } {
  if (!t.due_at) return { rank: 3, due: Infinity };
  const d = new Date(t.due_at.replace(' ', 'T'));
  if (isNaN(d.getTime())) return { rank: 3, due: Infinity };
  if (d.getTime() < now.getTime()) return { rank: 0, due: d.getTime() };
  if (d.toDateString() === now.toDateString()) return { rank: 1, due: d.getTime() };
  return { rank: 2, due: d.getTime() };
}

export default function TodayList({
  todos, dailyItems, dailyLogs,
  onToggleDaily, onToggleTodo, onEditTodo, onDeleteTodo, onAddTodo, onManageDaily,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const today = todayKey();
  const doneIds = useMemo(() => {
    const s = new Set<string>();
    for (const l of dailyLogs) if (l.date === today) s.add(l.itemId);
    return s;
  }, [dailyLogs, today]);

  const sorted = useMemo(() => {
    const now = new Date();
    return [...todos]
      .map(t => ({ t, r: todoRank(t, now) }))
      .sort((a, b) => a.r.rank - b.r.rank || a.r.due - b.r.due || (a.t.created_at < b.t.created_at ? 1 : -1))
      .map(x => x.t);
  }, [todos]);

  const total = dailyItems.length + sorted.length;
  const collapsed = !expanded && total > COLLAPSE;
  const shownTodos = collapsed ? sorted.slice(0, Math.max(0, COLLAPSE - dailyItems.length)) : sorted;
  const hidden = total - dailyItems.length - shownTodos.length;

  const headerText = [
    dailyItems.length > 0 ? `打卡 ${doneIds.size}/${dailyItems.length}` : '',
    `待办 ${sorted.length}`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="w-full bg-white/80 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-1 px-4 py-2 border-b border-stone-100">
        <span className="text-sm text-stone-600 flex-1 text-left truncate">✅ {headerText}</span>
        <button onClick={onManageDaily} className="text-xs text-stone-400 active:text-stone-800 px-2 py-1 shrink-0">
          管理
        </button>
        <button
          onClick={onAddTodo}
          aria-label="添加待办"
          className="w-7 h-7 rounded-full bg-stone-800 text-white text-base leading-none flex items-center justify-center shrink-0 active:opacity-70"
        >
          +
        </button>
      </div>

      {total === 0 && (
        <p className="px-4 py-3 text-xs text-stone-300">今天没有待办，点 + 记一件</p>
      )}

      {/* 打卡项：整行可点切换，完成后置灰划线，次日自动恢复 */}
      {dailyItems.slice(0, collapsed ? COLLAPSE : dailyItems.length).map(it => {
        const done = doneIds.has(it.id);
        return (
          <button
            key={it.id}
            onClick={() => onToggleDaily(it.id, !done)}
            className="w-full flex items-center gap-3 px-4 py-2 border-t border-stone-100 active:bg-stone-50"
          >
            <Box done={done} />
            <span className={`text-sm flex-1 text-left truncate ${done ? 'line-through text-stone-300' : ''}`}>
              {it.title}
            </span>
            <span className="text-[10px] text-stone-300 shrink-0">⟲</span>
          </button>
        );
      })}

      {/* 临时待办：点行编辑，左滑编辑/删除，勾选即完成收起 */}
      {shownTodos.map(t => (
        <SwipeRow key={t.id} onTap={() => onEditTodo(t)} onEdit={() => onEditTodo(t)} onDelete={() => onDeleteTodo(t.id)}>
          <div className="w-full flex items-center gap-3 px-4 py-2 border-t border-stone-100">
            <button
              onClick={e => { e.stopPropagation(); onToggleTodo(t.id, true); }}
              aria-label="完成"
              className="shrink-0"
            >
              <Box done={false} />
            </button>
            <span className="text-sm flex-1 min-w-0 truncate">{t.title}</span>
            {(() => {
              const due = dueInfo(t.due_at, new Date());
              return due ? <span className={`text-xs shrink-0 ${due.cls}`}>{due.label}</span> : null;
            })()}
          </div>
        </SwipeRow>
      ))}

      {total > COLLAPSE && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full py-2 text-xs text-stone-400 border-t border-stone-100 active:text-stone-700"
        >
          {expanded ? '收起' : `展开其余 ${hidden} 条`}
        </button>
      )}
    </div>
  );
}
