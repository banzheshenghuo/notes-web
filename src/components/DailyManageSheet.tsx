import { useState } from 'react';
import { DailyItem } from '../lib/storage';

interface Props {
  items: DailyItem[]; // 已按 sort 排序
  onClose: () => void;
  onAdd: (title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  onMove: (id: string, dir: -1 | 1) => Promise<void>;
}

// 打卡项管理：低频操作，增删 / 改名（点标题）/ 上下移。删除级联清掉全部打卡记录。
export default function DailyManageSheet({ items, onClose, onAdd, onDelete, onRename, onMove }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const doAdd = async () => {
    const t = newTitle.trim();
    if (!t || adding) return;
    setAdding(true);
    try {
      await onAdd(t);
      setNewTitle('');
    } catch (e) {
      console.error('add daily item failed', e);
    } finally {
      setAdding(false);
    }
  };

  const commitRename = () => {
    const t = editTitle.trim();
    const id = editingId;
    setEditingId(null);
    if (!id || !t) return;
    const old = items.find(i => i.id === id)?.title;
    if (t !== old) onRename(id, t).catch(e => console.error('rename daily item failed', e));
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button aria-label="关闭" className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-[680px] mx-auto bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <button onClick={onClose} className="text-sm text-stone-400 px-1 py-1">完成</button>
          <span className="text-sm font-medium">管理每日打卡</span>
          <span className="w-9" />
        </div>

        {items.length === 0 && (
          <p className="text-sm text-stone-300 py-4 text-center">还没有打卡项，比如：写复盘、记录、学英语</p>
        )}

        <div className="flex flex-col">
          {items.map((it, i) => (
            <div key={it.id} className="flex items-center gap-1.5 py-2 border-t border-stone-100 first:border-t-0">
              {editingId === it.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename();
                    }
                  }}
                  className="flex-1 bg-stone-100 rounded-xl px-3 py-1.5 text-sm outline-none min-w-0"
                />
              ) : (
                <button
                  className="flex-1 text-left text-sm min-w-0 truncate active:text-stone-400"
                  onClick={() => { setEditingId(it.id); setEditTitle(it.title); }}
                >
                  {it.title}
                </button>
              )}
              <button
                disabled={i === 0}
                onClick={() => onMove(it.id, -1).catch(e => console.error('move daily item failed', e))}
                className="text-xs text-stone-400 px-1.5 py-1.5 disabled:opacity-25"
                aria-label="上移"
              >
                ↑
              </button>
              <button
                disabled={i === items.length - 1}
                onClick={() => onMove(it.id, 1).catch(e => console.error('move daily item failed', e))}
                className="text-xs text-stone-400 px-1.5 py-1.5 disabled:opacity-25"
                aria-label="下移"
              >
                ↓
              </button>
              <button
                onClick={() => {
                  if (confirm(`删除「${it.title}」及其全部打卡记录？`)) {
                    onDelete(it.id).catch(e => console.error('delete daily item failed', e));
                  }
                }}
                className="text-xs text-red-400 px-1.5 py-1.5"
              >
                删
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                doAdd();
              }
            }}
            placeholder="新增打卡项…"
            className="flex-1 bg-stone-100 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-stone-300 min-w-0"
          />
          <button
            onClick={doAdd}
            disabled={!newTitle.trim() || adding}
            className="text-sm bg-stone-800 text-white px-4 py-1.5 rounded-xl active:opacity-70 disabled:opacity-30 shrink-0"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
