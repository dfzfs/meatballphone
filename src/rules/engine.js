// 엔진: 채팅 메시지들 → 상태. 계산은 코드가, AI는 사건만.
// 원본은 메시지(extra.meatlite.sw)에 있고, 여기서는 매번 처음부터 접어 만든다(바뀐 곳부터만 다시).
import { clamp, num, norm, short, safeKey, parseDelta, spanOf, clockOf, dayOfDate, DAY, hash, periodName, faceOf, inPeriod } from '../base/util.js';
import { msgData, getMeta, ctx, metaRev } from '../base/st.js';
import { readOps, kindOf, parts } from './tags.js';
import { match } from './names.js';
import { NEED_STAGES, NEED_SYMPTOM, personOf, placeOf, BASIC_ACTS } from './book.js';
import { glossList } from '../base/gloss.js';
import { readNewsline, kindInfo } from './newskinds.js';
import { applySneak } from './sneak.js';
const isHome = (book, S) => /home/.test(placeOf(book, S.loc)?.kind ?? '');

// ───── 처음 상태 (설정집에서) ─────
export function initState(book) {
    const w = book.world;
    const S = {
        t: w.start.clock, loc: '', with: [], weather: w.weather[0] ?? '',
        needs: Object.fromEntries(book.me.needs.map(n => [n.key, n.start])),
        gauges: Object.fromEntries(book.me.gauges.map(g => [g.key, g.start])), attrs: Object.fromEntries(book.me.attrs.map(a => [a.name, a.v])),
        cash: 0, items: [], status: [], promises: [], news: [], rel: {},
        mind: {}, watch: {}, cell: {}, bgm: '', custom: {}, turn: 0, rolls: [], pairs: {},
    };
    for (const p of book.people) if (p.auto !== 'npc') S.rel[p.name] = relOf(p); // 이야기 중에 나온 인물은 처음 나온 답부터
    for (const p of book.people) for (const s of p.syn ?? []) if (personOf(book, s.to)) { const k = pairKey(p.name, personOf(book, s.to).name); S.pairs[k] ??= { v: 0, label: s.text, why: '' }; }
    return S;
}
const relOf = (p) => ({ aff: p?.start?.aff ?? 10, trust: p?.start?.trust ?? 10, mem: [], gone: null, jealous: '', life: '', want: p?.want ?? '', seen: { likes: [], hates: [] }, last: [], extra: !p });

// 단계 (욕구 · 관계)
export function needStage(v) { for (const s of NEED_STAGES) if (v >= s.at) return s.name; return '위험'; }
// 💞 인물마다 다른 단계 (설정집 인물 → 단계) · 없으면 공통
export const stagesOf = (book, name) => { const p = name ? personOf(book, name) : null; return p?.stages?.length >= 2 ? p.stages : book.stages; };
export function relStage(book, v, name) { const L = stagesOf(book, name); let st = L[0]; for (const s of L) if (v >= s.at) st = s; return st; }
export function nextStage(book, v, name) { return stagesOf(book, name).find(s => s.at > v) ?? null; }
// 🔗 인물끼리: 이름 둘을 정렬한 열쇠
export const pairKey = (a, b) => [a, b].sort().join('|');


// ───── 한 메시지 적용 ─────
// ch: 이 메시지에서 바뀐 것 [{ f, label, from, to, why, src, sure, i(줄 번호) }]
function makeCtx(book, S, ch, flags, G = glossList()) {
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
        if (A && now === '위험' && was !== '위험' && !S.status.some((s2) => s2.name === A[0])) {
            S.status.push({ name: A[0], kind: 'bad', until: A[1] ? S.t + A[1] : null, dice: A[2], src: 'auto', at: S.t, need: key });
            ch.push({
                f: `status.${A[0]}`,
                label: A[0],
                icon: '🏷️',
                from: '',
                to: A[1] ? `${Math.round(A[1] / 60)}시간` : '나을 때까지',
                why: `${nd.name} 위험`,
                src: 'auto',
                sure: true,
                i,
                kind: 'bad',
            });
        }
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
            d = Math.sign(d) * Math.max(1, Math.round(Math.abs(d)));
            const key = norm(why);
            if (key && r.last.includes(key)) d = Math.sign(d) * Math.ceil(Math.abs(d) / 2);
            // 💗 「기쁘게 함」(맞는 행동이 없을 때의 기본)은 연달아 세 번째부터 0 — 대화만 이어져도 답마다 +1씩 끝없이 오르던 것
            if (d > 0 && key === norm(BASIC_ACTS.up.act) && r.last.filter(q => q === key).length >= 2) d = 0;
            r.last = [key, ...r.last].filter(Boolean).slice(0, 3);
            const done = ch.filter(c => c.f === `rel.${name}.${axis}` && c.src !== 'hand').reduce((a, c) => a + c.to - c.from, 0);
            d = clamp(d, -8 - done, 8 - done);
            if (axis === 'aff' && d > 0) { const nx = nextStage(book, r.aff, name); const nx2 = nx && nextStage(book, nx.at, name); if (nx2 && r.aff + d >= nx2.at) d = nx2.at - 1 - r.aff; }
        }
        const from = r[axis], to = clamp(Math.round(from + d), 0, 100);
        if (to === from) return;
        r[axis] = to;
        ch.push({ f: `rel.${name}.${axis}`, label: `${name} ${axis === 'aff' ? '애정' : '우정'}`, icon: axis === 'aff' ? '💗' : '🤝', from, to, why, src, sure, i, who: name });
        const a = relStage(book, from, name), b = relStage(book, to, name);
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
    return { people, who, need, setNeed, gauge, setGauge, setCash, findItem, addItem, rel, setRel, pass, flag: (text, i) => flags.push({ text, i }) };
}

const DEF = { meal: 35, snack: 15, sleepPerH: 12, wash: 60, restPerH: 10, workPerH: 6, giftLike: 6, giftHate: -4, gift: 2, up: 3, down: -4 };
const isSnack = (t) => /간식|빵|과자|사탕|snack|cookie|bread|커피|coffee|음료|차\b/i.test(t);

