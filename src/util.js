// 미트볼 상태창 — 순수 도구: 숫자 · 글자 · 달력 계산 (core.js에서 떼어 냄)
// 여기 있는 건 설정 · 채팅 · 화면을 전혀 건드리지 않는다 (아무것도 import하지 않음) → 어디서든 불러도 순환이 안 생김

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const clone = (o) => (o === undefined ? undefined : structuredClone(o));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
export const str = (v, d = '') => (v === null || v === undefined ? d : String(v));
export const arr = (v) => (Array.isArray(v) ? v : []);
export const norm = (x) => String(x ?? '').replace(/\s+/g, '').toLowerCase();
// 포맷터를 한 번만 만든다 (toLocaleString은 부를 때마다 새로 만들어서 긴 채팅에서 느렸음)
export const NUM_FMT = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
export const fmtNum = (n) => NUM_FMT.format(Number(n));
export const signed = (n) => (n > 0 ? `+${fmtNum(n)}` : n < 0 ? `−${fmtNum(Math.abs(n))}` : '±0');
export const uid = () => Math.random().toString(36).slice(2, 9);
let noShort = false; // 🪟 상태창 화면을 그리는 동안만 켠다 (shell.js renderPanel) — 그동안은 글을 「…」로 줄이지 않는다
export const setNoShort = (on) => { noShort = !!on; };
export const short = (t, n) => { t = String(t ?? '').replace(/\s+/g, ' ').trim(); return !noShort && t.length > n ? t.slice(0, n - 1) + '…' : t; };
export const splitBar = (val) => String(val ?? '').split('|').map(x => x.trim());
export function rand(n) { // 1..n
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return (buf[0] % n) + 1;
}
export const randInt = (a, b) => (b <= a ? a : a + rand(b - a + 1) - 1);
export function parseNum(raw) {
    const t = String(raw ?? '').trim().replace(/[−–—]/g, '-').replace(/[,\s]/g, '').replace(/^([=+-]?)[$€£¥₩￦]/, '$1'); // 「+$20」 「-₩500」
    const m = t.match(/^([=+-]?)(\d+(?:\.\d+)?)(억|만|천|k|m)?/i);
    if (!m) return null;
    let v = parseFloat(m[2]);
    const u = (m[3] || '').toLowerCase();
    if (u === '억') v *= 1e8; else if (u === '만') v *= 1e4; else if (u === '천' || u === 'k') v *= 1e3; else if (u === 'm') v *= 1e6;
    return { mode: m[1] === '=' ? 'set' : m[1] ? 'add' : 'bare', v: m[1] === '-' ? -v : v };
}
export const DEFAULT_MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].map((d, i) => ({ name: `${i + 1}월`, days: d }));
export const DEFAULT_WEEK = ['월', '화', '수', '목', '금', '토', '일'];
export const DEFAULT_TIMES = ['새벽', '아침', '낮', '저녁', '밤', '심야'];
export function yearDays(cal) { return cal.months.reduce((a, m) => a + m.days, 0); }
export function dayIndex(cal, y = cal.y, m = cal.m, d = cal.d) {
    let n = (y - 1) * yearDays(cal);
    for (let i = 0; i < m - 1; i++) n += cal.months[i].days;
    return n + d - 1;
}
export function addDays(cal, k) {
    let { y, m, d } = cal;
    k = Math.round(k);
    if (!Number.isFinite(k)) return;
    // 터무니없이 큰 수(AI가 「date: +999999999999」처럼 적었을 때)는 달을 하나씩 세다가 화면이 멈춘다 → 1만 년까지만 · 해 단위는 한 번에 건너뛴다
    const yd = yearDays(cal);
    k = Math.max(-yd * 10000, Math.min(yd * 10000, k));
    if (yd > 0 && Math.abs(k) >= yd) { const yy = Math.trunc(k / yd); y += yy; k -= yy * yd; if (d > cal.months[m - 1].days) d = cal.months[m - 1].days; }
    while (k > 0) {
        const md = cal.months[m - 1].days;
        if (d + k <= md) { d += k; k = 0; } else { k -= md - d + 1; d = 1; m++; if (m > cal.months.length) { m = 1; y++; } }
    }
    while (k < 0) {
        if (d + k >= 1) { d += k; k = 0; } else { k += d; m--; if (m < 1) { m = cal.months.length; y--; } d = cal.months[m - 1].days; }
    }
    Object.assign(cal, { y, m, d });
}
export function weekday(cal, y, m, d) { const w = cal.week.length || 7; return cal.week[((dayIndex(cal, y, m, d) % w) + w) % w] ?? ''; }
export function dateStr(cal, y = cal.y, m = cal.m, d = cal.d) {
    const mn = cal.months[m - 1]?.name ?? `${m}월`;
    const EN_M = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const isNumMonth = /^\d+월$/.test(mn) || (cal.months.length === 12 && String(mn).trim().toLowerCase().startsWith(EN_M[m - 1] ?? '\u0000')); // 「Mar」「March」도 → 「3월」 한 번만
    return `${cal.era ? cal.era + ' ' : ''}${y}년 ${isNumMonth ? mn : `${mn}(${m}월)`} ${d}일 (${weekday(cal, y, m, d)})`;
}
export function dateShort(cal) { return `${cal.m}/${cal.d}(${weekday(cal, cal.y, cal.m, cal.d)})`; }
export function eventsOn(cal, y, m, d) { return cal.events.filter(e => e.m === m && e.d === d && (e.repeat === 'yearly' || e.y === null || e.y === y)); }
export function parseDate(cal, v) {
    const t = String(v ?? '');
    let mm = t.match(/(\d+)\s*년\s*(\d+)\s*월\s*(\d+)\s*일?/) || t.match(/^(\d+)[-./](\d+)[-./](\d+)/);
    if (mm) return { y: +mm[1], m: +mm[2], d: +mm[3] };
    mm = t.match(/(\d+)\s*월\s*(\d+)\s*일?/) || t.match(/^(\d+)\s*[/.-]\s*(\d+)/);
    if (mm) return { y: null, m: +mm[1], d: +mm[2] };
    const name = cal.months.findIndex(x => t.includes(x.name));
    const dn = t.match(/(\d+)\s*일/) || (name >= 0 ? t.replace(cal.months[name].name, ' ').match(/\b(\d{1,2})\b/) : null); // 「April 14」 같은 영어 날짜도
    if (name >= 0 && dn) return { y: null, m: name + 1, d: +dn[1] };
    return null;
}
// ───── 🕐 시각 (v2.9): 달력의 「시간 적는 법」 cal.clock ─────
//   '' 시간대 낱말(아침 · 낮 · 저녁 — 예전 그대로) · '24' 14:30 · '12' 오후 2:30 · 'both' 낮 · 14:30
//   값은 그대로 cal.time 한 글자열에 들어간다 (따로 숫자를 두지 않는다 → 끄면 예전 자료와 똑같다)
export const CLOCK_STYLES = [['', '시간대', '아침 · 낮 · 저녁'], ['24', '24시간', '14:30'], ['12', '오전 · 오후', '오후 2:30'], ['both', '시간대 + 시각', '낮 · 14:30']];
// 글에서 시각을 읽는다 → 0시부터 몇 분 (못 읽으면 null). 「14:30」 「오후 2:30」 「2:30 PM」 「밤 9시 반」 「14시 5분」
export function parseClock(v) {
    const s = String(v ?? ''); let h, m = 0, colon = false;
    if (!/\d/.test(s)) { if (/정오|noon|midday/i.test(s)) return 720; if (/자정|midnight/i.test(s)) return 0; } // (검수: noon이 「낮」 = 13시로 읽혔다)
    let x = s.match(/(\d{1,2})\s*[:：]\s*(\d{2})(?!\d)/);
    if (x) { h = +x[1]; m = +x[2]; colon = true; }
    else if ((x = s.match(/(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?/))) { h = +x[1]; m = x[3] ? 30 : +(x[2] ?? 0); }
    else if ((x = s.match(/(?:^|[^\d])(\d{1,2})\s*([ap])\.?m\b/i))) { h = +x[1]; }
    else return null;
    if (!(h >= 0 && h <= 24 && m >= 0 && m <= 59)) return null;
    const pm = /오후|p\.?m\b/i.test(s), am = /오전|a\.?m\b/i.test(s);
    if (pm) { if (h < 12) h += 12; }
    else if (am) { if (h === 12) h = 0; }
    else if (!colon) { // 「저녁 7시」 「밤 9시」 「새벽 12시」 — 숫자만 적은 12시간 표기를 낱말로 가늠 (14:30처럼 쌍점으로 적은 것은 24시간으로 본다)
        if (/저녁|evening/i.test(s)) { if (h < 12) h += 12; }
        else if (/밤|night/i.test(s)) { if (h >= 6 && h < 12) h += 12; else if (h === 12) h = 0; }
        else if (/새벽|dawn/i.test(s)) { if (h === 12) h = 0; }
        else if (/낮|오후|afternoon/i.test(s)) { if (h >= 1 && h <= 6) h += 12; }
    }
    return (h % 24) * 60 + m;
}
// 시간대 낱말이 몇 시에 시작하나 (모르는 말은 null) — 낱말만 적혔을 때의 시각은 시작 1시간 뒤로 잡는다 (아침 → 07:00 · 저녁 → 19:00)
const SLOT_HOUR = [[/심야|자정|한밤|midnight|late night/i, 0], [/새벽|dawn|early morning/i, 4], [/아침|morning|sunrise/i, 6], [/오전|forenoon/i, 9], [/정오|점심|noon|midday/i, 12], [/오후|afternoon/i, 13], [/낮|daytime|day/i, 12], [/저녁|evening|dusk|sunset/i, 18], [/밤|night/i, 21]];
export function slotHour(word) { const w = String(word ?? ''); for (const [re, h] of SLOT_HOUR) if (re.test(w)) return h; return null; }
// 그 시각이 달력의 시간대 목록 중 어디인가 (아는 낱말이 없으면 하루를 고르게 나눈 칸)
export function slotOfClock(min, times) {
    const ts = Array.isArray(times) ? times : []; if (!ts.length) return '';
    const known = ts.map(t => [t, slotHour(t)]).filter(x => x[1] !== null).sort((a, b) => a[1] - b[1]);
    if (!known.length) return ts[Math.min(ts.length - 1, Math.floor(min / 1440 * ts.length))];
    let best = known[known.length - 1]; // 첫 시간대보다 이른 시각은 전날 마지막 시간대(밤)에 든다
    for (const k of known) if (k[1] * 60 <= min) best = k;
    return best[0];
}
export function fmtClock(min, style, times, en = false) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    const h = Math.floor(min / 60), mm = String(min % 60).padStart(2, '0'), h24 = `${String(h).padStart(2, '0')}:${mm}`;
    if (style === '12') return en ? `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}` : `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${mm}`;
    if (style === 'both') { const sl = slotOfClock(min, times); return sl ? `${sl} · ${h24}` : h24; }
    return h24;
}
// 지금 적힌 시간을 그 적는 법으로 (시각 ↔ 시간대 낱말). 못 읽는 글은 그대로 둔다
export function toClockStyle(time, style, times, en = false) {
    const t = String(time ?? ''); let min = parseClock(t);
    if (!style) return min === null ? t : (slotOfClock(min, times) || t);
    if (min === null) { const h = slotHour(t); if (h === null) return t; min = h * 60 + 60; }
    return fmtClock(min, style, times, en);
}
// 밤낮을 낱말로 보는 곳(밤 지도 · 날씨 · 시간대 효과)에 주는 글 — 시각만 적혀 있으면 시간대 낱말을 붙여 준다
export function timeWords(cal) { const t = String(cal?.time ?? ''), m = parseClock(t); return m === null ? t : `${t} ${m < 300 ? '심야' : m < 420 ? '새벽' : m < 660 ? '아침' : m < 1080 ? '낮' : m < 1260 ? '저녁' : '밤'}`; }
// 다음 시간: 시간대면 다음 칸 · 시각이면 1시간 뒤 (자정을 넘으면 wrap = true)
export function nextTime(c, en = false) {
    if (c.clock) { const min = parseClock(c.time) ?? (slotHour(c.time) ?? -1) * 60 + 60; return fmtClock(min + 60, c.clock, c.times, en); }
    const i = c.times.indexOf(c.time); return c.times[(i + 1) % c.times.length] ?? c.times[0];
}
export const nextTimeWraps = (c) => (c.clock ? (parseClock(c.time) ?? 0) + 60 >= 1440 : c.times.indexOf(c.time) === c.times.length - 1);
export function upcoming(c, days = 30) {
    const out = [];
    const t = { ...c };
    for (let k = 0; k <= days; k++) { if (k) addDays(t, 1); for (const e of eventsOn(c, t.y, t.m, t.d)) out.push([k, e]); }
    return out.slice(0, 8);
}
export function stamp(s) { return s?.data?.calendar ? dateStr(s.data.calendar) : ''; }
