// 엔진: 채팅 메시지들 → 상태. 계산은 코드가, AI는 사건만.
// 원본은 메시지(extra.meatlite.sw)에 있고, 여기서는 매번 처음부터 접어 만든다(바뀐 곳부터만 다시).
import { clamp, num, arr, norm, short, safeKey, parseDelta, spanOf, clockOf, dayOfDate, DAY, hash, slotName } from '../base/util.js';
import { slot, getMeta, ctx } from '../base/st.js';
import { readOps, kindOf, parts } from './tags.js';
import { match } from './names.js';
import { NEED_STAGES, NEED_SYMPTOM, personOf, placeOf } from './book.js';

// ───── 처음 상태 (설정집에서) ─────
export function initState(book) {
    const w = book.world;
    const S = {
        t: w.start.clock, loc: '', with: [], weather: w.weather[0] ?? '',
        needs: Object.fromEntries(book.me.needs.map(n => [n.key, n.start])),
        cash: 0, items: [], status: [], promises: [], news: [], rel: {},
        mind: {}, watch: {}, cell: {}, bgm: '', custom: {}, turn: 0, rolls: [],
    };
    for (const p of book.people) S.rel[p.name] = relOf(p);
    return S;
}
const relOf = (p) => ({ aff: p?.start?.aff ?? 10, trust: p?.start?.trust ?? 10, mem: [], gone: null, jealous: '', life: '', want: p?.want ?? '', seen: { likes: [], hates: [] }, last: [], extra: !p });

// 단계 (욕구 · 관계)
export function needStage(v) { for (const s of NEED_STAGES) if (v >= s.at) return s.name; return '위험'; }
export function relStage(book, v) { let st = book.stages[0]; for (const s of book.stages) if (v >= s.at) st = s; return st; }
export function nextStage(book, v) { return book.stages.find(s => s.at > v) ?? null; }

// ───── 하루의 작은 세계 사건 (AI 0회 · 날짜로 정해짐 · 가끔) ─────
const WORLD_EV = [
    { name: '장날', kind: 'good', price: 0.9, text: '시장에 장이 섰다 — 물건값 10% 내림' },
    { name: '축제', kind: 'neutral', price: 1.2, text: '축제 — 광장이 붐비고 물건값이 오름' },
    { name: '공사', kind: 'bad', price: 1, text: '길 공사 — 돌아가야 해서 이동이 늦음' },
];
export function worldEvent(day) { const h = parseInt(hash(`w${day}`), 36); return h % 9 === 0 ? WORLD_EV[h % WORLD_EV.length] : null; }
export const priceMul = (S) => worldEvent(Math.floor(S.t / DAY))?.price ?? 1;

