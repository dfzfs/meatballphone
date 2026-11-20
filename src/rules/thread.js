// 🧵 실타래: 이미 있는 「변화 기록」(fold().changes)과 「그때 장소 · 시각 · 같이 있던 사람」(fold().at)을
//   날짜 · 인물 · 장소로 다르게 묶어 보여 주는 도구. 화면에서만 쓴다.
//   - 저장 0: 채팅 파일 · 메타에 아무것도 안 씀
//   - 본편 0 · AI 0: 주입 · 분류에 안 섞임
//   - 랜덤 · 실제 시계 없음: 다시 열어도 같은 결과
//   - 같은 fold 결과(r)는 한 번만 묶음 (WeakMap)
import { DAY, norm } from '../base/util.js';

const memo = new WeakMap();
// 화면에 보일 만한 변화만 (시간 흐름 · 시간에 따른 욕구 감소는 뺌)
const real = (c) => c && c.src !== 'time' && c.f !== 'time';
// 💰 가계부에 넣는 돈 변화: 이야기 속에서 쓰고 번 것만 — ✋ 직접 고침(계산이 틀려서 맞춘 것 · 환율에 맞춤)은 빼기
const isMoney = (c) => c.f === 'cash' && typeof c.to === 'number' && c.src !== 'hand';
const dayOfI = (r, i) => (r.at?.[i] ? Math.floor(r.at[i].t / DAY) : null);

function build(r) {
    const days = new Map(); // day → { day, first, last, ev: [{i,c}], spend, earn, ppl: Map(name→답 수), places: Map(name→답 수), n }
    const ev = []; // [{ i, c, day }]
    const n = Math.max(r.changes?.length ?? 0, r.at?.length ?? 0);
    let prevLoc = null;
    const visits = new Map(); // 장소 → 들어간 횟수
    const firstAt = new Map(); // 장소 → 처음 간 메시지
    for (let i = 0; i < n; i++) {
        const at = r.at?.[i]; if (!at) continue;
        const day = Math.floor(at.t / DAY);
        let D = days.get(day);
        if (!D) days.set(day, (D = { day, first: i, last: i, ev: [], spend: 0, earn: 0, ppl: new Map(), places: new Map(), n: 0 }));
        D.last = i;
        const ch = (r.changes?.[i] ?? []).filter(real);
        if (ch.length) {
            D.n++;
            for (const w of at.with) D.ppl.set(w, (D.ppl.get(w) ?? 0) + 1);
            if (at.loc) D.places.set(at.loc, (D.places.get(at.loc) ?? 0) + 1);
        }
        for (const c of ch) {
            ev.push({ i, c, day }); D.ev.push({ i, c });
            if (isMoney(c)) { const d = c.to - c.from; if (d < 0) D.spend -= d; else D.earn += d; }
        }
        if (at.loc && at.loc !== prevLoc) { visits.set(at.loc, (visits.get(at.loc) ?? 0) + 1); if (!firstAt.has(at.loc)) firstAt.set(at.loc, i); }
        prevLoc = at.loc;
    }
    return { days, ev, visits, firstAt };
}
export function thread(r) {
    if (!r) return { days: new Map(), ev: [], visits: new Map(), firstAt: new Map() };
    let T = memo.get(r); if (!T) memo.set(r, (T = build(r)));
    return T;
}
export { dayOfI };

// ───── 👤 인물 ─────
// 이 인물과 관련된 변화인가
export const aboutPerson = (c, name) => c.who === name || c.f.startsWith(`rel.${name}.`) || c.f === `stage.${name}` || c.f === `npc.${name}` || c.f === `gone.${name}`
    || (c.f.startsWith('pair.') && c.f.slice(5).split('|').includes(name)) || (c.f === 'item' && String(c.why).startsWith(`${name}에게`)) || (c.f === 'noted' && c.to === name);
