// 순수 도구 — 아무것도 불러오지 않는다
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const clone = (o) => (o === undefined ? undefined : structuredClone(o));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
export const arr = (v) => (Array.isArray(v) ? v : []);
export const norm = (x) => String(x ?? '').replace(/\s+/g, '').toLowerCase();
export const short = (t, n) => { t = String(t ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
export const fmt = (n) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(Number(n) || 0);
export const signed = (n) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(Math.abs(n))}` : '±0');
export const uid = () => Math.random().toString(36).slice(2, 9);
// AI가 적은 이름을 객체 열쇠로 쓸 때 위험한 이름은 거른다
export const safeKey = (k) => { const s = String(k ?? '').trim().slice(0, 40); return ['__proto__', 'constructor', 'prototype'].includes(s) ? '' : s; };
// 「+5」 「-3」 「−3」 「5」 → 수 · 부호 여부
export function parseDelta(raw) {
    const s = String(raw ?? '').replace(/[−–—]/g, '-').replace(/,/g, '').trim();
    const m = /^([+-]?)\s*(\d+(?:\.\d+)?)/.exec(s);
    if (!m) return null;
    const n = Number(m[2]) * (m[1] === '-' ? -1 : 1);
    return { n, rel: !!m[1] };
}
// 간단한 해시 (캐시 열쇠용)
export function hash(s) { let h = 2166136261; s = String(s ?? ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
// 토큰 어림 (한글 1자 ≈ 0.7토큰 · 영문 4자 ≈ 1토큰) — 화면 표시용
export function tokens(t) { t = String(t ?? ''); const ko = (t.match(/[ㄱ-힝]/g) ?? []).length; return Math.ceil(ko * 0.7 + (t.length - ko) / 4); }

// ───── 세계 시간: 시작부터 지난 「분」 하나로 센다 (욕구 · 딱지 · 약속이 모두 같은 자) ─────
export const DAY = 1440;
export const PERIODS = [['새벽', 5], ['아침', 8], ['오전', 10], ['낮', 13], ['점심', 12], ['오후', 15], ['저녁', 19], ['밤', 22], ['심야', 1], ['자정', 0]];
export const PERIOD_EN = { dawn: 5, morning: 8, noon: 12, afternoon: 15, evening: 19, night: 22, midnight: 0 };
export function periodName(min) {
    const h = Math.floor(((min % DAY) + DAY) % DAY / 60);
    return h < 5 ? '심야' : h < 7 ? '새벽' : h < 11 ? '아침' : h < 17 ? '낮' : h < 21 ? '저녁' : '밤';
}
export function hhmm(min) { const m = ((min % DAY) + DAY) % DAY; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
// 「14:30」 「오후 2시」 「저녁」 → 하루 안의 분 (모르면 null)
export function clockOf(v) {
    const s = String(v ?? '').trim().toLowerCase();
    let m = /(\d{1,2})\s*[:시]\s*(\d{1,2})?/.exec(s);
    if (m) { let h = Number(m[1]); const mi = Number(m[2] ?? 0); if (/오후|pm/.test(s) && h < 12) h += 12; if (/오전|am/.test(s) && h === 12) h = 0; if (h < 24 && mi < 60) return h * 60 + mi; }
    for (const [w, h] of PERIODS) if (s.includes(w)) return h * 60;
    for (const [w, h] of Object.entries(PERIOD_EN)) if (s.includes(w)) return h * 60;
    return null;
}
// 「6h」 「6시간」 「30분」 「반나절」 「3일」 → 분
export function spanOf(v) {
    const s = String(v ?? '').replace(/\s+/g, '').toLowerCase();
    if (!s) return null;
    if (/반나절/.test(s)) return 360;
    if (/하루|1일$/.test(s) && !/\d+일/.test(s.replace(/^1일$/, ''))) return DAY;
    let t = 0, hit = false;
    for (const [re, k] of [[/(\d+(?:\.\d+)?)(?:d|일|days?)/, DAY], [/(\d+(?:\.\d+)?)(?:h|시간|hours?|hrs?)/, 60], [/(\d+)(?:m|분|min)/, 1], [/(\d+)(?:w|주)/, DAY * 7]]) {
        const m = re.exec(s); if (m) { t += Number(m[1]) * k; hit = true; }
    }
    return hit ? Math.round(t) : null;
}
// 📅 달력: 양력이 기본 · 설정집 start.cal 에 달(이름 · 날 수) · 요일 이름 · 연호 · 시간 적는 법을 두면 그 달력으로
//   start = { y, m, d, clock, cal: { months: [{ name, days }] | null, week: [이름] | null, era, style: '' | '24' | '12' } }
const GREG_W = '일월화수목금토';
const isCustom = (start) => Array.isArray(start?.cal?.months) && start.cal.months.length > 0;
export function monthDays(start, y, m) { return isCustom(start) ? (start.cal.months[m - 1]?.days ?? 30) : new Date(Date.UTC(y, m, 0)).getUTCDate(); }
export const monthCount = (start) => (isCustom(start) ? start.cal.months.length : 12);
export const monthName = (start, m) => (isCustom(start) ? start.cal.months[m - 1]?.name ?? `${m}월` : `${m}월`);
// (y, m, d) → 시작일로부터 며칠째
export function dayIndexOf(start, y, m, d) {
    if (!isCustom(start)) return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(start?.y ?? 2026, (start?.m ?? 1) - 1, start?.d ?? 1)) / 86400000);
    const M = start.cal.months, yl = M.reduce((a, x) => a + x.days, 0), at = (Y, Mo, D) => Y * yl + M.slice(0, Mo - 1).reduce((a, x) => a + x.days, 0) + (D - 1);
    return at(y, m, d) - at(start.y, start.m, start.d);
}
export function weekName(start, dayN) {
    const W = start?.cal?.week?.length ? start.cal.week : null;
    if (W) return W[((dayN % W.length) + W.length) % W.length];
    if (isCustom(start)) return GREG_W[((dayN % 7) + 7) % 7];
    const dt = new Date(Date.UTC(start?.y ?? 2026, (start?.m ?? 1) - 1, (start?.d ?? 1) + dayN)); return GREG_W[dt.getUTCDay()];
}
export function dateOf(start, min) {
    const dn = Math.floor(min / DAY);
    if (!isCustom(start)) { const dt = new Date(Date.UTC(start?.y ?? 2026, (start?.m ?? 1) - 1, (start?.d ?? 1) + dn)); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), w: GREG_W[dt.getUTCDay()], mn: `${dt.getUTCMonth() + 1}월` }; }
    let y = start.y, m = start.m, d = start.d + dn;
    while (d > monthDays(start, y, m)) { d -= monthDays(start, y, m); m++; if (m > monthCount(start)) { m = 1; y++; } }
    while (d < 1) { m--; if (m < 1) { m = monthCount(start); y--; } d += monthDays(start, y, m); }
    return { y, m, d, w: weekName(start, dn), mn: monthName(start, m) };
}
// 시간 적는 법: '' 시간대만 · '24' 14:30 · '12' 오후 2:30
export function clockText(start, min) {
    const st = start?.cal?.style ?? '24', t = ((min % DAY) + DAY) % DAY, h = Math.floor(t / 60), mi = t % 60;
    if (st === '') return periodName(min);
    if (st === '12') return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(mi).padStart(2, '0')}`;
    return hhmm(min);
}
export function dateText(start, min, withTime = true) {
    const d = dateOf(start, min), era = start?.cal?.era ? `${start.cal.era} ${d.y}년 ` : '';
    return `${era}${d.mn} ${d.d}일 (${d.w})${withTime ? ` ${periodName(min)}${start?.cal?.style === '' ? '' : ` ${clockText(start, min)}`}` : ''}`;
}
// 「3월 14일」 「3/14」 「서리달 14일」 → 그날 0시의 분 (지났으면 다음 해)
export function dayOfDate(start, v, now = 0) {
    const s = String(v ?? '');
    let mo = null, d = null;
    const m1 = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(s);
    if (m1) { mo = Number(m1[1]); d = Number(m1[2]); }
    else if (isCustom(start)) { const i = start.cal.months.findIndex(x => x.name && s.includes(x.name)); const dd = /(\d{1,2})\s*일/.exec(s); if (i >= 0 && dd) { mo = i + 1; d = Number(dd[1]); } }
    if (!mo || !d) return null;
    const cur = dateOf(start, now), today = Math.floor(now / DAY);
    for (const y of [cur.y, cur.y + 1]) { const dn = dayIndexOf(start, y, mo, d); if (dn >= today) return dn * DAY; }
    return null;
}