// ───── 한 메시지 적용 ─────
// ch: 이 메시지에서 바뀐 것 [{ f, label, from, to, why, src, sure, i(줄 번호) }]
function makeCtx(book, S, ch, flags) {
    const people = () => [...book.people.map(p => ({ name: p.name, aka: p.aka })), ...Object.keys(S.rel).filter(n => !personOf(book, n)).map(name => ({ name }))];
    const who = (raw) => match(raw, people())?.name ?? null;
    const need = (raw) => { const n = norm(raw); return book.me.needs.find(x => norm(x.key) === n || norm(x.name) === n) ?? null; };
    const setNeed = (key, d, why, src, sure, i) => {
        const nd = book.me.needs.find(x => x.key === key); if (!nd) return;
        const from = S.needs[key] ?? 0, to = clamp(Math.round(from + d), 0, 100);
        if (to === from) return;
        S.needs[key] = to; ch.push({ f: `need.${key}`, label: nd.name, icon: nd.icon, from, to, why, src, sure, i });
    };
    const setCash = (d, why, src, sure, i) => { const from = S.cash, to = Math.round((from + d) * 100) / 100; S.cash = to; ch.push({ f: 'cash', label: book.world.currency, icon: '💰', from, to, why, src, sure, i }); };
    const findItem = (raw) => { const n = norm(raw); const hit = S.items.find(x => norm(x.name) === n); if (hit) return hit; const mm = match(raw, S.items); return mm ? S.items.find(x => x.name === mm.name) ?? null : null; };
    const addItem = (name, n, why, src, i, fx) => {
        name = safeKey(name); if (!name) return;
        const it = findItem(name) ?? (S.items.push({ name, n: 0, worn: false, fx: fx ?? {} }), S.items[S.items.length - 1]);
        it.n += n; if (fx && !Object.keys(it.fx).length) it.fx = fx;
        ch.push({ f: 'item', label: it.name, icon: '👜', from: it.n - n, to: it.n, why, src, sure: true, i });
        if (it.n <= 0) S.items.splice(S.items.indexOf(it), 1);
    };
    const rel = (name) => (S.rel[name] ??= relOf(personOf(book, name)));
    const setRel = (name, axis, d, why, src, sure, i) => {
        const p = personOf(book, name), r = rel(name);
        if (axis === 'aff' && p?.noLove) axis = 'trust'; // 💔 애정 꺼 두기 — 우정으로만
        // 💗 로맨스 보정: 같은 행동을 연달아 하면 반만 · 한 답에 ±8까지 · 단계 하나를 건너뛰지 못함
        if (src !== 'hand' && src !== 'meddle') {
            const key = norm(why);
            if (key && r.last.includes(key)) d = Math.sign(d) * Math.ceil(Math.abs(d) / 2);
            r.last = [key, ...r.last].filter(Boolean).slice(0, 3);
            const done = ch.filter(c => c.f === `rel.${name}.${axis}` && c.src !== 'hand').reduce((a, c) => a + c.to - c.from, 0);
            d = clamp(d, -8 - done, 8 - done);
            if (axis === 'aff' && d > 0) { const nx = nextStage(book, r.aff); const nx2 = nx && nextStage(book, nx.at); if (nx2 && r.aff + d >= nx2.at) d = nx2.at - 1 - r.aff; }
        }
        const from = r[axis], to = clamp(Math.round(from + d), 0, 100);
        if (to === from) return;
        r[axis] = to;
        ch.push({ f: `rel.${name}.${axis}`, label: `${name} ${axis === 'aff' ? '애정' : '우정'}`, icon: axis === 'aff' ? '💗' : '🤝', from, to, why, src, sure, i, who: name });
        const a = relStage(book, from), b = relStage(book, to);
        if (axis === 'aff' && a.name !== b.name) ch.push({ f: `stage.${name}`, label: `${name} 단계`, icon: '💞', from: a.name, to: b.name, why: to > from ? '단계가 올랐어요' : '단계가 내려갔어요', src: 'auto', sure: true, i, cross: true, who: name });
    };
    const pass = (min, why, i, opt = {}) => {
        if (!(min > 0)) return;
        min = Math.min(min, DAY * 30);
        const from = S.t; S.t += min;
        ch.push({ f: 'time', label: '시간', icon: '🕰️', from, to: S.t, why, src: 'auto', sure: true, i });
        // 욕구는 턴이 아니라 달력 시간으로 준다 (자는 동안 에너지는 줄지 않음)
        const rain = /비|눈|폭우|rain|snow/i.test(S.weather) && !/home/.test(placeOf(book, S.loc)?.kind ?? '');
        for (const nd of book.me.needs) {
            if (opt.sleep && nd.key === 'energy') continue;
            let rate = nd.rate * (S.status.some(s => s.slow?.includes(nd.key)) ? 1.5 : 1);
            if (rain && (nd.key === 'hygiene' || nd.key === 'mood')) rate *= 1.5; // 🌧 날씨가 수치에 영향
            setNeed(nd.key, -rate * min / 60, opt.sleep ? '자는 동안' : why, 'time', true, i);
        }
        // 기간이 끝난 딱지는 저절로 풀린다
        for (const st of [...S.status]) if (st.until != null && st.until <= S.t) { S.status.splice(S.status.indexOf(st), 1); ch.push({ f: `status.${st.name}`, label: st.name, icon: st.src === 'fate' ? '🔮' : '🏷️', from: '있음', to: '풀림', why: '기간 끝', src: 'auto', sure: true, i, kind: st.kind }); }
    };
    return { people, who, need, setNeed, setCash, findItem, addItem, rel, setRel, pass, flag: (text, i) => flags.push({ text, i }) };
}

const DEF = { meal: 35, snack: 15, sleepPerH: 12, wash: 60, restPerH: 10, workPerH: 6, giftLike: 6, giftHate: -4, gift: 2, up: 3, down: -4 };
const isSnack = (t) => /간식|빵|과자|사탕|snack|cookie|bread|커피|coffee|음료|차\b/i.test(t);

