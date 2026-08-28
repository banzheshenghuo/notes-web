export function fmtTime(s: string): string {
  // 'YYYY-MM-DD HH:mm:ss' -> '14:05'（今天）/ '8/28 14:05'
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
};
