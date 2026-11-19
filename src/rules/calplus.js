// 📅 달력 더하기: 📌 D-day · ✅ 할 일 · 🩸 생리 주기 · 📝 날짜 메모 · 👀 애인이 메모를 본다
//   사용자가 손으로 넣는 것 → 채팅 메타 meta.cal (사건 ops로 만들지 않음)
//   AI가 만드는 것은 「noted: 이름 | 날짜」 사건 하나 → 엔진이 S.noted에 접어 둔다 (눈 감기 · 되돌리기 · 리롤이 저절로 맞음)
//   본편에는 결과 한 줄만 (숫자 · 예상일은 안 보냄) · AI 호출 0회
import { getMeta } from '../base/st.js';
import { DAY, dateOf, dayIndexOf, short } from '../base/util.js';
import { isStar } from './book.js';

export const PEEK_EVERY = 8; // 👀 몇 번째 답마다 한 번
export const CYCLE_DEF = { on: false, starts: [], len: 28, dur: 5, tell: false };

// 채팅 메타의 달력 칸 (없으면 빈 모양으로 채움 · 저장은 부르는 쪽이)
export function calOf(meta = getMeta()) {
    if (!meta) return null;
    const c = (meta.cal ??= {});
    if (!Array.isArray(c.dday)) c.dday = [];
    if (!Array.isArray(c.todo)) c.todo = [];
    if (!c.notes || typeof c.notes !== 'object') c.notes = {};
    c.cycle = { ...CYCLE_DEF, ...(c.cycle ?? {}) };
    if (!Array.isArray(c.cycle.starts)) c.cycle.starts = [];
    c.peek = !!c.peek; // 👀 애인이 메모를 본다 (기본 꺼짐)
    return c;
}
export const dayNow = (S) => Math.floor((S?.t ?? 0) / DAY);
export const mdOf = (start, day) => { const d = dateOf(start, day * DAY); return `${d.m}/${d.d}`; };

// 「2026-12-25」 「12/25」 「12월 25일」 「서리달 3일」 「오늘」 「내일」 「3일 뒤」 → 이야기 속 날짜 번호 (모르면 null)
export function parseDay(start, v, today = 0) {
    const s = String(v ?? '').trim(); if (!s) return null;
    if (/^오늘$/.test(s)) return today;
    if (/^내일$/.test(s)) return today + 1;
    if (/^어제$/.test(s)) return today - 1;
    let m = /^([+-]?\d{1,4})\s*일\s*(뒤|후|전)$/.exec(s); if (m) return today + Number(m[1]) * (m[2] === '전' ? -1 : 1);
    const cur = dateOf(start, today * DAY);
    m = /(\d{3,4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/.exec(s); if (m) return dayIndexOf(start, Number(m[1]), Number(m[2]), Number(m[3]));
    m = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(s); if (m) return dayIndexOf(start, cur.y, Number(m[1]), Number(m[2]));
    const M = start?.cal?.months;
    if (Array.isArray(M) && M.length) { const i = M.findIndex(x => x.name && s.includes(x.name)), d = /(\d{1,2})\s*일/.exec(s); if (i >= 0 && d) return dayIndexOf(start, cur.y, i + 1, Number(d[1])); }
    return null;
}
// 그날의 D-day (달력 일정 목록 · 점에 같이 나옴)
export const ddaysOn = (day) => (calOf()?.dday ?? []).filter(x => x.day === day).map(x => ({ icon: '📌', text: x.name }));
// D-day 글자: 남으면 D-n · 지나면 D+n · 당일 D-DAY
export const ddayLabel = (day, today) => (day === today ? 'D-DAY' : day > today ? `D-${day - today}` : `D+${today - day}`);

// 🩸 생리 주기: 지금 며칠째 · 다음 예상일 (꺼져 있거나 기록이 없으면 null)
export function cycleInfo(cal, today) {
    const c = cal?.cycle; if (!c?.on) return null;
    const past = c.starts.filter(n => n <= today).sort((a, b) => a - b), last = past.at(-1);
    if (last == null) return { last: null, next: null, dayN: 0, late: 0 };
    const dayN = today - last < c.dur ? today - last + 1 : 0, next = last + c.len;
    return { last, next, dayN, late: !dayN && next < today ? today - next : 0 };
}
// 달력 칸 색: 기록한 기간 'cy' · 예상 기간 'cyp' (앞으로 3번까지)
export function cycleDays(cal, today) {
    const c = cal?.cycle, out = new Map(); if (!c?.on) return out;
    for (const s of c.starts) for (let k = 0; k < c.dur; k++) out.set(s + k, 'cy');
    const info = cycleInfo(cal, today);
    if (info?.last != null) for (let n = 1; n <= 3; n++) { const s = info.last + c.len * n; if (s + c.dur <= today) continue; for (let k = 0; k < c.dur; k++) if (!out.has(s + k)) out.set(s + k, 'cyp'); }
    return out;
}

// 👀 이미 언급한 메모인가 (엔진이 접은 S.noted: [{ who, md }]) → 언급한 인물 이름
export function seenBy(r, day) {
    const md = mdOf(r.book.world.start, Number(day));
    const hit = (r.S.noted ?? []).find(n => n.md === md || (!n.md && n.day === Number(day)));
    return hit?.who ?? '';
}
// 지금 힌트로 낼 메모: 보여 주기를 켠 것 중 아직 안 본 것, 가장 최근에 쓴 것 1개
export function peekNote(r, cal = calOf()) {
    if (!cal?.peek) return null;
    const L = Object.entries(cal.notes).filter(([d, n]) => n?.show && String(n.text ?? '').trim() && !seenBy(r, d)).sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0));
    return L[0] ? { day: Number(L[0][0]), note: L[0][1] } : null;
}
// 애정이 가장 높은 ⭐ 주요 인물
export function peekWho(r, meta = getMeta()) {
    const E = Object.entries(r.S.rel ?? {}).filter(([n, x]) => !x.gone && isStar(meta, r.book, n)).sort((a, b) => b[1].aff - a[1].aff);
    return E[0]?.[0] ?? '';
}
// ⚡ 바로 받기: 사용자가 누르면 「다음 답 1번」에만 (meta.cal.now.peek · .sneak = { turn, day }) — 답이 오면 turn이 달라져 저절로 꺼짐
export const nowArmed = (cal, k, S, slack = 0) => { const n = cal?.now?.[k]; return !!n && S && S.turn >= n.turn && S.turn <= n.turn + slack; };
function nowPeekNote(r, cal, slack = 0) {
    if (!nowArmed(cal, 'peek', r.S, slack)) return null;
    const d = cal.now.peek.day, n = cal.notes[d];
    return String(n?.text ?? '').trim() ? { day: d, note: n } : null;
}
// 분류 모델 목록에 넣을 noted 키 (볼 메모가 있을 때만 · 바로 받기는 그 답을 고를 때까지)
export function notedKey(r) {
    const cal = r && calOf(), p = cal && (nowPeekNote(r, cal, 1) ?? peekNote(r, cal)), who = p && peekWho(r); if (!who) return [];
    return [['noted', `${who} | ${mdOf(r.book.world.start, p.day)}`, `${who}이(가) 달력 메모(${mdOf(r.book.world.start, p.day)})를 보고 그 얘기를 꺼냈을 때만`]];
}

