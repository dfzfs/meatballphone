// 엔진: 채팅 메시지들 → 상태. 계산은 코드가, AI는 사건만.
// 원본은 메시지(extra.meatlite.sw)에 있고, 여기서는 매번 처음부터 접어 만든다(바뀐 곳부터만 다시).
import { clamp, num, arr, norm, short, safeKey, parseDelta, spanOf, clockOf, dayOfDate, DAY, hash, slotName } from '../base/util.js';
import { slot, getMeta, ctx, metaRev } from '../base/st.js';
import { readOps, kindOf, parts, stripTags } from './tags.js';
import { match } from './names.js';
import { NEED_STAGES, NEED_SYMPTOM, personOf, placeOf } from './book.js';
import { glossList } from '../base/gloss.js';
import { traitOf, traitCompat, signOf, signCompat, aspireOf, aspireSteps } from '../../data/traits.js';
// 🧬 내 특성 효과 모으기
export const myTraits = (book) => (book.me.traitIds ?? []).map(traitOf).filter(Boolean);
const tmul = (T, k, sub) => T.reduce((a, t) => a * (sub ? (t[k]?.[sub] ?? 1) : (t[k] ?? 1)), 1);
// 💞 관계 배수: 내 특성 × 특성 궁합 × 별자리 궁합 (오를 때) — 내릴 땐 나쁜 궁합이 더 깎는다
export function relMul(book, name, axis, up) {
    const T = myTraits(book), p = personOf(book, name);
    const tc = traitCompat(book.me.traitIds, p?.traits ?? []), sc = signCompat(signOf(book.me.day), signOf(p?.day));
    const compat = clamp(1 + tc.score * 0.1, 0.7, 1.3) * sc.mul;
    if (up) return tmul(T, axis) * compat;
    return (axis === 'aff' ? tmul(T, 'affDown') : tmul(T, 'trustDown')) * clamp(2 - compat, 0.7, 1.4);
}
export function matchOf(book, name) {
    const p = personOf(book, name), tc = traitCompat(book.me.traitIds, p?.traits ?? []), me = signOf(book.me.day), they = signOf(p?.day), sc = signCompat(me, they);
    return { sign: they, sc, tc, mul: Math.round(clamp(1 + tc.score * 0.1, 0.7, 1.3) * sc.mul * 100) / 100 };
}

