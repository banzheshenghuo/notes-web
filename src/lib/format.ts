export function fmtTime(s: string): string {
  // 'YYYY-MM-DD HH:mm:ss' -> '今天 14:05' / '8/28 14:05'
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  const now = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === now.toDateString()) return hm;
  const y = d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()}/`;
  return `${y}${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

export const TYPE_LABEL: Record<string, string> = {
  idea: '想法',
  note: '随手记',
  reading: '读书',
};

export const TYPE_DOT: Record<string, string> = {
  idea: 'bg-stone-400',
  note: 'bg-blue-400',
  reading: 'bg-amber-400',
};