// 인물 연표 (최근 것부터)
export function personLine(r, name, max = 30) {
    const out = [];
    for (const e of thread(r).ev) if (aboutPerson(e.c, name)) out.push(e);
    return out.reverse().slice(0, max);
}
// 「처음」 모음 + 함께한 정도
export function personFirsts(r, name) {
    const T = thread(r), out = { meet: null, stageUp: null, gift: null, together: 0, places: new Map(), songs: [] };
    const n = r.at?.length ?? 0;
    for (let i = 0; i < n; i++) {
        const at = r.at[i]; if (!at || !(r.changes?.[i] ?? []).some(real) || !at.with.includes(name)) continue;
        out.together++; if (out.meet == null) out.meet = i;
        if (at.loc) out.places.set(at.loc, (out.places.get(at.loc) ?? 0) + 1);
    }
    for (const e of T.ev) {
        if (!aboutPerson(e.c, name)) continue;
        if (out.meet == null || e.i < out.meet) out.meet = e.i;
        if (out.stageUp == null && e.c.f === `stage.${name}` && e.c.why === '단계가 올랐어요') out.stageUp = e;
        if (out.gift == null && e.c.f === `rel.${name}.aff` && String(e.c.why).startsWith('🎁')) out.gift = e;
    }
    // 🎵 같이 들은 곡: 곡이 뜬 답에 그 사람이 같이 있었음
    const seen = new Set();
    for (const s of r.S?.bgmLog ?? []) if (s?.m != null && r.at?.[s.m]?.with.includes(name) && !seen.has(norm(s.title))) { seen.add(norm(s.title)); out.songs.push(s); }
    out.songs = out.songs.reverse().slice(0, 5);
    return out;
}

// ───── 📍 장소 ─────
export function placeLife(r, place, max = 6) {
    const T = thread(r), out = { visits: T.visits.get(place) ?? 0, first: T.firstAt.get(place) ?? null, ev: [], ppl: new Map(), ate: [] };
    const n = r.at?.length ?? 0;
    for (let i = 0; i < n; i++) {
        const at = r.at[i]; if (at?.loc !== place || !(r.changes?.[i] ?? []).some(real)) continue;
        for (const w of at.with) out.ppl.set(w, (out.ppl.get(w) ?? 0) + 1);
    }
    for (const e of T.ev) {
        if (r.at?.[e.i]?.loc !== place) continue;
        const c = e.c;
        if (c.f === 'receipt') out.ate.push(String(c.to).replace(/\s*[\d,.]+\s*\S*$/, ''));
        if (c.f === 'loc' || c.f.startsWith('need.') || c.f === 'receipt' || c.f === 'cash') continue;
        out.ev.push(e);
    }
    out.ev = out.ev.reverse().slice(0, max);
    out.ate = [...new Set(out.ate.reverse())].slice(0, 6);
    return out;
}

// ───── 📅 하루 ─────
export const dayInfo = (r, day) => thread(r).days.get(day) ?? null;
// 하루에서 보여 줄 큰 변화 몇 개 (단계 · 새 인물 · 관계 · 물건 · 딱지 순)
const RANK = (c) => (c.cross ? 0 : c.f.startsWith('stage') || c.f.startsWith('npc') || c.f.startsWith('gone') ? 1 : c.f.startsWith('rel.') || c.f.startsWith('pair') ? 2 : c.f === 'item' || c.f === 'receipt' ? 3 : c.f.startsWith('status') ? 4 : c.f === 'loc' ? 6 : c.f.startsWith('need') ? 7 : 5);
export function dayTop(D, max = 5) {
    if (!D) return [];
    return [...D.ev].sort((a, b) => RANK(a.c) - RANK(b.c) || a.i - b.i).slice(0, max);
}