export function applyOp(book, S, x, k, v, i, src, ch) {
    const kind = kindOf(k, [...book.me.needs.flatMap(n => [n.name, n.key]), ...book.me.gauges.flatMap(g => [g.name, g.key])]);
    if (kind === 'skip' && /^(attr|능력치|능력)$/i.test(String(k).trim())) {
        const m = /^(.*?)\s*([+\-−]\s*\d+)/.exec(v);
        if (m && S.attrs[m[1].trim()] != null) {
            const d = parseDelta(m[2]).n,
                from = S.attrs[m[1].trim()];
            S.attrs[m[1].trim()] = clamp(from + d, -5, 10);
            ch.push({
                f: `attr.${m[1].trim()}`,
                label: m[1].trim(),
                icon: '💪',
                from,
                to: from + d,
                why: short(parts(v)[1] || '성장', 20),
                src,
                sure: true,
                i,
            });
        }
        return;
    }
    const [a = '', b = '', c = ''] = parts(v);
    const why = (t) => short(t || v, 24);
    switch (kind) {
        case 'skip':
        case 'unknown':
            return;
        case 'ate': {
            const it = a && x.findItem(a);
            if (it && Object.keys(it.fx).length) {
                for (const [nk, d] of Object.entries(it.fx)) x.setNeed(nk, d, it.name, src, true, i);
                x.addItem(it.name, -1, '먹음', src, i);
            } else x.setNeed('hunger', isSnack(a) ? DEF.snack : DEF.meal, why(a || '식사'), src, false, i);
            if (a) {
                S.tasted ??= [];
                const k = short(a, 16);
                if (!S.tasted.includes(k)) S.tasted.push(k);
            }
            if (/술|맥주|와인|beer|wine|soju|소주/i.test(a)) addStatus(S, { name: '취기', kind: 'neutral', until: S.t + 180, dice: -1 }, ch, i, '술');
            return;
        }
        case 'slept': {
            const m = spanOf(a) ?? 420;
            x.pass(m, '잠', i, { sleep: true });
            x.setNeed('energy', (DEF.sleepPerH * m) / 60, why(`${Math.round(m / 60)}시간 잠`), src, !!spanOf(a), i);
            if (m >= 360) x.setNeed('mood', 5, '푹 잠', src, false, i);
            return;
        }
        case 'washed':
            x.setNeed('hygiene', DEF.wash, why(a || '씻음'), src, false, i);
            x.pass(20, '씻음', i);
            return;
        case 'rest': {
            const m = spanOf(a) ?? 60;
            x.pass(m, '쉼', i);
            x.setNeed('energy', (DEF.restPerH * m) / 60, why(a || '쉼'), src, !!spanOf(a), i);
            const pl = placeOf(book, S.loc);
            for (const [nk, d] of Object.entries(pl?.rest ?? {})) x.setNeed(nk, d, `${pl.name}에서 쉼`, src, true, i);
            return;
        }
        case 'worked': {
            const m = spanOf(a) ?? 240;
            x.pass(m, '일', i);
            x.setNeed('energy', (-DEF.workPerH * m) / 60, why(a || '일'), src, !!spanOf(a), i);
            const pay = parseDelta(b);
            if (pay) x.setCash(Math.round(Math.abs(pay.n)), '일한 값', src, true, i);
            return;
        }
        case 'cash':
        case 'earn':
            if (kind === 'earn') {
                const d = parseDelta(a) ?? parseDelta(b);
                if (d) x.setCash(Math.abs(d.n), why(a.match(/\D+/)?.[0] || b || '받음'), src, true, i);
                return;
            }
            {
                const d = parseDelta(a);
                if (!d) return;
                if (!d.rel) {
                    x.setCash(d.n - S.cash, why(b || '돈'), src, true, i);
                    return;
                }
                if (d.n < 0 && S.cash + d.n < 0) {
                    x.flag(`돈이 모자라요 (${S.cash} < ${-d.n})`, i);
                    return;
                }
                x.setCash(d.n, why(b || (d.n < 0 ? '씀' : '받음')), src, true, i);
                return;
            }
        case 'buy': {
            const name = a,
                place = placeOf(book, S.loc),
                good = place?.goods.find((g) => norm(g.name) === norm(name));
            const given = parseDelta(b);
            const price = given ? Math.abs(given.n) : good ? good.price : null;
            const sure = !!(given || good);
            const cost = price ?? Math.round(book.world.meal * (isSnack(name) ? 0.4 : 1));
            if (S.cash < cost) {
                x.flag(`돈 부족: ${name} ${cost} (가진 돈 ${S.cash})`, i);
                return;
            }
            x.setCash(-cost, `${short(name, 12)} 삼`, src, sure, i);
            ch.push({
                f: 'receipt',
                label: '영수증',
                icon: '🧾',
                from: '',
                to: `${short(name, 12)} ${cost}${book.world.currency}`,
                why: `남은 돈 ${S.cash}${place ? ` · ${place.name}` : ''}`,
                src: 'auto',
                sure,
                i,
            });
            if (good && place.kind === 'food') {
                S.tasted ??= [];
                if (!S.tasted.includes(good.name)) S.tasted.push(good.name);
            }
            if (good && place.kind === 'food') {
                for (const [nk, d] of Object.entries(good.fx)) x.setNeed(nk, d, good.name, src, true, i);
                if (!Object.keys(good.fx).length) x.setNeed('hunger', DEF.meal, good.name, src, false, i);
            } else x.addItem(name, Math.max(1, num(c, 1)), '삼', src, i, good?.fx);
            return;
        }
        case 'sell': {
            const it = x.findItem(a);
            if (!it) {
                x.flag(`없는 물건을 팔았어요: ${a}`, i);
                return;
            }
            const p = parseDelta(b);
            x.addItem(it.name, -1, '팖', src, i);
            if (p) x.setCash(Math.abs(p.n), `${it.name} 팖`, src, true, i);
            return;
        }
        case 'item': {
            const d = /^[-−]/.test(a) ? -1 : 1;
            const name = a.replace(/^[+\-−]\s*/, '');
            if (d < 0 && !x.findItem(name)) {
                x.flag(`없는 물건: ${name}`, i);
                return;
            }
            x.addItem(d < 0 ? x.findItem(name).name : name, d * Math.max(1, num(b, 1)), d < 0 ? '잃음' : '얻음', src, i);
            return;
        }
        case 'got':
            x.addItem(a, Math.max(1, num(b, 1)), '얻음', src, i);
            return;
        case 'used': {
            const it = x.findItem(a);
            if (!it) {
                x.flag(`없는 물건을 썼어요: ${a}`, i);
                return;
            }
            for (const [nk, d] of Object.entries(it.fx)) x.setNeed(nk, d, it.name, src, true, i);
            x.addItem(it.name, -1, '씀', src, i);
            return;
        }
        case 'lost': {
            const it = x.findItem(a);
            if (it) x.addItem(it.name, -it.n, '잃음', src, i);
            return;
        }
        case 'wear':
        case 'unwear': {
            let it = x.findItem(a);
            if (!it && kind === 'wear') {
                x.addItem(a, 1, '얻음', src, i);
                it = x.findItem(a);
            }
            if (it && it.worn !== (kind === 'wear')) {
                it.worn = kind === 'wear';
                ch.push({
                    f: 'item',
                    label: it.name,
                    icon: '👕',
                    from: it.worn ? '벗음' : '착용',
                    to: it.worn ? '착용 중' : '벗음',
                    why: '옷차림',
                    src,
                    sure: true,
                    i,
                });
            }
            return;
        }
        case 'gift': {
            const name = x.who(a) ?? safeKey(a);
            if (!name) return;
            const it = b && x.findItem(b);
            if (it) x.addItem(it.name, -1, `${name}에게 선물`, src, i);
            const p = personOf(book, name),
                r = x.rel(name),
                g = norm(b);
            // 물건 이름이 비면 취향 판정 안 함 (빈 글은 모든 취향에 「들어 있음」으로 맞아 버림)
            const hit = (l) => !!g && !!norm(l) && (g.includes(norm(l)) || norm(l).includes(g));
            const like = p?.likes.find(hit),
                hate = p?.hates.find(hit);
            if (like && !r.seen.likes.includes(like)) r.seen.likes.push(like);
            if (hate && !r.seen.hates.includes(hate)) r.seen.hates.push(hate);
            x.setRel(
                name,
                'aff',
                like ? DEF.giftLike : hate ? DEF.giftHate : DEF.gift,
                `🎁 ${short(b || '선물', 10)}${like ? ' · 취향 저격' : hate ? ' · 싫어함' : ''}`,
                src,
                !!(like || hate),
                i,
            );
            return;
        }
        case 'loc': {
            const pl = match(
                a,
                book.world.places.map((p) => ({ name: p.name })),
            );
            const to = pl?.name ?? safeKey(a);
            if (!to || to === S.loc) return;
            ch.push({ f: 'loc', label: '장소', icon: '📍', from: S.loc, to, why: '이동', src, sure: !!pl, i });
            S.loc = to;
            S.visited ??= [];
            if (!S.visited.includes(to)) S.visited.push(to);
            return;
        }
        case 'with': {
            if (/^\s*(없음|혼자|-|none|alone)\s*$/i.test(String(v))) { S.with = []; return; } // 혼자가 됨
            S.with = String(v)
                .split(/[,、·/|]/)
                .map((n) => x.who(n) ?? safeKey(n))
                .filter(Boolean)
                .slice(0, 8);
            return;
        }
        case 'time': {
            // 「+2h」 · 「2시간 후」 · 「30분 뒤」 · 「3 hours later」 → 흐른 시간
            const sp = /^\+/.test(a) || /(후|뒤|지나|흐름|later|after|passed)/i.test(a) ? spanOf(a) : null;
            if (sp) {
                x.pass(sp, why(b || '시간 흐름'), i);
                return;
            }
            const cl = clockOf(a);
            if (cl == null) return;
            const cur = ((S.t % DAY) + DAY) % DAY;
            let d = cl - cur;
            // ⏪ 조금 이른 시각(3시간 안: 19:30에 「저녁」=19:00 · 분류가 「19h」를 19:00으로 적음)은 하루를 넘기지 않고 무시
            //   날을 넘기는 건 +Nh · date · slept · 3시간보다 더 이른 시각(밤 → 새벽)으로만
            if (d < 0) { if (d > -180) return; d += DAY; }
            if (d > 0 && d < DAY) x.pass(d, `${periodName(cl)}이 됨`, i);
            return;
        }
        case 'pass': {
            const m = spanOf(a);
            if (m) x.pass(m, why(b || '시간 흐름'), i);
            return;
        }
        case 'date': {
            const at = dayOfDate(book.world.start, a, S.t);
            if (at != null && at > S.t) x.pass(at - Math.floor(S.t / DAY) * DAY - (S.t % DAY) + (S.t % DAY), '날짜 이동', i);
            return;
        }
        case 'weather': {
            if (a && a !== S.weather) {
                ch.push({ f: 'weather', label: '날씨', icon: '🌦️', from: S.weather, to: a, why: '날씨', src, sure: true, i });
                S.weather = short(a, 12);
            }
            return;
        }
        case 'aff':
        case 'trust': {
            // 「Leon +3」 「Leon | +3 | 이유」
            const m = /^(.*?)\s*([+\-−]\s*\d+)\s*$/.exec(a);
            const nm = m ? m[1] : a,
                dd = parseDelta(m ? m[2] : b);
            const name = x.who(nm) ?? safeKey(nm);
            if (!name || !dd) return;
            x.setRel(name, kind, dd.n, why(m ? b : c) || '변화', src, true, i);
            return;
        }
        case 'act': {
            const name = x.who(a);
            if (!name) return;
            const p = personOf(book, name),
                t = norm(b);
            if (!t) return; // 한 일이 비면 무엇이 오를지 모름 → 건너뜀
            const up = p?.up.find((u) => t.includes(norm(u.act)) || norm(u.act).includes(t)),
                down = p?.down.find((u) => t.includes(norm(u.act)) || norm(u.act).includes(t));
            const basic = (B) => t.includes(norm(B.act)) || norm(B.act).includes(t);
            if (up) x.setRel(name, 'aff', up.d ?? DEF.up, up.act, src, up.d != null, i);
            else if (down) x.setRel(name, 'aff', down.d ?? DEF.down, down.act, src, down.d != null, i);
            // 설정집에 딱 맞는 행동이 없을 때: 모든 인물의 기본 행동 (기쁘게 함 +2 · 상처 줌 −3)
            else if (basic(BASIC_ACTS.up)) x.setRel(name, 'aff', BASIC_ACTS.up.d, BASIC_ACTS.up.act, src, true, i);
            else if (basic(BASIC_ACTS.down)) x.setRel(name, 'aff', BASIC_ACTS.down.d, BASIC_ACTS.down.act, src, true, i);
            if (/(고백|키스|첫|약속|싸움|배신|구해|울)/.test(b)) remember(S, x.rel(name), b);
            return;
        }
        case 'need': {
            // 「허기: -10」 또는 옛 「stat: 체력 -3」
            const m = /^(.*?)\s*([+\-−]?\s*\d+)\s*(?:\|\s*(.*))?$/.exec(v);
            const gg = x.gauge(k) ?? (m && x.gauge(m[1]));
            if (gg && !x.need(k)) {
                const dd = parseDelta(x.gauge(k) ? a : m?.[2]);
                if (dd) x.setGauge(gg.key, dd.rel ? dd.n : dd.n - (S.gauges[gg.key] ?? 0), why(x.gauge(k) ? b : m?.[3]) || '변화', src, true, i);
                return;
            }
            const nd = x.need(k) ?? (m && x.need(m[1]));
            if (!nd) return;
            const dd = parseDelta(x.need(k) ? a : m?.[2]);
            if (!dd) return;
            x.setNeed(nd.key, dd.rel ? dd.n : dd.n - S.needs[nd.key], why(x.need(k) ? b : m?.[3]) || '변화', src, true, i);
            return;
        }
        case 'status':
        case 'fate': {
            if (/^[-−]/.test(a)) {
                const n = a.replace(/^[-−]\s*/, '');
                const st = S.status.find((s) => norm(s.name) === norm(n));
                if (st) {
                    S.status.splice(S.status.indexOf(st), 1);
                    ch.push({
                        f: `status.${st.name}`,
                        label: st.name,
                        icon: '🏷️',
                        from: '있음',
                        to: '풀림',
                        why: why(b || '나음'),
                        src,
                        sure: true,
                        i,
                        kind: st.kind,
                    });
                }
                return;
            }
            const dm = /([+\-−]\s*\d)/.exec(`${a} ${c}`),
                sp = spanOf(b) ?? (kind === 'fate' ? DAY * 3 : null);
            const name = short(a.replace(/[+\-−]\s*\d+/, '').trim(), 12);
            if (!name) return;
            const bad = /저주|감기|숙취|부상|피로|병|curse|sick|hurt|불운|탈진|우울/i.test(a) || (dm && /[-−]/.test(dm[1]));
            addStatus(
                S,
                {
                    name,
                    kind: kind === 'fate' ? (bad ? 'bad' : 'good') : bad ? 'bad' : /축복|행운|기쁨|bless|lucky/i.test(a) ? 'good' : 'neutral',
                    until: sp ? S.t + sp : null,
                    dice: dm ? Number(dm[1].replace(/\s/g, '').replace('−', '-')) : bad ? -1 : 0,
                    src: kind === 'fate' ? 'fate' : src,
                },
                ch,
                i,
                kind === 'fate' ? '운명' : c ? short(c, 24) : '상태',
            );
            return;
        }
        case 'roll':
            S.rollN = (S.rollN ?? 0) + 1; S.rolls.push({ t: S.t, what: short(v, 120), i }); if (S.rolls.length > 30) S.rolls.shift(); // 🎲 화면엔 최근 3개만 씀 · 배지는 rollN
            return;
        case 'mind':
        case 'watch':
        case 'cell': {
            if (!a || !b) return;
            const who = x.who(a) ?? safeKey(a),
                text = short(parts(v).slice(1).join(' | '), 240);
            S[kind][who] = text;
            S.mindLog = [...(S.mindLog ?? []), { k: kind, who, text, t: S.t }].slice(-40);
            return;
        }
        case 'jealous': {
            const name = x.who(a);
            if (!name) return;
            const r = x.rel(name);
            r.jealous = short(b || '질투', 120);
            remember(S, r, `질투: ${b}`);
            x.setRel(name, 'trust', -1, '질투', src, false, i);
            news(S, '💢', `${name} — ${short(b || '질투가 남', 120)}`, 'jealous', name);
            return;
        }
        case 'life': {
            const name = x.who(a) ?? safeKey(a);
            if (!name || !b) return;
            x.rel(name).life = short(b, 200);
            news(S, '🌙', `${name} — ${short(b, 200)}`, 'life', name);
            return;
        }
        case 'conflict': if (v) x.flag(short(v, 200), i); return; // 분류 모델이 본 「답 글 ↔ 지금 상태」 어긋남 → 확인 필요
        case 'pair': {
            // 🔗 인물끼리: pair: A | B | +5 | 이유  ·  pair: A | B | 라이벌
            const A = x.who(a) ?? safeKey(a),
                B = x.who(b) ?? safeKey(b);
            if (!A || !B || A === B) return;
            const key = pairKey(A, B);
            S.pairs ??= {};
            const pr = (S.pairs[key] ??= { v: 0, label: '', why: '' }),
                dd = parseDelta(c),
                d4 = parts(v)[3] ?? '';
            if (dd) {
                const from = pr.v,
                    to = clamp(Math.round(from + clamp(dd.n, -15, 15)), -100, 100);
                if (to === from) return;
                pr.v = to;
                pr.why = short(d4 || '변화', 80);
                ch.push({ f: `pair.${key}`, label: `${A}↔${B}`, icon: '🔗', from, to, why: pr.why, src, sure: true, i });
            } else if (c) {
                const was = pr.label;
                pr.label = short(c, 16);
                if (d4) pr.why = short(d4, 80);
                if (was !== pr.label)
                    ch.push({
                        f: `pair.${key}`,
                        label: `${A}↔${B}`,
                        icon: '🔗',
                        from: was || '-',
                        to: pr.label,
                        why: pr.why || '관계가 바뀜',
                        src,
                        sure: true,
                        i,
                        cross: true,
                    });
            }
            return;
        }
        case 'want': {
            const name = x.who(a);
            if (name && b) x.rel(name).want = short(b, 160);
            return;
        }
        case 'memory': {
            const name = x.who(a);
            if (name && b) remember(S, x.rel(name), b);
            return;
        }
        case 'taste': {
            const name = x.who(a);
            if (!name) return;
            const r = x.rel(name);
            for (const t of parts(v).slice(1)) {
                const n = t.replace(/^[+\-−]\s*/, '');
                if (!n) continue;
                const L = /^[-−]/.test(t) ? r.seen.hates : r.seen.likes;
                if (!L.includes(n)) L.push(short(n, 16));
            }
            return;
        }
        case 'npc': {
            const name = x.who(a) ?? safeKey(a);
            if (!name || S.rel[name]) return;
            S.rel[name] = relOf(personOf(book, name)); // 규칙을 채운 새 인물이면 그 시작 값
            S.rel[name].line = short(b, 120);
            S.rel[name].face = faceOf(c);
            ch.push({ f: `npc.${name}`, label: name, icon: '👤', from: '', to: '새 인물', why: short(b, 20), src, sure: true, i, who: name });
            return;
        }
        case 'gone': {
            const name = x.who(a);
            if (!name) return;
            // 🔙 돌아옴: 「gone: 이름 | 돌아옴」 (관계 앱의 「돌아옴」 버튼 · 옛 버튼이 적은 빈 사유의 ✋ 직접 줄도)
            if (/^(돌아옴|복귀|back|returned?)$/i.test(b.trim()) || (src === 'hand' && !b.trim())) {
                const r = x.rel(name); if (!r.gone) return;
                r.gone = null;
                ch.push({ f: `gone.${name}`, label: name, icon: '🔙', from: '이야기에서 빠짐', to: '돌아옴', why: '돌아옴', src, sure: true, i, who: name });
                return;
            }
            x.rel(name).gone = short(b || '떠남', 80);
            ch.push({
                f: `gone.${name}`,
                label: name,
                icon: '🕊️',
                from: '',
                to: '이야기에서 빠짐',
                why: short(b, 20),
                src,
                sure: true,
                i,
                who: name,
            });
            return;
        }
        case 'promise': {
            if (/^[-−✓]|완료|지킴|done/.test(b) || /^[-−✓]/.test(a)) {
                const t = a.replace(/^[-−✓]\s*/, '');
                const p = S.promises.find((q) => !q.done && (norm(q.text).includes(norm(t)) || norm(t).includes(norm(q.text))));
                if (p) p.done = S.t;
                return;
            }
            const due = dayOfDate(book.world.start, b, S.t) ?? (spanOf(b) != null ? S.t + spanOf(b) : null);
            S.promises.push({ text: short(a, 120), due, at: S.t, done: null, i });
            return;
        }
        case 'noted': { // 👀 인물이 달력 메모를 보고 꺼냄 → 그 메모는 다시 힌트로 안 냄 (calplus.js)
            const who = x.who(a) ?? safeKey(a), md = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(b);
            if (!who) return;
            S.noted = [...(S.noted ?? []), { who, md: md ? `${Number(md[1])}/${Number(md[2])}` : '', t: S.t }];
            ch.push({ f: 'noted', label: '달력 메모를 봄', icon: '👀', from: '', to: who, why: short(b, 20), src, sure: true, i });
            return;
        }
        case 'anniv': {
            const name = x.who(a);
            if (name) x.rel(name).day = short(b, 16);
            return;
        }
        case 'bgm': {
            // 🎵 bgm: 곡 제목 - 가수 | 분위기 한 단어 | 왜 어울리는지 (AI가 장면을 보고 고른 실제 곡)
            const [head = '', mood = '', why2 = ''] = parts(v);
            const hm = /^(.+?)\s+(?:-|–|—|by|\/)\s+(.+)$/i.exec(head), unq = (t) => String(t).replace(/^["“'「『]|["”'」』]$/g, '').trim();
            const title = short(unq(hm ? hm[1] : head), 60), artist = short(hm ? unq(hm[2]) : '', 40);
            if (!title || /^(없음|none|-)$/i.test(title) || norm(title) === norm(S.bgm?.title)) return;
            const from = S.bgm?.title ?? '';
            S.bgm = { title, artist, mood: short(mood, 16), why: short(why2, 240) };
            S.bgmLog = [...(S.bgmLog ?? []), S.bgm].slice(-30);
            ch.push({ f: 'bgm', label: '추천 음악', icon: '🎵', from, to: title, why: artist || short(mood, 12), src, sure: true, i });
            return;
        }
        case 'quote': {
            // 📜 quote: 구절 원문 | 출처(작품 · 사람 · 나라) | 한국어 뜻(외국어일 때) | 왜 어울리는지
            const [text = '', from2 = '', mean = '', why2 = ''] = parts(v);
            const t = short(text.replace(/^["“'「『]|["”'」』]$/g, '').trim(), 120);
            if (!t || /^(없음|none|-)$/i.test(t) || norm(t) === norm(S.quote?.text)) return;
            S.quote = { text: t, src: short(from2, 80), mean: short(mean, 300), why: short(why2, 240) };
            S.quoteLog = [...(S.quoteLog ?? []), S.quote].slice(-30);
            ch.push({ f: 'quote', label: '한 구절', icon: '📜', from: '', to: short(t, 24), why: short(from2, 20), src, sure: true, i });
            return;
        }
        case 'newsline': {
            const nl = readNewsline(v), k = kindInfo(nl.kind);
            if (nl.text) news(S, k.icon, short(nl.text, 240), nl.kind, '');
            return;
        }
        case 'feed': {
            const name = x.who(a) ?? safeKey(a);
            if (name && b) news(S, '📱', `${name} — ${short(parts(v).slice(1).join(' | '), 240)}`, 'feed', name);
            return;
        }
        case 'custom': {
            const tab = safeKey(a),
                f = safeKey(b);
            if (tab && f) {
                (S.custom[tab] ??= {})[f] = short(c, 120);
            }
            return;
        }
        case 'meddle': {
            // ✍ 인물이 내 상태창에 손댄다 — 「meddle: Leon | 기분 | +20 | 낙서」 → 그 인물 이름으로 기록 (되돌리기 가능)
            if (applySneak(book, S, x, v, i, ch)) return; // 🎁 소지품 · 💸 돈 · 📅 달력 · 되돌림 (sneak.js)
            const name = x.who(a) ?? safeKey(a);
            const nd = x.need(b);
            const dd = parseDelta(c);
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
function remember(S, r, text) { r.mem = [{ t: S.t, text: short(text, 160) }, ...r.mem.filter(m => m.text !== short(text, 160))].slice(0, 5); }
// 📰 소식은 40개만 남기지만 배지는 지금까지 온 개수(newsN)로 센다 (40개가 찬 뒤로 배지가 안 뜨던 것)
function news(S, icon, text, kind, who) { S.newsN = (S.newsN ?? 0) + 1; S.news.unshift({ t: S.t, icon, text, kind, who }); S.news.length = Math.min(S.news.length, 40); }

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
    const outdoor = !/home|bath|school|work|shop|food/.test(placeOf(book, S.loc)?.kind ?? 'street');
    if (outdoor && /비|눈|폭우|폭설|rain|snow/i.test(S.weather) && attr === '민첩') out.push({ why: `🌧 ${S.weather} (밖)`, n: -1 });
    if (luck?.rolled) { const n = luck.tier === '대길' ? 2 : luck.tier === '대흉' ? -2 : luck.stars >= 5 ? 1 : luck.stars <= 1 ? -1 : 0; if (n) out.push({ why: `🍀 오늘 운세 ${'★'.repeat(luck.stars)}`, n, fate: true }); }
    for (const d of derived(book, S)) if (d.stage === '위험') out.push({ why: `${d.name} 위험`, n: d.dice });
    for (const st of S.status) if (num(st.dice)) out.push({ why: st.name, n: num(st.dice), fate: st.src === 'fate' });
    for (const it of S.items) if (it.worn && attr && num(it.fx?.[attr])) out.push({ why: `${it.name} 착용`, n: num(it.fx[attr]) });
    return out;
}

// ───── 📐 숫자 규칙 판: 오르는 폭 · 내리는 폭 · 줄어드는 속도를 고치면 「그 메시지부터」 새 규칙 ─────
//   meta.ruleVers = [{ n, until, rules }] — until 앞의 메시지는 rules(그때 규칙)로 계산 · 설명 글(성격 · 취향 · 루틴)과 시작 값은 판을 나누지 않음
export const ruleSnap = (book) => structuredClone({
    needs: Object.fromEntries(book.me.needs.map(n => [n.key, n.rate])),
    people: Object.fromEntries(book.people.map(p => [p.name, { up: p.up, down: p.down }])),
});
// 둘 다에 있는 칸만 비교 (인물이 새로 들어오거나 빠진 건 판을 나누지 않음)
function rulesDiffer(a, b) {
    for (const k of Object.keys(a.needs)) if (k in b.needs && a.needs[k] !== b.needs[k]) return true;
    for (const n of Object.keys(a.people)) if (n in b.people && JSON.stringify(a.people[n]) !== JSON.stringify(b.people[n])) return true;
    return false;
}
// 설정집이 바뀌었으면 판을 하나 올린다 → 저장이 필요하면 true
export function noteRules(meta, chatLen) {
    if (!meta?.book) return false;
    const snap = ruleSnap(meta.book);
    if (!meta.ruleSnap) { meta.ruleSnap = snap; return true; }
    if (rulesDiffer(meta.ruleSnap, snap)) {
        const V = (meta.ruleVers ??= []), last = V[V.length - 1];
        // 같은 자리에서 또 고치면 그 앞 메시지들은 처음 규칙 그대로
        if (!last || last.until !== chatLen) V.push({ n: V.length + 1, until: chatLen, rules: meta.ruleSnap });
    }
    if (JSON.stringify(meta.ruleSnap) === JSON.stringify(snap)) return false;
    meta.ruleSnap = snap;
    return true;
}
const noPhoto = (k, v) => (k === 'photo' && typeof v === 'string' ? v.length : v);
const bookCache = new WeakMap();
function bookFor(meta, i) {
    const v = (meta.ruleVers ?? []).find(x => i < x.until); if (!v) return meta.book;
    const hit = bookCache.get(v); if (hit?.src === meta.book) return hit.book;
    const needs = meta.book.me.needs.map(n => (n.key in v.rules.needs ? { ...n, rate: v.rules.needs[n.key] } : n));
    const b = { ...meta.book, me: { ...meta.book.me, needs } };
    b.people = meta.book.people.map(p => (v.rules.people[p.name] ? { ...p, ...v.rules.people[p.name] } : p));
    bookCache.set(v, { src: meta.book, book: b });
    return b;
}
// ───── 접기 (캐시: 메시지마다 서명이 같으면 다시 계산하지 않음) ─────
let cache = { chatId: null, bookSig: '', sig: [], states: [], changes: [], flags: [], base: null };
const caches = new Map();
let curCustom = [];
const sigOf = (m) => (m.is_user ? `u${m.mes?.length}` : `${m.swipe_id ?? 0}:${m.mes?.length}:${msgData(m)?.rev ?? 0}:${m.is_system ? 1 : 0}`);
// 메시지 i의 변화 줄: 태그(답 글) → 저장해 둔 ops → 손으로 고친 것 · 손댄 것
// 🏎 답 글에서 사건 줄 읽기는 글이 같으면 한 번만 (메시지 칸에 저장 안 된 옛 답 · 다시 계산할 때마다 다시 읽던 것)
const opsMemo = new WeakMap();
function readOpsOf(m) { const t = m.mes ?? '', hit = opsMemo.get(m); if (hit && hit.t === t) return hit.ops; const ops = readOps(t); opsMemo.set(m, { t, ops }); return ops; }
export function opsOf(m, book = null) {
    if (!m || m.is_user || m.is_system) return [];
    const sl = msgData(m);
    const src = sl?.src ?? 'tag'; // tag: 본편 태그 · cls: 분류 모델
    const ops = (sl?.ops ?? readOpsOf(m)).map(([k, v], j) => ({ k, v, src, j }));
    for (const [j, h] of (sl?.hand ?? []).entries()) ops.push({ k: h.k, v: h.v, src: h.src ?? 'hand', why: h.why, j: 1000 + j });
    const undo = new Set(sl?.undo ?? []);
    return ops.filter(o => !undo.has(o.j));
}
let quick = { key: '', r: null };
// 상태 사진은 16개마다 하나만 (긴 채팅에서 다시 계산이 가볍게) · 수치는 메시지마다 작게 (그래프 · 하이라이트용)
const SNAP = 16;
const EMPTY = Object.freeze([]);
export function fold(force = false) {
    const meta = getMeta(); if (!meta?.book) return null;
    const chat = ctx().chat ?? [], id = ctx().getCurrentChatId?.();
    // 빠른 길: 채팅 · 마지막 메시지 · 스와이프 · 설정집 저장 번호가 그대로면 지난 결과 (선택지 미리 보기처럼 한 화면에 여러 번 부를 때)
    const last = chat[chat.length - 1], qk = `${id}|${chat.length}|${last ? sigOf(last) : ''}|${metaRev}|${meta.book === quick.book ? 1 : 0}`;
    if (!force && quick.r && quick.key === qk) return quick.r;
    const bsig = hash(JSON.stringify(meta.book, noPhoto) + /* 🏎 장소 사진(수백 KB)은 계산과 무관 → 길이만 */ JSON.stringify(meta.start ?? {}) + (meta.startAt ?? 0) + JSON.stringify(meta.ruleVers ?? []) + JSON.stringify(meta.preHand ?? []));
    // 💾 채팅마다 계산 결과를 메모리에 둔다 (최근 4개 채팅) — 다른 채팅에 갔다 와도 처음부터 다시 안 셈
    if (cache.chatId !== id) { if (cache.chatId != null) { caches.delete(cache.chatId); caches.set(cache.chatId, cache); while (caches.size > 4) caches.delete(caches.keys().next().value); } const old = caches.get(id); if (old) cache = old; }
    if (force || cache.chatId !== id || cache.bookSig !== bsig) cache = { chatId: id, bookSig: bsig, sig: [], snap: [], needs: [], at: [], changes: [], flags: [], base: null, last: null };
    const G = glossList(); curCustom = meta.custom ?? [];
    if (!cache.base) {
        cache.base = startState(meta);
        // ✋ AI 답이 아직 없을 때 고친 것(다른 곡 · AI로 수정 · 직접 고치기)은 시작 상태에 붙인다
        if (meta.preHand?.length) { const ch = [], x = makeCtx(meta.book, cache.base, ch, []); for (const o of meta.preHand) { try { applyOp(meta.book, cache.base, x, o.k, o.v, -1, o.src ?? 'hand', ch); } catch (e) { console.warn('[미트볼폰] 시작 고침 건너뜀', o, e); } } }
    }
    let from = 0;
    while (from < chat.length && from < cache.sig.length && cache.sig[from] === sigOf(chat[from])) from++;
    // 바뀐 곳 바로 앞의 사진에서 다시 시작
    let k = from - 1; while (k >= 0 && !cache.snap[k]) k--;
    if (from === cache.sig.length && from > 0 && cache.last && cache.last.i === from - 1) k = -2; // 끝에 붙기만 했으면 마지막 상태에서 바로
    const S0 = k === -2 ? cache.last.S : k >= 0 ? cache.snap[k] : cache.base;
    const start = k === -2 ? from : k + 1;
    for (const arr2 of [cache.sig, cache.needs, cache.at, cache.changes, cache.flags]) arr2.length = start;
    cache.snap.length = Math.min(cache.snap.length, start);
    let S = structuredClone(S0);
    for (let i = start; i < chat.length; i++) {
        const m = chat[i], ch = [], flags = [];
        if (!m.is_user && !m.is_system && i >= (meta.startAt ?? 0)) {
            S.mind = {}; S.watch = {}; S.cell = {}; S.turn++;
            const bk = bookFor(meta, i), x = makeCtx(bk, S, ch, flags, G);
            const W = null, P = { tasted: S.tasted?.length ?? 0, visited: S.visited?.length ?? 0, rolls: S.rolls?.length ?? 0, kept: (S.promises ?? []).filter(q => q.done).length, custom: JSON.stringify(S.custom) }; // ⭐ 이 답 전에 원하던 것 · 그때 개수
            for (const o of opsOf(m, bk)) { const n0 = ch.length; try { applyOp(bk, S, x, o.k, o.v, o.j, o.src, ch); } catch (e) { console.warn('[미트볼폰] 줄 건너뜀', o, e); } if (o.why) for (let q = n0; q < ch.length; q++) if (ch[q].src === o.src) ch[q].why = o.why; }
            for (const e of [...(S.mindLog ?? []), ...(S.bgmLog ?? []), ...(S.quoteLog ?? []), S.bgm, S.quote]) if (e) e.m ??= i; // 💭🎵📜 몇 번째 메시지에서 떴나
            afterTurn(bk, S, x, ch, W, i, P);
        }
        cache.sig[i] = sigOf(m); cache.changes[i] = ch; cache.flags[i] = msgData(m)?.flagOk ? [] : flags; cache.needs[i] = { ...S.needs, ...Object.fromEntries(Object.entries(S.gauges ?? {}).map(([g, v]) => [`g:${g}`, v])) };
        cache.at[i] = { t: S.t, loc: S.loc, with: S.with.length ? [...S.with] : EMPTY }; // 🧵 그때 장소 · 시각 · 같이 있던 사람 (메모리에만 · 저장 안 함)
        if (i % SNAP === 0) cache.snap[i] = structuredClone(S);
    }
    cache.last = { i: chat.length - 1, S };
    const out = { S: chat.length ? S : cache.base, needsAt: cache.needs, at: cache.at, changes: cache.changes, flags: cache.flags, book: meta.book, base: cache.base, stateAt };
    quick = { key: qk, r: out, book: meta.book };
    return out;
}
// 🕰 그때 상태: 가장 가까운 사진에서 그 메시지까지 다시 계산 (읽기 전용)
export function stateAt(i) {
    const meta = getMeta(), chat = ctx().chat ?? []; if (!meta?.book || i < 0) return null;
    curCustom = meta.custom ?? []; const G = glossList();
    let k = i; while (k >= 0 && !cache.snap[k]) k--;
    const S = structuredClone(k >= 0 ? cache.snap[k] : cache.base);
    for (let j = k + 1; j <= i && j < chat.length; j++) {
        const m = chat[j]; if (m.is_user || m.is_system || j < (meta.startAt ?? 0)) continue;
        const ch = [], flags = []; S.mind = {}; S.watch = {}; S.cell = {}; S.turn++;
        const bk = bookFor(meta, j), x = makeCtx(bk, S, ch, flags, G), W = null, P = { tasted: S.tasted?.length ?? 0, visited: S.visited?.length ?? 0, custom: JSON.stringify(S.custom) };
        for (const o of opsOf(m, bk)) { try { applyOp(bk, S, x, o.k, o.v, o.j, o.src, ch); } catch { /* 건너뜀 */ } }
        afterTurn(bk, S, x, ch, W, j, P);
    }
    return S;
}
export function startState(meta) {
    const st = meta.start ?? {};
    const S = initState(meta.book);
    if (st.cash != null) S.cash = num(st.cash);
    if (Array.isArray(st.items)) S.items = st.items.map(it => ({ name: safeKey(it.name), n: Math.max(1, num(it.n, 1)), worn: !!it.worn, fx: it.fx ?? {} })).filter(it => it.name);
    if (st.loc) S.loc = st.loc;
    if (st.needs) for (const [k, v] of Object.entries(st.needs)) if (k in S.needs) S.needs[k] = clamp(num(v), 0, 100);
    if (st.gauges) for (const [k, v] of Object.entries(st.gauges)) if (k in S.gauges) S.gauges[k] = num(v);
    if (st.rel) for (const [k, v] of Object.entries(st.rel)) if (S.rel[k]) Object.assign(S.rel[k], { aff: num(v.aff, S.rel[k].aff), trust: num(v.trust, S.rel[k].trust) });
    if (st.attrs) for (const [k, v] of Object.entries(st.attrs)) if (k in S.attrs) S.attrs[k] = num(v);
    if (st.weather) S.weather = String(st.weather);
    if (Array.isArray(st.status)) S.status = st.status.filter(x => x?.name).map(x => ({ name: short(x.name, 12), kind: 'mid', note: x.note ?? '', until: null, dice: num(x.dice), src: 'old', at: S.t }));
    if (st.pairs) S.pairs = { ...S.pairs, ...structuredClone(st.pairs) };
    return S;
}
export const resetCache = () => { cache.chatId = null; caches.clear(); quick.key = ''; };

// 지금 이 시간에 인물이 있을 곳: 같이 있음 → 하루 루틴(시간대) → 자주 있는 곳으로
export function whereNow(book, S, p) {
    const r = S.rel[p.name];
    if (r?.gone) return null;
    if (S.with.includes(p.name)) return { place: S.loc, why: '함께 있음' };
    const sl = periodName(S.t), rt = p.routine.find(q => inPeriod(q.at, sl));
    if (rt) return { place: rt.place, why: `${rt.at} 루틴` };
    if (p.haunt[0]) return { place: p.haunt[0], why: '자주 있는 곳' };
    return null;
}

function afterTurn(book, S, x, ch, W, i, P) {
    // 🧩 내 탭: 「높음」 경계를 넘는 순간 → 경계 문구 (본편 힌트) + 다른 칸과 연결 (예: 「기분 -5」)
    const before = JSON.parse(P.custom || '{}');
    for (const t of curCustom) for (const f of t.fields ?? []) {
        if (!f.max) continue; const hi = f.stages?.[1] ?? 70, a = num(before[t.name]?.[f.name], -1), b = num(S.custom[t.name]?.[f.name], -1);
        if (a < hi && b >= hi) {
            ch.push({ f: `custom.${t.name}.${f.name}`, label: `${t.name} · ${f.name} 높음`, icon: t.icon || '🧩', from: a, to: b, why: f.say || '경계를 넘음', src: 'auto', sure: true, i, cross: true, say: f.say });
            const m = /^(.+?)\s*([+\-−]\s*\d+)/.exec(f.link ?? ''); if (m) { const nd = x.need(m[1].trim()); const d = Number(m[2].replace(/\s/g, '').replace('−', '-')); if (nd) x.setNeed(nd.key, d, `🧩 ${f.name} 높음`, 'auto', true, i); }
        }
    }
}