// ───── 처음 상태 (설정집에서) ─────
export function initState(book) {
    const w = book.world;
    const S = {
        t: w.start.clock, loc: '', with: [], weather: w.weather[0] ?? '',
        needs: Object.fromEntries(book.me.needs.map(n => [n.key, n.start])),
        gauges: Object.fromEntries(book.me.gauges.map(g => [g.key, g.start])), attrs: Object.fromEntries(book.me.attrs.map(a => [a.name, a.v])),
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
    const T = myTraits(book);
    const G = glossList();
    const people = () => [...book.people.map(p => ({ name: p.name, aka: [...p.aka, ...G.filter(g => g.to === p.name).map(g => g.from)] })), ...Object.keys(S.rel).filter(n => !personOf(book, n)).map(name => ({ name }))];
    const who = (raw) => match(raw, people())?.name ?? null;
    const need = (raw) => { const n = norm(raw); return book.me.needs.find(x => norm(x.key) === n || norm(x.name) === n) ?? null; };
    const setNeed = (key, d, why, src, sure, i) => {
        const nd = book.me.needs.find(x => x.key === key); if (!nd) return;
        const from = S.needs[key] ?? 0, to = clamp(Math.round(from + d), 0, 100);
        if (to === from) return;
        S.needs[key] = to; ch.push({ f: `need.${key}`, label: nd.name, icon: nd.icon, from, to, why, src, sure, i });
        const was = needStage(from), now = needStage(to);
        if (was !== now) ch.push({ f: `stage.need.${key}`, label: `${nd.name} ${now}`, icon: nd.icon, from: was, to: now, why: now === '정상' ? '회복' : '경계를 넘음', src: 'auto', sure: true, i, cross: true, kind: now === '정상' ? 'good' : 'bad', need: key });
        // 위험이 되면 딱지가 붙고 (기간이 있으면 저절로 풀림), 정상으로 돌아오면 「…짐」 딱지는 바로 풀린다
        const AUTO = { hunger: ['허기짐', null, -1], energy: ['탈진', 720, -1], hygiene: [/비|눈|rain|snow/i.test(S.weather) ? '감기' : '찝찝함', /비|눈|rain|snow/i.test(S.weather) ? DAY * 3 : null, -1], mood: ['우울', DAY, -1] };
        const A = AUTO[key];
        if (A && now === '위험' && was !== '위험' && !S.status.some(s2 => s2.name === A[0])) { S.status.push({ name: A[0], kind: 'bad', until: A[1] ? S.t + A[1] : null, dice: A[2], src: 'auto', at: S.t, need: key }); ch.push({ f: `status.${A[0]}`, label: A[0], icon: '🏷️', from: '', to: A[1] ? `${Math.round(A[1] / 60)}시간` : '나을 때까지', why: `${nd.name} 위험`, src: 'auto', sure: true, i, kind: 'bad' }); }
        if (now === '정상') for (const st of [...S.status]) if (st.need === key && st.until == null) { S.status.splice(S.status.indexOf(st), 1); ch.push({ f: `status.${st.name}`, label: st.name, icon: '🏷️', from: '있음', to: '풀림', why: `${nd.name} 회복`, src: 'auto', sure: true, i, kind: 'good' }); }
    };
    const gauge = (raw) => { const n = norm(raw); return book.me.gauges.find(x => norm(x.key) === n || norm(x.name) === n) ?? null; };
    const setGauge = (key, d, why, src, sure, i) => {
        const g = book.me.gauges.find(x => x.key === key); if (!g) return;
        const from = S.gauges[key] ?? g.start, to = clamp(Math.round(from + d), 0, g.max); if (to === from) return;
        S.gauges[key] = to; ch.push({ f: `gauge.${key}`, label: g.name, icon: '❤️', from, to, why, src, sure, i, kind: to < from ? 'bad' : 'good' });
        if (to === 0 && from > 0) ch.push({ f: `gauge.${key}.zero`, label: g.name, icon: '⚠️', from: '', to: '0', why: g.desc || '바닥남', src: 'auto', sure: true, i, cross: true, kind: 'bad' });
    };
    const setCash = (d, why, src, sure, i) => { const from = S.cash, to = Math.round((from + d) * 100) / 100; S.cash = to; ch.push({ f: 'cash', label: book.world.currency, icon: '💰', from, to, why, src, sure, i }); };
    const findItem = (raw) => { const n = norm(raw); const hit = S.items.find(x => norm(x.name) === n); if (hit) return hit; const mm = match(raw, S.items); return mm ? S.items.find(x => x.name === mm.name) ?? null : null; };
    const addItem = (name, n, why, src, i, fx) => {
        name = safeKey(name); if (!name) return;
        const it = findItem(name) ?? (S.items.push({ name, n: 0, worn: false, fx: fx ?? {} }), S.items[S.items.length - 1]);
        it.n += n; if (fx && !Object.keys(it.fx).length) it.fx = fx; if (!Object.keys(it.fx).length && book.world.itemFx?.[it.name]) it.fx = { ...book.world.itemFx[it.name] };
        ch.push({ f: 'item', label: it.name, icon: '👜', from: it.n - n, to: it.n, why, src, sure: true, i });
        if (it.n <= 0) S.items.splice(S.items.indexOf(it), 1);
    };
    const rel = (name) => (S.rel[name] ??= relOf(personOf(book, name)));
    const setRel = (name, axis, d, why, src, sure, i) => {
        const p = personOf(book, name), r = rel(name);
        if (axis === 'aff' && p?.noLove) axis = 'trust'; // 💔 애정 꺼 두기 — 우정으로만
        // 💗 로맨스 보정: 같은 행동을 연달아 하면 반만 · 한 답에 ±8까지 · 단계 하나를 건너뛰지 못함
        if (src !== 'hand' && src !== 'meddle' && src !== 'ai') {
            const shy = T.some(t => t.shy) ? (relStage(book, r.aff).at < 40 ? 0.8 : 1.2) : 1;
            d = d > 0 ? d * relMul(book, name, axis, true) * (axis === 'aff' ? shy : 1) : d * relMul(book, name, axis, false);
            d = Math.sign(d) * Math.max(1, Math.round(Math.abs(d)));
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
            let rate = nd.rate * (S.status.some(s => s.slow?.includes(nd.key)) ? 1.5 : 1) * tmul(T, 'rate', nd.key);
            if (nd.key === 'mood') {
                if (T.some(t => t.neat) && (S.needs.hygiene ?? 100) < 40) rate *= 1.5;
                const crowd = T.reduce((a, t) => a + (t.crowd ?? 0), 0); if (crowd) rate *= (S.with.length ? crowd > 0 : crowd < 0) ? 0.7 : 1.3;
                if (S.bgm) rate *= tmul(T, 'bgmMood');
                if (T.some(t => t.wx && new RegExp(t.wx).test(S.weather))) rate *= 0.6;
                if (T.some(t => t.wxBad && new RegExp(t.wxBad).test(S.weather))) rate *= 1.4;
            }
            if (rain && (nd.key === 'hygiene' || nd.key === 'mood')) rate *= 1.5; // 🌧 날씨가 수치에 영향
            setNeed(nd.key, -rate * min / 60, opt.sleep ? '자는 동안' : why, 'time', true, i);
        }
        // 기간이 끝난 딱지는 저절로 풀린다
        for (const st of [...S.status]) if (st.until != null && st.until <= S.t) { S.status.splice(S.status.indexOf(st), 1); ch.push({ f: `status.${st.name}`, label: st.name, icon: st.src === 'fate' ? '🔮' : '🏷️', from: '있음', to: '풀림', why: '기간 끝', src: 'auto', sure: true, i, kind: st.kind }); }
    };
    return { T, people, who, need, setNeed, gauge, setGauge, setCash, findItem, addItem, rel, setRel, pass, flag: (text, i) => flags.push({ text, i }) };
}

const DEF = { meal: 35, snack: 15, sleepPerH: 12, wash: 60, restPerH: 10, workPerH: 6, giftLike: 6, giftHate: -4, gift: 2, up: 3, down: -4 };
const isSnack = (t) => /간식|빵|과자|사탕|snack|cookie|bread|커피|coffee|음료|차\b/i.test(t);

export function applyOp(book, S, x, k, v, i, src, ch) {
    const kind = kindOf(k, [...book.me.needs.flatMap(n => [n.name, n.key]), ...book.me.gauges.flatMap(g => [g.name, g.key])]);
    if (kind === 'skip' && /^(attr|능력치|능력)$/i.test(String(k).trim())) { const m = /^(.*?)\s*([+\-−]\s*\d+)/.exec(v); if (m && S.attrs[m[1].trim()] != null) { const d = parseDelta(m[2]).n, from = S.attrs[m[1].trim()]; S.attrs[m[1].trim()] = clamp(from + d, -5, 10); ch.push({ f: `attr.${m[1].trim()}`, label: m[1].trim(), icon: '💪', from, to: from + d, why: short(parts(v)[1] || '성장', 20), src, sure: true, i }); } return; }
    const [a = '', b = '', c = ''] = parts(v);
    const why = (t) => short(t || v, 24);
    switch (kind) {
        case 'skip': case 'unknown': return;
        case 'ate': {
            const it = a && x.findItem(a);
            const fm = tmul(x.T, 'food'), fmood = x.T.reduce((q, t) => q + (t.foodMood ?? 0), 0);
            if (it && Object.keys(it.fx).length) { for (const [nk, d] of Object.entries(it.fx)) x.setNeed(nk, nk === 'hunger' ? d * fm : d, it.name, src, true, i); x.addItem(it.name, -1, '먹음', src, i); }
            else x.setNeed('hunger', (isSnack(a) ? DEF.snack : DEF.meal) * fm, why(a || '식사'), src, false, i);
            if (fmood) x.setNeed('mood', fmood, '🧬 맛있다', 'auto', true, i);
            if (a) { S.tasted ??= []; const k = short(a, 16); if (!S.tasted.includes(k)) S.tasted.push(k); }
            if (/술|맥주|와인|beer|wine|soju|소주/i.test(a)) addStatus(S, { name: '취기', kind: 'neutral', until: S.t + 180, dice: -1 }, ch, i, '술');
            return;
        }
        case 'slept': { const m = spanOf(a) ?? 420; x.pass(m, '잠', i, { sleep: true }); x.setNeed('energy', DEF.sleepPerH * m / 60 * tmul(x.T, 'sleep'), why(`${Math.round(m / 60)}시간 잠`), src, !!spanOf(a), i); if (m >= 360) x.setNeed('mood', 5, '푹 잠', src, false, i); return; }
        case 'washed': x.setNeed('hygiene', DEF.wash, why(a || '씻음'), src, false, i); x.pass(20, '씻음', i); return;
        case 'rest': { const m = spanOf(a) ?? 60; x.pass(m, '쉼', i); x.setNeed('energy', DEF.restPerH * m / 60 * tmul(x.T, 'rest') * (placeOf(book, S.loc)?.kind === 'home' ? tmul(x.T, 'homeRest') : 1), why(a || '쉼'), src, !!spanOf(a), i); const pl = placeOf(book, S.loc); for (const [nk, d] of Object.entries(pl?.rest ?? {})) x.setNeed(nk, d, `${pl.name}에서 쉼`, src, true, i); return; }
        case 'worked': {
            const m = spanOf(a) ?? 240; x.pass(m, '일', i); x.setNeed('energy', -DEF.workPerH * m / 60 * tmul(x.T, 'workCost'), why(a || '일'), src, !!spanOf(a), i);
            const pay = parseDelta(b); if (pay) x.setCash(Math.round(Math.abs(pay.n) * tmul(x.T, 'workPay')), '일한 값', src, true, i); return;
        }
        case 'cash': { const d = parseDelta(a); if (!d) return; if (!d.rel) { x.setCash(d.n - S.cash, why(b || '돈'), src, true, i); return; } if (d.n < 0 && S.cash + d.n < 0) { x.flag(`돈이 모자라요 (${S.cash} < ${-d.n})`, i); return; } x.setCash(d.n, why(b || (d.n < 0 ? '씀' : '받음')), src, true, i); return; }
        case 'earn': { const d = parseDelta(a) ?? parseDelta(b); if (d) x.setCash(Math.abs(d.n), why(a.match(/\D+/)?.[0] || b || '받음'), src, true, i); return; }
        case 'buy': {
            const name = a, place = placeOf(book, S.loc), good = place?.goods.find(g => norm(g.name) === norm(name));
            const given = parseDelta(b);
            const price = given ? Math.abs(given.n) : good ? Math.round(good.price * priceMul(S) * tmul(x.T, 'price')) : null;
            const sure = !!(given || good);
            const cost = price ?? Math.round(book.world.meal * (isSnack(name) ? 0.4 : 1));
            if (S.cash < cost) { x.flag(`돈 부족: ${name} ${cost} (가진 돈 ${S.cash})`, i); return; }
            x.setCash(-cost, `${short(name, 12)} 삼`, src, sure, i);
            ch.push({ f: 'receipt', label: '영수증', icon: '🧾', from: '', to: `${short(name, 12)} ${cost}${book.world.currency}`, why: `남은 돈 ${S.cash}${place ? ` · ${place.name}` : ''}`, src: 'auto', sure, i });
            { const bm = x.T.reduce((q, t) => q + (t.buyMood ?? 0), 0); if (bm) x.setNeed('mood', bm, '🧬 쇼핑', 'auto', true, i); }
            if (good && place.kind === 'food') { S.tasted ??= []; if (!S.tasted.includes(good.name)) S.tasted.push(good.name); }
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
            S.visited ??= []; if (!S.visited.includes(to)) S.visited.push(to);
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
            const gg = x.gauge(k) ?? (m && x.gauge(m[1]));
            if (gg && !x.need(k)) { const dd = parseDelta(x.gauge(k) ? a : m?.[2]); if (dd) x.setGauge(gg.key, dd.rel ? dd.n : dd.n - (S.gauges[gg.key] ?? 0), why(x.gauge(k) ? b : m?.[3]) || '변화', src, true, i); return; }
            const nd = x.need(k) ?? (m && x.need(m[1])); if (!nd) return;
            const dd = parseDelta(x.need(k) ? a : m?.[2]); if (!dd) return;
            x.setNeed(nd.key, dd.rel ? dd.n : dd.n - S.needs[nd.key], why(x.need(k) ? b : m?.[3]) || '변화', src, true, i); return;
        }
        case 'status': case 'fate': {
            if (/^[-−]/.test(a)) { const n = a.replace(/^[-−]\s*/, ''); const st = S.status.find(s => norm(s.name) === norm(n)); if (st) { S.status.splice(S.status.indexOf(st), 1); ch.push({ f: `status.${st.name}`, label: st.name, icon: '🏷️', from: '있음', to: '풀림', why: why(b || '나음'), src, sure: true, i, kind: st.kind }); } return; }
            const dm = /([+\-−]\s*\d)/.exec(`${a} ${c}`), sp = spanOf(b) ?? (kind === 'fate' ? DAY * 3 : null);
            const name = short(a.replace(/[+\-−]\s*\d+/, '').trim(), 12); if (!name) return;
            const bad = /저주|감기|숙취|부상|피로|병|curse|sick|hurt|불운|탈진|우울/i.test(a) || (dm && /[-−]/.test(dm[1]));
            addStatus(S, { name, kind: kind === 'fate' ? (bad ? 'bad' : 'good') : (bad ? 'bad' : /축복|행운|기쁨|bless|lucky/i.test(a) ? 'good' : 'neutral'), until: sp ? S.t + sp : null, dice: dm ? Number(dm[1].replace(/\s/g, '').replace('−', '-')) : (bad ? -1 : 0), src: kind === 'fate' ? 'fate' : src }, ch, i, kind === 'fate' ? '운명' : (c ? short(c, 24) : '상태'));
            return;
        }
        case 'roll': S.rolls.push({ t: S.t, what: short(v, 40), i }); return;
        case 'mind': case 'watch': case 'cell': { if (a && b) S[kind][x.who(a) ?? safeKey(a)] = short(parts(v).slice(1).join(' | '), 120); return; }
        case 'jealous': { const name = x.who(a); if (!name) return; const r = x.rel(name); r.jealous = short(b || '질투', 40); memo(S, r, `질투: ${b}`); x.setRel(name, 'trust', x.T.some(t => t.jealousSelf) ? -2 : -1, '질투', src, false, i); news(S, '💢', `${name} — ${short(b || '질투가 남', 30)}`, 'jealous', name); return; }
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
        case 'newsline': if (v) news(S, '📰', short(v, 60), 'world', ''); return;
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
export function diceParts(book, S, attr = '', luck = null) {
    const out = [];
    if (attr && S.attrs[attr]) out.push({ why: `${attr}`, n: S.attrs[attr] });
    for (const t of myTraits(book)) if (attr && t.dice?.[attr]) out.push({ why: `🧬 ${t.name}`, n: t.dice[attr] });
    const outdoor = !/home|bath|school|work|shop|food/.test(placeOf(book, S.loc)?.kind ?? 'street');
    if (outdoor && /비|눈|폭우|폭설|rain|snow/i.test(S.weather) && attr === '민첩') out.push({ why: `🌧 ${S.weather} (밖)`, n: -1 });
    if (myTraits(book).some(t => t.wx && new RegExp(t.wx).test(S.weather))) out.push({ why: `🌤 좋아하는 날씨`, n: 1 });
    if (myTraits(book).some(t => t.wxBad && new RegExp(t.wxBad).test(S.weather))) out.push({ why: `🌫 싫어하는 날씨`, n: -1 });
    if (luck?.rolled) { const n = luck.tier === '대길' ? 2 : luck.tier === '대흉' ? -2 : luck.stars >= 5 ? 1 : luck.stars <= 1 ? -1 : 0; if (n) out.push({ why: `🍀 오늘 운세 ${'★'.repeat(luck.stars)}`, n, fate: true }); }
    for (const d of derived(book, S)) if (d.stage === '위험') out.push({ why: `${d.name} 위험`, n: d.dice });
    for (const st of S.status) if (num(st.dice)) out.push({ why: st.name, n: num(st.dice), fate: st.src === 'fate' });
    for (const it of S.items) if (it.worn && attr && num(it.fx?.[attr])) out.push({ why: `${it.name} 착용`, n: num(it.fx[attr]) });
    return out;
}
export const diceMod = (book, S) => derived(book, S).reduce((a, d) => a + (d.stage === '위험' ? d.dice : 0), 0) + S.status.reduce((a, s) => a + num(s.dice), 0);

// ───── 접기 (캐시: 메시지마다 서명이 같으면 다시 계산하지 않음) ─────
let cache = { chatId: null, bookSig: '', sig: [], states: [], changes: [], flags: [], base: null };
const sigOf = (m) => (m.is_user ? `u${m.mes?.length}` : `${m.swipe_id ?? 0}:${m.mes?.length}:${slot(m)?.rev ?? 0}:${m.is_system ? 1 : 0}`);
// 메시지 i의 변화 줄: 태그(답 글) → 저장해 둔 ops → 손으로 고친 것 · 손댄 것
export function opsOf(m, book = null) {
    if (!m || m.is_user || m.is_system) return [];
    const sl = slot(m);
    const ops = (sl?.ops ?? readOps(m.mes)).map(([k, v], j) => ({ k, v, src: sl?.fill ? 'fill' : 'tag', j }));
    if (book && !sl?.skip) ops.push(...sceneOps(m.mes, book, ops));
    for (const [j, h] of (sl?.hand ?? []).entries()) ops.push({ k: h.k, v: h.v, src: h.src ?? 'hand', why: h.why, j: 1000 + j });
    const undo = new Set(sl?.undo ?? []);
    return ops.filter(o => !undo.has(o.j));
}
let quick = { key: '', r: null };
export function fold(force = false) {
    const meta = getMeta(); if (!meta?.book) return null;
    const chat = ctx().chat ?? [], id = ctx().getCurrentChatId?.();
    // 빠른 길: 채팅 · 마지막 메시지 · 스와이프 · 설정집 저장 번호가 그대로면 지난 결과 (선택지 미리 보기처럼 한 화면에 여러 번 부를 때)
    const last = chat[chat.length - 1], qk = `${id}|${chat.length}|${last ? sigOf(last) : ''}|${metaRev}|${meta.book === quick.book ? 1 : 0}`;
    if (!force && quick.r && quick.key === qk) return quick.r;
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
            const W = wantsOf(meta.book, S), P = { tasted: S.tasted?.length ?? 0, visited: S.visited?.length ?? 0, custom: JSON.stringify(S.custom) }; // ⭐ 이 답 전에 원하던 것 · 그때 개수
            for (const o of opsOf(m, meta.book)) { const n0 = ch.length; try { applyOp(meta.book, S, x, o.k, o.v, o.j, o.src, ch); } catch (e) { console.warn('[미트볼 라이트] 줄 건너뜀', o, e); } if (o.why) for (let q = n0; q < ch.length; q++) if (ch[q].src === o.src) ch[q].why = o.why; }
            afterTurn(meta.book, S, x, ch, W, i, P);
            if (!slot(m)?.skip && !slot(m)?.flagOk) drift(meta.book, S, m.mes, ch, flags, i);
        }
        cache.sig[i] = sigOf(m); cache.changes[i] = ch; cache.flags[i] = flags;
        cache.states[i] = structuredClone(S);
    }
    const out = { S: chat.length ? cache.states[chat.length - 1] : cache.base, states: cache.states, changes: cache.changes, flags: cache.flags, book: meta.book, base: cache.base };
    quick = { key: qk, r: out, book: meta.book };
    return out;
}
export function startState(meta) {
    const S = initState(meta.book);
    const st = meta.start ?? {};
    if (st.cash != null) S.cash = num(st.cash);
    if (Array.isArray(st.items)) S.items = st.items.map(it => ({ name: safeKey(it.name), n: Math.max(1, num(it.n, 1)), worn: !!it.worn, fx: it.fx ?? {} })).filter(it => it.name);
    if (st.loc) S.loc = st.loc;
    if (st.needs) for (const [k, v] of Object.entries(st.needs)) if (k in S.needs) S.needs[k] = clamp(num(v), 0, 100);
    if (st.gauges) for (const [k, v] of Object.entries(st.gauges)) if (k in S.gauges) S.gauges[k] = num(v);
    if (st.rel) for (const [k, v] of Object.entries(st.rel)) if (S.rel[k]) Object.assign(S.rel[k], { aff: num(v.aff, S.rel[k].aff), trust: num(v.trust, S.rel[k].trust) });
    return S;
}
export const resetCache = () => { cache.chatId = null; quick.key = ''; };
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

// ⭐ 지금 원하는 것 (특성 · 욕구 · 같이 있는 사람 · 야망에서 · 이야기 속 하루마다 바뀜) — 이루면 기분 +8
const WANT_SAY = { hunger: ['뭔가 먹기', '뭐 좀 먹을까.'], energy: ['좀 쉬기', '잠깐 쉬자.'], hygiene: ['씻기', '씻고 싶다.'], mood: ['기분 전환하기', '바람 좀 쐬자.'] };
const TRAIT_WANT = {
    romantic: ['🌹', '누군가에게 다정한 말 하기', '다정하게 말을 건넨다.', (ch) => ch.some(c => c.f.endsWith('.aff') && c.to > c.from)],
    charming: ['✨', '누군가 웃게 하기', '농담을 건넨다.', (ch) => ch.some(c => c.f.startsWith('rel.') && c.to > c.from)],
    outgoing: ['🎉', '누군가와 함께 있기', '누구 없나 둘러본다.', (ch, S) => S.with.length > 0],
    goofball: ['🤡', '장난치기', '장난을 친다.', (ch) => ch.some(c => c.f.endsWith('.trust') && c.to > c.from)],
    loner: ['🌙', '혼자 쉬기', '혼자 조용히 쉰다.', (ch, S) => !S.with.length && ch.some(c => c.f === 'need.energy' && c.to > c.from)],
    foodie: ['🍰', '새로운 음식 먹어 보기', '안 먹어 본 걸 먹어 보자.', (ch, S, P) => (S.tasted?.length ?? 0) > (P.tasted ?? 0)],
    glutton: ['🍖', '배 터지게 먹기', '배부르게 먹는다.', (ch) => ch.some(c => c.f === 'need.hunger' && c.to - c.from >= 25)],
    shopaholic: ['🛍️', '뭐라도 사기', '구경하다 하나 산다.', (ch) => ch.some(c => c.f === 'cash' && c.to < c.from && c.src !== 'time')],
    outdoor: ['🌿', '밖에 나가기', '밖으로 나간다.', (ch) => ch.some(c => c.f === 'loc')],
    workaholic: ['💼', '일하기', '일을 한다.', (ch) => ch.some(c => /일/.test(c.why ?? '') && c.f === 'need.energy')],
    lazy: ['🦥', '늘어지게 쉬기', '늘어지게 쉰다.', (ch) => ch.some(c => c.f === 'need.energy' && c.to > c.from)],
    neat: ['🧽', '깨끗이 씻기', '깨끗이 씻는다.', (ch) => ch.some(c => c.f === 'need.hygiene' && c.to > c.from)],
    kind: ['🤍', '누군가 도와주기', '도와줄 게 있는지 묻는다.', (ch) => ch.some(c => c.f.endsWith('.trust') && c.to > c.from)],
};
const ASPIRE_WANT = {
    lover: (S, b) => { const n = Object.entries(S.rel).filter(([, r]) => !r.gone).sort((x, y) => y[1].aff - x[1].aff)[0]?.[0]; return n && ['💘', `${n}와(과) 가까워지기`, `${n}에게 다가간다.`, (ch) => ch.some(c => c.f === `rel.${n}.aff` && c.to > c.from)]; },
    rich: () => ['💰', '돈 벌기', '돈 벌 방법을 찾아본다.', (ch) => ch.some(c => c.f === 'cash' && c.to > c.from)],
    popular: () => ['🌟', '누군가와 우정 쌓기', '말을 걸어 본다.', (ch) => ch.some(c => c.f.endsWith('.trust') && c.to > c.from)],
    explorer: () => ['🧭', '새로운 곳 가 보기', '안 가 본 곳으로 가 본다.', (ch, S, P) => (S.visited?.length ?? 0) > (P.visited ?? 0)],
    gourmet: () => ['🍽️', '새 음식 먹어 보기', '안 먹어 본 걸 먹어 보자.', (ch, S, P) => (S.tasted?.length ?? 0) > (P.tasted ?? 0)],
    collector: () => ['🧺', '새 물건 얻기', '쓸 만한 게 있나 찾아본다.', (ch) => ch.some(c => c.f === 'item' && c.from === 0)],
};
export function wantsOf(book, S) {
    const out = [], T = book.me.traitIds ?? [], day = Math.floor(S.t / DAY), done = new Set(S.wantsDone ?? []);
    const low = [...book.me.needs].filter(n => (S.needs[n.key] ?? 100) < 55).sort((a, b) => S.needs[a.key] - S.needs[b.key])[0];
    if (low) { const [t, say] = WANT_SAY[low.key] ?? [`${low.name} 채우기`, '']; out.push({ id: `need-${low.key}`, icon: low.icon, text: t, say, ok: (ch) => ch.some(c => c.f === `need.${low.key}` && c.to > c.from && c.src !== 'time') }); }
    const asp = ASPIRE_WANT[book.me.aspire]?.(S, book); if (asp) out.push({ id: `asp-${book.me.aspire}`, icon: asp[0], text: asp[1], say: asp[2], ok: asp[3] });
    for (const n of S.with) { const r = S.rel[n], it = S.items.find(i => r?.seen.likes.some(l => i.name.includes(l))); if (it) { out.push({ id: `gift-${n}`, icon: '🎁', text: `${n}에게 ${it.name} 주기`, say: `${n}에게 ${it.name}을(를) 건넨다.`, ok: (ch) => ch.some(c => c.f === `rel.${n}.aff` && /🎁/.test(c.why ?? '')) }); break; } }
    const tw = T.map(id => TRAIT_WANT[id] ? [id, TRAIT_WANT[id]] : null).filter(Boolean);
    if (tw.length) { const [id, w] = tw[parseInt(hash(`${day}`), 36) % tw.length]; out.push({ id: `trait-${id}`, icon: w[0], text: w[1], say: w[2], ok: w[3] }); }
    return out.filter(w => !done.has(`${day}|${w.id}`)).slice(0, 3).map(w => ({ ...w, key: `${day}|${w.id}` }));
}
function afterTurn(book, S, x, ch, W, i, P) {
    // 🧩 내 탭: 「높음」 경계를 넘는 순간 → 경계 문구 (본편 힌트) + 다른 칸과 연결 (예: 「기분 -5」)
    const before = JSON.parse(P.custom || '{}');
    for (const t of getMeta()?.custom ?? []) for (const f of t.fields ?? []) {
        if (!f.max) continue; const hi = f.stages?.[1] ?? 70, a = num(before[t.name]?.[f.name], -1), b = num(S.custom[t.name]?.[f.name], -1);
        if (a < hi && b >= hi) {
            ch.push({ f: `custom.${t.name}.${f.name}`, label: `${t.name} · ${f.name} 높음`, icon: t.icon || '🧩', from: a, to: b, why: f.say || '경계를 넘음', src: 'auto', sure: true, i, cross: true, say: f.say });
            const m = /^(.+?)\s*([+\-−]\s*\d+)/.exec(f.link ?? ''); if (m) { const nd = x.need(m[1].trim()); const d = Number(m[2].replace(/\s/g, '').replace('−', '-')); if (nd) x.setNeed(nd.key, d, `🧩 ${f.name} 높음`, 'auto', true, i); }
        }
    }
    for (const w of W) if (w.ok(ch, S, P)) {
        S.wantsDone = [...(S.wantsDone ?? []), w.key].slice(-30);
        ch.push({ f: `want.${w.id}`, label: '원하던 것', icon: '⭐', from: '', to: '이룸', why: w.text, src: 'auto', sure: true, i, kind: 'good' });
        x.setNeed('mood', 8, `⭐ ${w.text}`, 'auto', true, i);
    }
    // 야망 단계
    const a = aspireOf(book.me.aspire); if (!a) return;
    const steps = aspireSteps(a, book), v = a.val(S), k = steps.filter(st => v >= st).length;
    if (k > (S.aspStep ?? 0)) {
        S.aspStep = k;
        ch.push({ f: `aspire.${a.id}`, label: `${a.name} ${k}단계`, icon: a.icon, from: '', to: k >= steps.length ? '달성!' : `${k}/${steps.length}`, why: `${a.unit} ${Math.round(v)}`, src: 'auto', sure: true, i, kind: 'good', cross: true });
        x.setNeed('mood', 10, `${a.icon} ${a.name}`, 'auto', true, i);
        S.status = S.status.filter(s => s.name !== '뿌듯함'); S.status.push({ name: '뿌듯함', kind: 'good', until: S.t + DAY, dice: 1, src: 'auto', at: S.t });
    }
}

// 🎬 장면 자동 인식: 답 글에 장소 이름 + 움직이는 말이 있으면 장소, 인물 이름이 나오면 같이 있는 사람 (태그에 없을 때만)
const MOVE = /(으로|로|에)\s*(갔|간다|가서|도착|들어|향했|향한|돌아왔|돌아갔|나왔|들렀|옮겼)|arriv|went to|entered/;
function sceneOps(text, book, ops) {
    const t = stripTags(String(text ?? '')), out = [], has = (k) => ops.some(o => kindOf(o.k) === k);
    if (!has('loc')) for (const p of book.world.places) { const at = t.indexOf(p.name); if (at >= 0 && MOVE.test(t.slice(at, at + p.name.length + 12))) { out.push({ k: 'loc', v: p.name, src: 'scene', j: 2000 }); break; } }
    // 이름이 두 번 넘게 나오면 장면에 있다고 본다 (한 번 스친 이름은 빼고)
    if (!has('with')) { const cnt = (n) => (n ? t.split(n).length - 1 : 0); const who = book.people.filter(p => [p.name, ...p.aka].reduce((q, n) => q + cnt(n), 0) >= 2).map(p => p.name); if (who.length) out.push({ k: 'with', v: who.join(', '), src: 'scene', j: 2001 }); }
    return out;
}
// ⚠ 어긋남 감지: 답 글이 상태와 부딪히면 (이야기에서 빠진 사람 등장 · 가진 돈보다 큰 돈을 씀 · 장소가 다른 것 같음) → 확인 필요 칩 + 「상태 고치기」
function drift(book, S, text, ch, flags, i) {
    const t = stripTags(String(text ?? ''));
    for (const [n, r] of Object.entries(S.rel)) if (r.gone && t.includes(n) && !ch.some(c => c.f === `gone.${n}`)) flags.push({ text: `이야기에서 빠진 ${n}이(가) 나왔어요`, i: 3000, fix: `gone: ${n} | -` });
    const cur = book.world.currency, m = new RegExp(`(\\d[\\d,]*)\\s*${cur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.!?\\n]{0,12}(냈|지불|건넸|썼|주고)`).exec(t);
    if (m) { const n = Number(m[1].replace(/,/g, '')); if (n > S.cash && !ch.some(c => c.f === 'cash')) flags.push({ text: `가진 돈(${S.cash})보다 많은 ${n}${cur}을 쓴 것 같아요`, i: 3001, fix: '' }); }
    if (!ch.some(c => c.f === 'loc')) for (const p of book.world.places) if (p.name !== S.loc && t.includes(p.name) && MOVE.test(t.slice(t.indexOf(p.name), t.indexOf(p.name) + p.name.length + 12))) { flags.push({ text: `장소가 ${p.name}(으)로 바뀐 것 같아요`, i: 3002, fix: `loc: ${p.name}` }); break; }
}
