// 날짜 문자열 포맷. 저장 형식은 <input type="datetime-local"> 과 같은 'YYYY-MM-DDTHH:mm'.

const pad = (n) => String(n).padStart(2, '0');

export function toLocalInput(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isLocalInput(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

/** value 에 분을 더한 'YYYY-MM-DDTHH:mm' */
export function addMinutes(value, minutes) {
  const d = isLocalInput(value) ? new Date(value) : new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return toLocalInput(d);
}

function parts(value) {
  const m = isLocalInput(value) ? value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/) : null;
  return m ? { y: m[1], mo: m[2], d: m[3], h: m[4], mi: m[5] } : null;
}

/** 목록·댓글용: 10.26 12:34 */
export function formatShort(value) {
  const p = parts(value);
  return p ? `${p.mo}.${p.d} ${p.h}:${p.mi}` : '';
}

/** 본문용: 2026.10.26 12:34 */
export function formatFull(value) {
  const p = parts(value);
  return p ? `${p.y}.${p.mo}.${p.d} ${p.h}:${p.mi}` : '';
}
