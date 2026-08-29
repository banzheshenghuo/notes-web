import { useState } from 'react';
import { HalfDay, WorkReview, projectsUsed, todayKey, nowHalfDay } from '../lib/storage';

interface Props {
  init?: WorkReview | null; // 编辑时传入
  onClose: () => void;
  onSave: (v: { date: string; period: HalfDay; project: string; did: string; output: string }) => void;
}

export default function ReviewSheet({ init, onClose, onSave }: Props) {
  const [date, setDate] = useState(init?.date ?? todayKey());
  const [period, setPeriod] = useState<HalfDay>(init?.period ?? nowHalfDay());
  const [project, setProject] = useState(init?.project ?? '');
  const [did, setDid] = useState(init?.did ?? '');
  const [output, setOutput] = useState(init?.output ?? '');
  const used = projectsUsed();

  const submit = () => {
    if (!did.trim()) return;
    onSave({ date, period, project: project.trim(), did: did.trim(), output: output.trim() });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button aria-label="关闭" className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-[680px] mx-auto bg-white rounded-t-2xl p-4 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="text-sm text-stone-400 px-1 py-1">取消</button>
          <span className="text-sm font-medium">{init ? '修改复盘' : '工作复盘'}</span>
          <button
            onClick={submit}
            disabled={!did.trim()}
            className="text-sm bg-stone-800 text-white px-4 py-1.5 rounded-xl active:opacity-70 disabled:opacity-30"
          >
            {init ? '保存' : '记下'}
          </button>
        </div>

        {/* 时段：日期 + 上午/下午 */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-stone-100 rounded-xl px-3 py-2 text-sm outline-none"
          />
          <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
            {(['am', 'pm'] as HalfDay[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                  period === p ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'
                }`}
              >
                {p === 'am' ? '上午' : '下午'}
              </button>
            ))}
          </div>
        </div>

        {/* 项目/主题 */}
        <input
          value={project}
          onChange={e => setProject(e.target.value)}
          list="project-list"
          placeholder="项目/主题（可选，如：考公、notes-web）…"
          className="w-full bg-stone-100 rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-stone-300"
        />
        <datalist id="project-list">
          {used.map(p => (
            <option key={p} value={p} />
          ))}
        </datalist>

        {/* 做了什么 */}
        <textarea
          value={did}
          onChange={e => setDid(e.target.value)}
          onKeyDown={handleKey}
          placeholder="做了什么…"
          rows={4}
          autoFocus
          className="w-full mt-3 resize-none outline-none border-none bg-transparent text-base leading-relaxed placeholder:text-stone-300"
        />

        {/* 产出 */}
        <input
          value={output}
          onChange={e => setOutput(e.target.value)}
          placeholder="产出（做完时有什么原本不存在的东西，可选）…"
          className="w-full mt-1 bg-stone-100 rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-stone-300"
        />
      </div>
    </div>
  );
}
