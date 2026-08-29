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

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

/** 复盘卡片时段标识：'2026-08-29' + pm -> '今天·下午' / '8/28 周五·下午' */
export function fmtDayPeriod(date: string, period: 'am' | 'pm'): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  const now = new Date();
  const day = d.toDateString() === now.toDateString()
    ? '今天'
    : `${d.getMonth() + 1}/${d.getDate()} 周${WEEK[d.getDay()]}`;
  return `${day}·${period === 'am' ? '上午' : '下午'}`;
}
