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
export const SLOTS = [['새벽', 5], ['아침', 8], ['오전', 10], ['낮', 13], ['점심', 12], ['오후', 15], ['저녁', 19], ['밤', 22], ['심야', 1], ['자정', 0]];
export const SLOT_EN = { dawn: 5, morning: 8, noon: 12, afternoon: 15, evening: 19, night: 22, midnight: 0 };
export function slotName(min) {
    const h = Math.floor(((min % DAY) + DAY) % DAY / 60);
    return h < 5 ? '심야' : h < 7 ? '새벽' : h < 11 ? '아침' : h < 17 ? '낮' : h < 21 ? '저녁' : '밤';
}
export function hhmm(min) { const m = ((min % DAY) + DAY) % DAY; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
// 「14:30」 「오후 2시」 「저녁」 → 하루 안의 분 (모르면 null)
export function clockOf(v) {
    const s = String(v ?? '').trim().toLowerCase();
    let m = /(\d{1,2})\s*[:시]\s*(\d{1,2})?/.exec(s);
    if (m) { let h = Number(m[1]); const mi = Number(m[2] ?? 0); if (/오후|pm/.test(s) && h < 12) h += 12; if (/오전|am/.test(s) && h === 12) h = 0; if (h < 24 && mi < 60) return h * 60 + mi; }
    for (const [w, h] of SLOTS) if (s.includes(w)) return h * 60;
    for (const [w, h] of Object.entries(SLOT_EN)) if (s.includes(w)) return h * 60;
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
// 날짜: 시작일(y, m, d)에서 n일 뒤 — 양력 그대로
export function dateOf(start, min) {
    const d0 = Date.UTC(start?.y ?? 2026, (start?.m ?? 1) - 1, start?.d ?? 1);
    const dt = new Date(d0 + Math.floor(min / DAY) * 86400000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), w: '일월화수목금토'[dt.getUTCDay()] };
}
export function dateText(start, min, withTime = true) {
    const d = dateOf(start, min);
    return `${d.m}월 ${d.d}일 (${d.w})${withTime ? ` ${slotName(min)} ${hhmm(min)}` : ''}`;
}
// 「3월 14일」 「3/14」 → 그날 0시의 분 (시작일 기준 · 지났으면 다음 해)
export function dayOfDate(start, v, now = 0) {
    const m = /(\d{1,2})\s*[월/.-]\s*(\d{1,2})/.exec(String(v ?? ''));
    if (!m) return null;
    const cur = dateOf(start, now);
    for (const y of [cur.y, cur.y + 1]) {
        const at = (Date.UTC(y, Number(m[1]) - 1, Number(m[2])) - Date.UTC(start?.y ?? 2026, (start?.m ?? 1) - 1, start?.d ?? 1)) / 86400000 * DAY;
        if (at >= Math.floor(now / DAY) * DAY) return at;
    }
    return null;
}