// ───── 👜 물건 종류 (이름 · 효과만 보고 · 저장 0) ─────
export const WEAR = /(옷|셔츠|블라우스|니트|스웨터|후드|로브|코트|자켓|재킷|점퍼|패딩|조끼|망토|바지|청바지|치마|스커트|드레스|원피스|교복|정장|수트|제복|잠옷|파자마|속옷|양말|스타킹|신발|구두|운동화|부츠|샌들|슬리퍼|모자|비니|장갑|목도리|스카프|넥타이|벨트|반지|목걸이|귀걸이|팔찌|시계|안경|고글|마스크|가면|갑옷|투구|방패|머리띠|리본|앞치마|우비|coat|jacket|hood|robe|cloak|shirt|dress|skirt|pants|jeans|boots?|shoes?|\bhat\b|\bcap\b|gloves?|scarf|\bring\b|necklace|earrings?|glasses|goggles|mask|armor|uniform)/i;
const FOODISH = /(빵|밥|면|국|떡|고기|갈비|과일|사과|우유|커피|차|주스|술|맥주|와인|과자|사탕|초콜릿|케이크|도시락|김밥|라면|원두|산나물|탕약|약|음식|간식|bread|meat|apple|coffee|tea|milk|beer|wine|candy|cake|food|snack)/i;
const goodFx = (book, name) => { const n = norm(name); for (const p of book?.world?.places ?? []) for (const g of p.goods ?? []) if (norm(g.name) === n) return g.fx ?? {}; return book?.world?.itemFx?.[name] ?? null; };
// food · wear · etc
export function itemKind(book, name, fx) {
    const f = fx && Object.keys(fx).length ? fx : goodFx(book, name);
    if (WEAR.test(name)) return 'wear';
    if ((f && Object.values(f).some(v => Number(v) > 0)) || FOODISH.test(name)) return 'food';
    return 'etc';
}
// 돈 쓴 곳 종류: 식비 · 옷 · 선물 · 기타
export const SPEND = { food: ['🍞', '식비', '#e8a33d'], wear: ['👕', '옷 · 꾸밈', '#7c6cf0'], gift: ['🎁', '선물', '#e85d8a'], etc: ['📦', '기타', '#8d99ae'] };
const spendKind = (book, why) => { const w = String(why ?? ''); if (/선물|gift/i.test(w)) return 'gift'; const k = itemKind(book, cashWhy(w)); return k === 'etc' ? 'etc' : k; };

// ───── 💰 가계부 ─────
const cashWhy = (w) => String(w ?? '').replace(/\s*(삼|팖)$/, '').trim() || '기타';
export function ledger(r, days = 7) {
    const T = thread(r), list = [...T.days.values()].sort((a, b) => b.day - a.day);
    // 오늘까지 이어진 날들 (돈이 안 움직인 날도 빈칸으로 — 하루치만 있으면 막대 하나가 화면을 다 차지하던 것)
    const today = Math.floor((r.S?.t ?? 0) / DAY), recent = [];
    if (list.some(D => D.spend || D.earn)) { const lo = Math.min(...list.map(D => D.day)); for (let d = today; d > today - days; d--) recent.push(T.days.get(d) ?? { day: d, spend: 0, earn: 0, pre: d < lo }); } // 이야기 전 날은 이름 없이 빈칸
    const by = new Map(), kinds = new Map(), week = { spend: 0, earn: 0, kind: new Map() }, dayKind = new Map(); let spend = 0, earn = 0;
    for (const e of T.ev) {
        const c = e.c; if (!isMoney(c)) continue;
        const d = c.to - c.from, inWeek = e.day > today - days;
        if (d < 0) {
            spend -= d; const k = cashWhy(c.why), sk = spendKind(r.book, c.why); by.set(k, (by.get(k) ?? 0) - d); kinds.set(sk, (kinds.get(sk) ?? 0) - d);
            if (inWeek) { week.spend -= d; week.kind.set(sk, (week.kind.get(sk) ?? 0) - d); const m = dayKind.get(e.day) ?? new Map(); m.set(sk, (m.get(sk) ?? 0) - d); dayKind.set(e.day, m); }
        } else { earn += d; if (inWeek) week.earn += d; }
    }
    const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { recent, top, spend, earn, week, dayKind, kinds };
}
// 👜 물건 이력: 이 물건이 언제 · 왜 들어오고 나갔나
export function itemLife(r, name, max = 8) {
    const out = [];
    for (const e of thread(r).ev) if (e.c.f === 'item' && e.c.label === name) out.push(e);
    return { first: out[0] ?? null, list: out.reverse().slice(0, max) };
}