export function applyOp(book, S, x, k, v, i, src, ch) {
    const kind = kindOf(k, book.me.needs.flatMap(n => [n.name, n.key]));
    const [a = '', b = '', c = ''] = parts(v);
    const why = (t) => short(t || v, 24);
    switch (kind) {
        case 'skip': case 'unknown': return;
        case 'ate': {
            const it = a && x.findItem(a);
            if (it && Object.keys(it.fx).length) { for (const [nk, d] of Object.entries(it.fx)) x.setNeed(nk, d, it.name, src, true, i); x.addItem(it.name, -1, '먹음', src, i); }
            else x.setNeed('hunger', isSnack(a) ? DEF.snack : DEF.meal, why(a || '식사'), src, false, i);
            if (/술|맥주|와인|beer|wine|soju|소주/i.test(a)) addStatus(S, { name: '취기', kind: 'neutral', until: S.t + 180, dice: -1 }, ch, i, '술');
            return;
        }
        case 'slept': { const m = spanOf(a) ?? 420; x.pass(m, '잠', i, { sleep: true }); x.setNeed('energy', DEF.sleepPerH * m / 60, why(`${Math.round(m / 60)}시간 잠`), src, !!spanOf(a), i); if (m >= 360) x.setNeed('mood', 5, '푹 잠', src, false, i); return; }
        case 'washed': x.setNeed('hygiene', DEF.wash, why(a || '씻음'), src, false, i); x.pass(20, '씻음', i); return;
        case 'rest': { const m = spanOf(a) ?? 60; x.pass(m, '쉼', i); x.setNeed('energy', DEF.restPerH * m / 60, why(a || '쉼'), src, !!spanOf(a), i); const pl = placeOf(book, S.loc); for (const [nk, d] of Object.entries(pl?.rest ?? {})) x.setNeed(nk, d, `${pl.name}에서 쉼`, src, true, i); return; }
        case 'worked': {
            const m = spanOf(a) ?? 240; x.pass(m, '일', i); x.setNeed('energy', -DEF.workPerH * m / 60, why(a || '일'), src, !!spanOf(a), i);
            const pay = parseDelta(b); if (pay) x.setCash(Math.abs(pay.n), '일한 값', src, true, i); return;
        }
        case 'cash': { const d = parseDelta(a); if (!d) return; if (!d.rel) { x.setCash(d.n - S.cash, why(b || '돈'), src, true, i); return; } if (d.n < 0 && S.cash + d.n < 0) { x.flag(`돈이 모자라요 (${S.cash} < ${-d.n})`, i); return; } x.setCash(d.n, why(b || (d.n < 0 ? '씀' : '받음')), src, true, i); return; }
        case 'earn': { const d = parseDelta(a) ?? parseDelta(b); if (d) x.setCash(Math.abs(d.n), why(a.match(/\D+/)?.[0] || b || '받음'), src, true, i); return; }
        case 'buy': {
            const name = a, place = placeOf(book, S.loc), good = place?.goods.find(g => norm(g.name) === norm(name));
            const given = parseDelta(b);
            const price = given ? Math.abs(given.n) : good ? Math.round(good.price * priceMul(S)) : null;
            const sure = !!(given || good);
            const cost = price ?? Math.round(book.world.meal * (isSnack(name) ? 0.4 : 1));
            if (S.cash < cost) { x.flag(`돈 부족: ${name} ${cost} (가진 돈 ${S.cash})`, i); return; }
            x.setCash(-cost, `${short(name, 12)} 삼`, src, sure, i);
            if (good && place.kind === 'food') { for (const [nk, d] of Object.entries(good.fx)) x.setNeed(nk, d, good.name, src, true, i); if (!Object.keys(good.fx).length) x.setNeed('hunger', DEF.meal, good.name, src, false, i); }
            else x.addItem(name, Math.max(1, num(c, 1)), '삼', src, i, good?.fx);
            return;
        }
        case 'sell': { const it = x.findItem(a); if (!it) { x.flag(`없는 물건을 팔았어요: ${a}`, i); return; } const p = parseDelta(b); x.addItem(it.name, -1, '팖', src, i); if (p) x.setCash(Math.abs(p.n), `${it.name} 팖`, src, true, i); return; }
        case 'item': { const d = /^[-−]/.test(a) ? -1 : 1; const name = a.replace(/^[+\-−]\s*/, ''); if (d < 0 && !x.findItem(name)) { x.flag(`없는 물건: ${name}`, i); return; } x.addItem(d < 0 ? x.findItem(name).name : name, d * Math.max(1, num(b, 1)), d < 0 ? '잃음' : '얻음', src, i); return; }
        case 'got': x.addItem(a, Math.max(1, num(b, 1)), '얻음', src, i); return;
        case 'used': { const it = x.findItem(a); if (!it) { x.flag(`없는 물건을 썼어요: ${a}`, i); return; } for (const [nk, d] of Object.entries(it.fx)) x.setNeed(nk, d, it.name, src, true, i); x.addItem(it.name, -1, '씀', src, i); return; }
        case 'lost': { const it = x.findItem(a); if (it) x.addItem(it.name, -it.n, '잃음', src, i); return; }
        case 'wear': case 'unwear': { let it = x.findItem(a); if (!it && kind === 'wear') { x.addItem(a, 1, '얻음', src, i); it = x.findItem(a); } if (it && it.worn !== (kind === 'wear')) { it.worn = kind === 'wear'; ch.push({ f: 'item', label: it.name, icon: '👕', from: it.worn ? '벗음' : '착용', to: it.worn ? '착용 중' : '벗음', why: '옷차림', src, sure: true, i }); } return; }
        case 'gift': {
            const name = x.who(a) ?? safeKey(a); if (!name) return;
            const it = b && x.findItem(b);
            if (it) x.addItem(it.name, -1, `${name}에게 선물`, src, i);
            const p = personOf(book, name), r = x.rel(name), g = norm(b);
            const like = p?.likes.find(l => g.includes(norm(l)) || norm(l).includes(g)), hate = p?.hates.find(l => g.includes(norm(l)) || norm(l).includes(g));
            if (like && !r.seen.likes.includes(like)) r.seen.likes.push(like);
            if (hate && !r.seen.hates.includes(hate)) r.seen.hates.push(hate);
            x.setRel(name, 'aff', like ? DEF.giftLike : hate ? DEF.giftHate : DEF.gift, `🎁 ${short(b, 10)}${like ? ' · 취향 저격' : hate ? ' · 싫어함' : ''}`, src, !!(like || hate), i);
            return;
        }
        case 'loc': {
            const pl = match(a, book.world.places.map(p => ({ name: p.name })));
            const to = pl?.name ?? safeKey(a); if (!to || to === S.loc) return;
            ch.push({ f: 'loc', label: '장소', icon: '📍', from: S.loc, to, why: '이동', src, sure: !!pl, i }); S.loc = to;
            return;
        }
        case 'with': { S.with = String(v).split(/[,、·/|]/).map(n => x.who(n) ?? safeKey(n)).filter(Boolean).slice(0, 8); return; }
        case 'time': {
            const sp = /^\+/.test(a) ? spanOf(a) : null;
            if (sp) { x.pass(sp, why(b || '시간 흐름'), i); return; }
            const cl = clockOf(a); if (cl == null) return;
            const cur = ((S.t % DAY) + DAY) % DAY; let d = cl - cur; if (d < 0) d += DAY;
            if (d > 0 && d < DAY) x.pass(d, `${slotName(cl)}이 됨`, i);
            return;
        }
        case 'pass': { const m = spanOf(a); if (m) x.pass(m, why(b || '시간 흐름'), i); return; }
        case 'date': { const at = dayOfDate(book.world.start, a, S.t); if (at != null && at > S.t) x.pass(at - Math.floor(S.t / DAY) * DAY - (S.t % DAY) + (S.t % DAY), '날짜 이동', i); return; }
        case 'weather': { if (a && a !== S.weather) { ch.push({ f: 'weather', label: '날씨', icon: '🌦️', from: S.weather, to: a, why: '날씨', src, sure: true, i }); S.weather = short(a, 12); } return; }
        case 'aff': case 'trust': {
            // 「Leon +3」 「Leon | +3 | 이유」
            const m = /^(.*?)\s*([+\-−]\s*\d+)\s*$/.exec(a); const nm = m ? m[1] : a, dd = parseDelta(m ? m[2] : b);
            const name = x.who(nm) ?? safeKey(nm); if (!name || !dd) return;
            x.setRel(name, kind, dd.n, why(m ? b : c) || '변화', src, true, i); return;
        }
        case 'act': {
            const name = x.who(a); if (!name) return;
            const p = personOf(book, name), t = norm(b);
            const up = p?.up.find(u => t.includes(norm(u.act)) || norm(u.act).includes(t)), down = p?.down.find(u => t.includes(norm(u.act)) || norm(u.act).includes(t));
            if (up) x.setRel(name, 'aff', up.d ?? DEF.up, up.act, src, up.d != null, i);
            else if (down) x.setRel(name, 'aff', down.d ?? DEF.down, down.act, src, down.d != null, i);
            if (/(고백|키스|첫|약속|싸움|배신|구해|울)/.test(b)) memo(S, x.rel(name), b);
            return;
        }
        case 'need': {
            // 「허기: -10」 또는 옛 「stat: 체력 -3」
            const m = /^(.*?)\s*([+\-−]?\s*\d+)\s*(?:\|\s*(.*))?$/.exec(v);
            const nd = x.need(k) ?? (m && x.need(m[1])); if (!nd) return;
            const dd = parseDelta(x.need(k) ? a : m?.[2]); if (!dd) return;
            x.setNeed(nd.key, dd.rel ? dd.n : dd.n - S.needs[nd.key], why(x.need(k) ? b : m?.[3]) || '변화', src, true, i); return;
        }
        case 'status': case 'fate': {
            if (/^[-−]/.test(a)) { const n = a.replace(/^[-−]\s*/, ''); const st = S.status.find(s => norm(s.name) === norm(n)); if (st) { S.status.splice(S.status.indexOf(st), 1); ch.push({ f: `status.${st.name}`, label: st.name, icon: '🏷️', from: '있음', to: '풀림', why: why(b || '나음'), src, sure: true, i, kind: st.kind }); } return; }
            const dm = /([+\-−]\s*\d)/.exec(`${a} ${c}`), sp = spanOf(b) ?? (kind === 'fate' ? DAY * 3 : null);
            const name = short(a.replace(/[+\-−]\s*\d+/, '').trim(), 12); if (!name) return;
            const bad = /저주|감기|숙취|부상|피로|병|curse|sick|hurt|불운|탈진|우울/i.test(a) || (dm && /[-−]/.test(dm[1]));
            addStatus(S, { name, kind: kind === 'fate' ? (bad ? 'bad' : 'good') : (bad ? 'bad' : /축복|행운|기쁨|bless|lucky/i.test(a) ? 'good' : 'neutral'), until: sp ? S.t + sp : null, dice: dm ? Number(dm[1].replace(/\s/g, '').replace('−', '-')) : (bad ? -1 : 0), src: kind === 'fate' ? 'fate' : src }, ch, i, kind === 'fate' ? '운명' : why(c));
            return;
        }
        case 'roll': S.rolls.push({ t: S.t, what: short(v, 40), i }); return;
        case 'mind': case 'watch': case 'cell': { if (a && b) S[kind][x.who(a) ?? safeKey(a)] = short(parts(v).slice(1).join(' | '), 120); return; }
        case 'jealous': { const name = x.who(a); if (!name) return; const r = x.rel(name); r.jealous = short(b || '질투', 40); memo(S, r, `질투: ${b}`); x.setRel(name, 'trust', -1, '질투', src, false, i); news(S, '💢', `${name} — ${short(b || '질투가 남', 30)}`, 'jealous', name); return; }
        case 'life': { const name = x.who(a) ?? safeKey(a); if (!name || !b) return; x.rel(name).life = short(b, 60); news(S, '🌙', `${name} — ${short(b, 40)}`, 'life', name); return; }
        case 'want': { const name = x.who(a); if (name && b) x.rel(name).want = short(b, 60); return; }
        case 'memory': { const name = x.who(a); if (name && b) memo(S, x.rel(name), b); return; }
        case 'taste': { const name = x.who(a); if (!name) return; const r = x.rel(name); for (const t of parts(v).slice(1)) { const n = t.replace(/^[+\-−]\s*/, ''); if (!n) continue; const L = /^[-−]/.test(t) ? r.seen.hates : r.seen.likes; if (!L.includes(n)) L.push(short(n, 16)); } return; }
        case 'npc': { const name = x.who(a) ?? safeKey(a); if (!name || S.rel[name]) return; S.rel[name] = relOf(null); S.rel[name].line = short(b, 40); S.rel[name].face = short(c, 4); ch.push({ f: `npc.${name}`, label: name, icon: '👤', from: '', to: '새 인물', why: short(b, 20), src, sure: true, i, who: name }); return; }
        case 'gone': { const name = x.who(a); if (!name) return; x.rel(name).gone = short(b || '떠남', 30); ch.push({ f: `gone.${name}`, label: name, icon: '🕊️', from: '', to: '이야기에서 빠짐', why: short(b, 20), src, sure: true, i, who: name }); return; }
        case 'promise': {
            if (/^[-−✓]|완료|지킴|done/.test(b) || /^[-−✓]/.test(a)) { const t = a.replace(/^[-−✓]\s*/, ''); const p = S.promises.find(q => !q.done && (norm(q.text).includes(norm(t)) || norm(t).includes(norm(q.text)))); if (p) p.done = S.t; return; }
            const due = dayOfDate(book.world.start, b, S.t) ?? (spanOf(b) != null ? S.t + spanOf(b) : null);
            S.promises.push({ text: short(a, 50), due, at: S.t, done: null, i }); return;
        }
        case 'anniv': { const name = x.who(a); if (name) x.rel(name).day = short(b, 16); return; }
        case 'bgm': S.bgm = short(v, 60); return;
        case 'custom': { const tab = safeKey(a), f = safeKey(b); if (tab && f) { (S.custom[tab] ??= {})[f] = short(c, 40); } return; }
        case 'meddle': {
            // ✍ 인물이 내 상태창에 손댄다 — 「meddle: Leon | 기분 | +20 | 낙서」 → 그 인물 이름으로 기록 (되돌리기 가능)
            const name = x.who(a) ?? safeKey(a); const nd = x.need(b); const dd = parseDelta(c);
            if (nd && dd) x.setNeed(nd.key, dd.n, `✍ ${name}`, 'meddle', true, i);
            else if (b) news(S, '✍', `${name}이(가) 상태창에 낙서: ${short(parts(v).slice(1).join(' '), 30)}`, 'meddle', name);
            return;
        }
    }
}
function addStatus(S, st, ch, i, why) {
    const old = S.status.find(s => norm(s.name) === norm(st.name));
    if (old) { old.until = st.until; return; }
    S.status.push({ ...st, at: S.t });
    ch.push({ f: `status.${st.name}`, label: st.name, icon: st.src === 'fate' ? '🔮' : '🏷️', from: '', to: st.until ? `${Math.round((st.until - S.t) / 60)}시간` : '붙음', why, src: st.src ?? 'tag', sure: true, i, kind: st.kind });
}
function memo(S, r, text) { r.mem = [{ t: S.t, text: short(text, 50) }, ...r.mem.filter(m => m.text !== short(text, 50))].slice(0, 5); }
function news(S, icon, text, kind, who) { S.news.unshift({ t: S.t, icon, text, kind, who }); S.news.length = Math.min(S.news.length, 40); }