// 본편에 갈 결과 줄 — lv: 달력 영향력 (눈 감기 · 멈춤 · 🙈 숨기기면 0) · mode: 'A' | 'B'
export function calLines(r, lv, user = '{{user}}', mode = 'A', lvRel = 0) {
    const out = { facts: [], hint: [] }, cal = calOf(); if (!cal || !r || lv <= 0) return out;
    const today = dayNow(r.S);
    // 📌 D-day 당일 · 하루 전 (영향력 2부터)
    if (lv >= 2) for (const d of cal.dday) {
        if (d.day === today) out.facts.push(`Today is "${short(d.name, 40)}".`);
        else if (d.day === today + 1) out.facts.push(`Tomorrow is "${short(d.name, 40)}".`);
    }
    // 🩸 기간 중 + 「본편에 알리기」를 켰을 때만 · 숫자는 며칠째만
    const ci = cal.cycle.tell ? cycleInfo(cal, today) : null;
    if (ci?.dayN) out.facts.push(`${user} is on her period (day ${ci.dayN}).`);
    if (ci?.dayN && ci.dayN <= 3) out.hint.push(`(${user} is on her period — people close to her (especially a partner) know or notice it and act on it naturally: care, warmth, food, rest.)`);
    // 👀 8번째 답마다 한 번 · 보여 주기를 켠 가장 최근 메모 1개 — ⚡ 바로 받기면 그 메모를 이번 답에 (한 줄만)
    const nowP = nowPeekNote(r, cal);
    if (nowP || (cal.peek && (r.S.turn + 1) % PEEK_EVERY === 0)) {
        const p = nowP ?? peekNote(r, cal), who = p && peekWho(r);
        if (who) {
            const md = mdOf(r.book.world.start, p.day), text = short(String(p.note.text).replace(/\s*\n+\s*/g, ' / '), 80);
            out.hint.push(`(${who} may notice ${user}'s calendar note on ${md}: "${text}" and bring it up naturally if it fits.${mode === 'A' ? ` If they do, add "noted: ${who} | ${md}" to the <meatball> block.` : ''})`);
        }
    }
    // ✍ ⚡ 바로 받기: 애인이 그날 칸에 몰래 한 줄 (관계 · 달력 둘 다 켜져 있을 때 · 이번 답 1번)
    if (lvRel >= 1 && nowArmed(cal, 'sneak', r.S)) {
        const who = peekWho(r), md = mdOf(r.book.world.start, cal.now.sneak.day);
        if (who) out.hint.push(`${who} secretly writes a short, sweet note in ${user}'s calendar on ${md} this turn (${user} doesn't see it yet).${mode === 'A' ? ` Add "meddle: ${who} | 달력 | ${md} | (the note)" to the <meatball> block.` : ''}`);
    }
    return out;
}
