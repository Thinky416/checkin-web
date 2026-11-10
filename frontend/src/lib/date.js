/** 日期工具：全部按本地日历算，避免时区/夏令时漂移。 */

export const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

/** Date → "2026-11-10" */
export const toKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayKey = () => toKey(new Date());

/** "2026-11-10" → Date（本地 00:00） */
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function diffDays(from, to) {
  const a = parseKey(from);
  const b = parseKey(to);
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000);
}

export const isKey = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** "2026-11-10" → "2026.11.10" */
export const fmtKey = (key) => key.replace(/-/g, '.');

export function fmtChinese(key) {
  const d = parseKey(key);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 周${WEEK[d.getDay()]}`;
}

/** 后端返回的 Instant → "21:19" */
export function fmtTime(instant) {
  if (!instant) return '';
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