// ───── 🏷️ 딱지 이력 ─────
export function statusLife(r, max = 12) {
    const open = new Map(), out = [];
    for (const e of thread(r).ev) {
        if (!e.c.f.startsWith('status.')) continue;
        const name = e.c.label;
        if (e.c.to === '풀림') { const o = open.get(name); out.push({ name, icon: e.c.icon, from: o?.i ?? null, to: e.i, why: o?.c.why ?? '', kind: e.c.kind, t0: o ? r.at?.[o.i]?.t : null, t1: r.at?.[e.i]?.t }); open.delete(name); }
        else open.set(name, e);
    }
    for (const [name, o] of open) out.push({ name, icon: o.c.icon, from: o.i, to: null, why: o.c.why, kind: o.c.kind, t0: r.at?.[o.i]?.t, t1: null });
    return out.sort((a, b) => (b.to ?? b.from ?? 0) - (a.to ?? a.from ?? 0)).slice(0, max);
}

// ───── 📒 통계 · 앨범 ─────
export function stats(r) {
    const T = thread(r), chat = r.at ?? [];
    let turns = 0; for (let i = 0; i < (r.changes?.length ?? 0); i++) if ((r.changes[i] ?? []).length) turns++;
    const dayList = [...T.days.keys()], span = dayList.length ? Math.max(...dayList) - Math.min(...dayList) + 1 : 0;
    const place = new Map(), aff = new Map();
    for (let i = 0; i < chat.length; i++) { const at = chat[i]; if (at?.loc && (r.changes?.[i] ?? []).some(real)) place.set(at.loc, (place.get(at.loc) ?? 0) + 1); }
    let spend = 0, earn = 0;
    for (const e of T.ev) {
        const c = e.c;
        if (isMoney(c)) { const d = c.to - c.from; if (d < 0) spend -= d; else earn += d; }
        if (/^rel\..+\.aff$/.test(c.f) && c.who) aff.set(c.who, (aff.get(c.who) ?? 0) + (c.to - c.from));
    }
    const best = (M) => [...M.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    return { turns, span, spend, earn, place: best(place), aff: best(aff), places: T.visits.size, people: Object.keys(r.S?.rel ?? {}).length, tasted: r.S?.tasted?.length ?? 0 };
}
// 🎞 앨범: 큰 순간만 (단계 · 새 인물 · 빠짐 · 경계 · 인물끼리 사이 · 운명)
export function album(r, max = 40) {
    const out = [];
    for (const e of thread(r).ev) {
        const c = e.c;
        if (c.f.startsWith('stage.need') || c.f.startsWith('gauge.')) continue; // 욕구 경계는 너무 잦음
        if (c.cross || c.f.startsWith('npc.') || c.f.startsWith('gone.') || (c.f.startsWith('status.') && c.icon === '🔮') || (c.f.startsWith('rel.') && String(c.why).includes('취향 저격'))) out.push(e);
    }
    return out.reverse().slice(0, max);
}
// 📖 챕터 경계: 날짜가 바뀐 첫 답
export function isNewDay(r, i) {
    const d = dayOfI(r, i); if (d == null) return false;
    for (let k = i - 1; k >= 0; k--) { const p = dayOfI(r, k); if (p != null && (r.changes?.[k] ?? []).some(real)) return p !== d; }
    return false;
}

// ───── ❤️ 리듬 · 회복 맛집 (수치 앱) ─────
// 욕구마다: 경계를 넘던 시간대(가장 잦은 것) · 제일 많이 회복한 곳
export function needRhythm(r) {
    const T = thread(r), low = new Map(), up = new Map();
    for (const e of T.ev) {
        const c = e.c, at = r.at?.[e.i]; if (!at) continue;
        if (c.f.startsWith('stage.need.') && c.kind === 'bad') { const k = c.f.slice(11), h = Math.floor(((at.t % DAY) + DAY) % DAY / 60); const m = low.get(k) ?? new Map(); const p = h < 5 ? '심야' : h < 7 ? '새벽' : h < 11 ? '아침' : h < 17 ? '낮' : h < 21 ? '저녁' : '밤'; m.set(p, (m.get(p) ?? 0) + 1); low.set(k, m); }
        if (c.f.startsWith('need.') && typeof c.to === 'number' && c.to > c.from && at.loc) { const k = c.f.slice(5), m = up.get(k) ?? new Map(); m.set(at.loc, (m.get(at.loc) ?? 0) + (c.to - c.from)); up.set(k, m); }
    }
    const top = (m, min = 1) => { const b = [...(m?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0]; return b && b[1] >= min ? b : null; };
    const out = new Map();
    for (const k of new Set([...low.keys(), ...up.keys()])) out.set(k, { low: top(low.get(k), 2), spot: top(up.get(k)) });
    return out;
}
// ───── 💞 관계 날씨 · 마지막으로 본 날 ─────
export function relWeather(r, name) {
    let sum = 0, n = 0; const ev = thread(r).ev;
    for (let k = ev.length - 1; k >= 0 && n < 5; k--) { const c = ev[k].c; if (c.f === `rel.${name}.aff` || c.f === `rel.${name}.trust`) { sum += c.to - c.from; n++; } }
    return n < 2 ? null : sum >= 3 ? ['☀️', '좋아지는 중'] : sum <= -3 ? ['🌧', '식는 중'] : ['☁️', '그대로'];
}
export function lastSeen(r, name) {
    for (let i = (r.at?.length ?? 0) - 1; i >= 0; i--) if (r.at[i]?.with.includes(name)) return Math.floor((r.S?.t ?? 0) / DAY) - Math.floor(r.at[i].t / DAY);
    return null;
}
// ───── 🗺️ 장소 기분 · 오늘 동선 ─────
export function placeMood(r) {
    const T = thread(r), m = new Map();
    for (const e of T.ev) {
        const c = e.c, loc = r.at?.[e.i]?.loc; if (!loc) continue;
        let s = 0;
        if (/^rel\..+\.(aff|trust)$/.test(c.f) && typeof c.to === 'number') s = Math.sign(c.to - c.from);
        else if (c.cross || c.f.startsWith('status.')) s = c.kind === 'good' ? 1 : c.kind === 'bad' ? -1 : 0;
        if (s) m.set(loc, (m.get(loc) ?? 0) + s);
    }
    return m;
}
export function todayRoute(r) {
    const day = Math.floor((r.S?.t ?? 0) / DAY), out = [];
    for (let i = 0; i < (r.at?.length ?? 0); i++) { const at = r.at[i]; if (!at?.loc || Math.floor(at.t / DAY) !== day) continue; if (out[out.length - 1] !== at.loc) out.push(at.loc); }
    return out;
}
// ───── 📒 이번 주 하이라이트 ─────
export function weekTop(r, max = 3) {
    const today = Math.floor((r.S?.t ?? 0) / DAY), L = [];
    for (const e of thread(r).ev) if (e.day > today - 7 && !e.c.f.startsWith('stage.need') && !e.c.f.startsWith('need.') && e.c.f !== 'loc' && e.c.f !== 'cash') L.push(e);
    return L.sort((a, b) => RANK(a.c) - RANK(b.c) || b.i - a.i).slice(0, max);
}
// ───── 📅 그날 맨 위 사건 이모지 (달력 칸) ─────
export function dayEmoji(r, day) {
    const D = thread(r).days.get(day); if (!D?.ev.length) return '';
    const big = D.ev.filter(e => !e.c.f.startsWith('need.') && !e.c.f.startsWith('stage.need') && e.c.f !== 'loc');
    if (!big.length) return D.spend >= (r.book?.world?.meal ?? 10) * 5 ? '💸' : '';
    return dayTop({ ev: big }, 1)[0]?.c.icon ?? '';
}