// 위험 단계 → 상태 딱지(주사위 보정)는 계산해서 붙인다 (저장 안 함)
export function derived(book, S) {
    const out = [];
    for (const nd of book.me.needs) {
        const st = needStage(S.needs[nd.key] ?? 0);
        if (st !== '정상') out.push({ key: nd.key, name: nd.name, icon: nd.icon, stage: st, text: nd.sym?.[st] || NEED_SYMPTOM[nd.key]?.[st] || `${nd.name} ${st}`, dice: st === '위험' ? -2 : -1 });
    }
    return out;
}
export const diceMod = (book, S) => derived(book, S).reduce((a, d) => a + (d.stage === '위험' ? d.dice : 0), 0) + S.status.reduce((a, s) => a + num(s.dice), 0);

// ───── 접기 (캐시: 메시지마다 서명이 같으면 다시 계산하지 않음) ─────
let cache = { chatId: null, bookSig: '', sig: [], states: [], changes: [], flags: [], base: null };
const sigOf = (m) => (m.is_user ? `u${m.mes?.length}` : `${m.swipe_id ?? 0}:${m.mes?.length}:${slot(m)?.rev ?? 0}:${m.is_system ? 1 : 0}`);
// 메시지 i의 변화 줄: 태그(답 글) → 저장해 둔 ops → 손으로 고친 것 · 손댄 것
export function opsOf(m) {
    if (!m || m.is_user || m.is_system) return [];
    const sl = slot(m);
    const ops = (sl?.ops ?? readOps(m.mes)).map(([k, v], j) => ({ k, v, src: sl?.fill ? 'fill' : 'tag', j }));
    for (const [j, h] of (sl?.hand ?? []).entries()) ops.push({ k: h.k, v: h.v, src: h.src ?? 'hand', why: h.why, j: 1000 + j });
    const undo = new Set(sl?.undo ?? []);
    return ops.filter(o => !undo.has(o.j));
}
export function fold(force = false) {
    const meta = getMeta(); if (!meta?.book) return null;
    const chat = ctx().chat ?? [], id = ctx().getCurrentChatId?.();
    const bsig = hash(JSON.stringify(meta.book) + JSON.stringify(meta.start ?? {}));
    if (force || cache.chatId !== id || cache.bookSig !== bsig) cache = { chatId: id, bookSig: bsig, sig: [], states: [], changes: [], flags: [], base: null };
    if (!cache.base) cache.base = startState(meta);
    let from = 0;
    while (from < chat.length && from < cache.sig.length && cache.sig[from] === sigOf(chat[from])) from++;
    cache.sig.length = cache.states.length = cache.changes.length = cache.flags.length = from;
    let S = structuredClone(from ? cache.states[from - 1] : cache.base);
    for (let i = from; i < chat.length; i++) {
        const m = chat[i], ch = [], flags = [];
        if (!m.is_user && !m.is_system) {
            S.mind = {}; S.watch = {}; S.cell = {}; S.turn++;
            const x = makeCtx(meta.book, S, ch, flags);
            for (const o of opsOf(m)) { try { applyOp(meta.book, S, x, o.k, o.v, o.j, o.src, ch); } catch (e) { console.warn('[미트볼 라이트] 줄 건너뜀', o, e); } }
        }
        cache.sig[i] = sigOf(m); cache.changes[i] = ch; cache.flags[i] = flags;
        cache.states[i] = structuredClone(S);
    }
    return { S: chat.length ? cache.states[chat.length - 1] : cache.base, states: cache.states, changes: cache.changes, flags: cache.flags, book: meta.book, base: cache.base };
}
export function startState(meta) {
    const S = initState(meta.book);
    const st = meta.start ?? {};
    if (st.cash != null) S.cash = num(st.cash);
    if (Array.isArray(st.items)) S.items = st.items.map(it => ({ name: safeKey(it.name), n: Math.max(1, num(it.n, 1)), worn: !!it.worn, fx: it.fx ?? {} })).filter(it => it.name);
    if (st.loc) S.loc = st.loc;
    if (st.needs) for (const [k, v] of Object.entries(st.needs)) if (k in S.needs) S.needs[k] = clamp(num(v), 0, 100);
    if (st.rel) for (const [k, v] of Object.entries(st.rel)) if (S.rel[k]) Object.assign(S.rel[k], { aff: num(v.aff, S.rel[k].aff), trust: num(v.trust, S.rel[k].trust) });
    return S;
}
export const resetCache = () => { cache.chatId = null; };
export const stateAt = (i) => fold()?.states?.[i] ?? null;

// 지금 이 시간에 인물이 있을 곳: 같이 있음 → 하루 루틴(시간대) → 자주 있는 곳 · 축제 날엔 거리 · 광장으로
export function whereNow(book, S, p) {
    const r = S.rel[p.name];
    if (r?.gone) return null;
    if (S.with.includes(p.name)) return { place: S.loc, why: '함께 있음' };
    const sl = slotName(S.t), rt = p.routine.find(q => sl.includes(String(q.at).slice(0, 1)) || String(q.at).includes(sl));
    const ev = worldEvent(Math.floor(S.t / DAY));
    if (ev?.name === '축제') { const st = book.world.places.find(q => q.kind === 'street'); if (st && !rt) return { place: st.name, why: '축제 구경' }; }
    if (rt) return { place: rt.place, why: `${rt.at} 루틴` };
    if (p.haunt[0]) return { place: p.haunt[0], why: '자주 있는 곳' };
    return null;
}
