// 📘 상태창 설정집 — 칸이 정해진 구조. 계산 코드가 그대로 읽는다. 본편에는 매 턴 넣지 않는다.
import { arr, clamp, num, short, safeKey, tokens, norm, faceOf } from '../base/util.js';

export const LIMIT = { people: 24, lines: 6, places: 30, items: 5, line: 200 }; // 글이 「…」로 잘리지 않게 넉넉히 (영어도)
// 기본 욕구 4개 (위가 좋음 · 100 만점). rate = 한 시간에 줄어드는 양
export const NEED_SET = [
    { key: 'hunger', name: '허기', icon: '🍞', start: 80, rate: 4 },
    { key: 'energy', name: '에너지', icon: '⚡', start: 80, rate: 3 },
    { key: 'hygiene', name: '위생', icon: '🫧', start: 80, rate: 2 },
    { key: 'mood', name: '기분', icon: '🙂', start: 70, rate: 1 },
];
// 단계와 경계 (모든 욕구 공통 · 설정집에서 바꿀 수 있음)
// 게이지 (dev 수치 탭의 체력 · 마나 같은 것) · 능력치 (주사위 보정)
export const GAUGE_SET = [{ key: 'hp', name: '체력', max: 100, start: 100, desc: '0이 되면 쓰러진다', color: '#e5484d' }];
export const ATTR_SET = ['힘', '민첩', '지능', '매력', '감각'].map(name => ({ name, v: 0 }));
export const NEED_STAGES = [{ at: 40, name: '정상' }, { at: 15, name: '주의' }, { at: 0, name: '위험' }];
// 위험 단계의 본편 한 줄 (설정집 symptom이 없을 때)
export const NEED_SYMPTOM = {
    hunger: { 주의: '배가 고파 집중이 흐트러짐', 위험: '허기로 예민하고 손이 떨림' },
    energy: { 주의: '하품 · 반응이 느려짐', 위험: '눈꺼풀이 감기고 실수가 잦음' },
    hygiene: { 주의: '머리가 헝클어지고 옷이 구겨짐', 위험: '주변이 냄새를 알아챔' },
    mood: { 주의: '말수가 줄고 날카로움', 위험: '작은 일에도 무너질 듯함' },
};
export const REL_STAGES = [
    { at: 0, name: '낯선 사람', call: '이름', act: '존댓말 · 거리 둠' },
    { at: 20, name: '아는 사이', call: '이름', act: '가벼운 대화' },
    { at: 40, name: '친구', call: '이름 · 별명', act: '농담 · 부탁' },
    { at: 60, name: '가까운 사이', call: '별명', act: '스킨십 조금 · 속마음 조금' },
    { at: 80, name: '연인', call: '애칭', act: '애정 표현 · 약속' },
];
export const PLACE_KINDS = { home: '🏠', shop: '🛒', food: '🍜', bath: '🛁', work: '💼', street: '🛣️', school: '🏫', other: '📍' };

const line = (v, n = LIMIT.line) => short(v, n);
const list = (v, n = LIMIT.lines) => arr(v).map(x => line(typeof x === 'string' ? x : x?.name ?? x?.text ?? '')).filter(Boolean).slice(0, n);
const acts = (v) =>
    arr(v)
        .map((x) =>
            typeof x === 'string'
                ? (() => {
                      const m = /^(.*?)\s*([+\-−]\s*\d+)?$/.exec(x);
                      return { act: line(m[1], 80), d: m[2] ? Number(m[2].replace(/\s/g, '').replace('−', '-')) : null };
                  })()
                : { act: line(x?.act ?? x?.name, 80), d: x?.d == null ? null : num(x.d) },
        )
        .filter((x) => x.act)
        .slice(0, LIMIT.lines);

export function emptyBook() {
    return {
        world: { genre: '', summary: '', rules: [], currency: '골드', fx: { rate: 0, unit: '원' }, meal: 10, weather: ['맑음', '흐림', '비'], start: { y: 2026, m: 3, d: 1, clock: 480 }, places: [] },
        me: { name: '', day: '', needs: NEED_SET.map(n => ({ ...n })), gauges: GAUGE_SET.map(g => ({ ...g })), attrs: ATTR_SET.map(a => ({ ...a })), traits: '' },
        people: [],
        stages: REL_STAGES.map(s => ({ ...s })),
        src: { from: 'blank', at: 0, sig: {} },
    };
}
export function normPerson(p) {
    const name = safeKey(p?.name);
    if (!name) return null;
    return {
        name,
        aka: list(p.aka, 4),
        face: faceOf(p.face, '🙂'),
        line: line(p.line ?? p.personality),
        start: { aff: clamp(num(p.start?.aff, 10), 0, 100), trust: clamp(num(p.start?.trust, 10), 0, 100) },
        up: acts(p.up), down: acts(p.down),
        signs: arr(p.signs).map(s => ({ at: clamp(num(s?.at, 60), 0, 100), text: line(s?.text, 160) })).filter(s => s.text).slice(0, 4),
        // 💞 이 사람만의 관계 단계 (비우면 설정집 공통 단계)
        stages: arr(p.stages).length >= 2 ? arr(p.stages).map(s => ({ at: clamp(num(s?.at), 0, 100), name: line(s?.name, 10), call: line(s?.call, 40), act: line(s?.act, 100) })).filter(s => s.name).sort((a, b) => a.at - b.at) : null,
        syn: arr(p.syn).map(s => ({ to: safeKey(s?.to), text: line(s?.text, 160) })).filter(s => s.to).slice(0, 4),
        haunt: list(p.haunt, 3),
        routine: arr(p.routine).map(r => ({ at: line(r?.at, 6), place: line(r?.place, 60) })).filter(r => r.at && r.place).slice(0, 4),
        likes: list(p.likes, 5), hates: list(p.hates, 5),
        day: line(p.day, 24),
        want: line(p.want),
        noLove: !!p.noLove,
        auto: p.auto === 'npc' ? 'npc' : undefined, // 이야기 중 npc로 나와 규칙을 채운 인물
    };
}
export function normPlace(p) {
    const name = safeKey(p?.name);
    if (!name) return null;
    const kind = PLACE_KINDS[p.kind] ? p.kind : 'other';
    return {
        name, kind,
        line: line(p.line, 30), // 노선 이름
        near: list(p.near, 4),  // 이어진 장소
        floors: list(p.floors, 6),
        goods: arr(p.goods).map(g => ({ name: line(g?.name, 50), price: Math.max(0, num(g?.price, 0)), fx: fxOf(g?.fx) })).filter(g => g.name).slice(0, LIMIT.items),
        rest: fxOf(p.rest),
        note: line(p.note, 240),
        photo: typeof p.photo === 'string' && /^(data:image\/(jpeg|png|webp);base64,|https?:\/\/)/.test(p.photo) && p.photo.length < 400000 ? p.photo : '',
        x: Number.isFinite(Number(p.x)) && p.x !== '' && p.x != null ? clamp(num(p.x), 0, 600) : null,
        y: Number.isFinite(Number(p.y)) && p.y !== '' && p.y != null ? clamp(num(p.y), 0, 600) : null,
    };
}
// 효과 { hunger: +30 } — 아는 욕구 키만
export function fxOf(v) {
    const o = {};
    if (v && typeof v === 'object') for (const [k, n] of Object.entries(v)) { const kk = safeKey(k); if (kk && Number.isFinite(Number(n))) o[kk] = clamp(Number(n), -100, 100); }
    return o;
}
export function normBook(b) {
    const e = emptyBook();
    if (!b || typeof b !== 'object') return e;
    const w = b.world ?? {};
    e.world.genre = line(w.genre, 60);
    e.world.summary = line(w.summary, 400); // 🌍 세계관 요약 (2~3문장 · 보기 · 미트볼 AI 호출용 · 본편엔 안 감)
    e.world.rules = list(w.rules, 6); // 📏 이 세계 규칙 (짧게)
    e.world.currency = line(w.currency, 16) || '골드';
    e.world.meal = Math.max(1, num(w.meal, 10));
    e.world.fx = { rate: Math.max(0, num(w.fx?.rate, 0)), unit: line(w.fx?.unit, 8) || '원' };
    e.world.weather = list(w.weather, 6).length ? list(w.weather, 6) : e.world.weather;
    const c = w.start?.cal ?? {};
    const months = arr(c.months).map(x => ({ name: line(x?.name, 10), days: clamp(num(x?.days, 30), 1, 60) })).filter(x => x.name).slice(0, 24);
    const cal = { months: months.length ? months : null, week: arr(c.week).map(x => line(x, 6)).filter(Boolean).slice(0, 10), era: line(c.era, 12), style: ['', '24', '12'].includes(c.style) ? c.style : '24' };
    if (!cal.week.length) cal.week = null;
    e.world.start = { y: num(w.start?.y, 2026), m: clamp(num(w.start?.m, 3), 1, months.length || 12), d: clamp(num(w.start?.d, 1), 1, months.length ? months[clamp(num(w.start?.m, 1), 1, months.length) - 1].days : 31), clock: clamp(num(w.start?.clock, 480), 0, 1439), cal };
    e.world.places = arr(w.places).map(normPlace).filter(Boolean).slice(0, LIMIT.places);
    e.world.itemFx = Object.fromEntries(Object.entries(w.itemFx && typeof w.itemFx === 'object' ? w.itemFx : {}).map(([k, v]) => [safeKey(k), fxOf(v)]).filter(([k]) => k).slice(0, 60));
    const me = b.me ?? {};
    e.me.name = line(me.name, 30);
    e.me.traits = line(me.traits);
    e.me.day = line(me.day, 24);
    const needs = arr(me.needs)
        .map((n) => ({
            key: safeKey(n?.key) || safeKey(n?.name),
            name: line(n?.name, 16),
            icon: line(n?.icon, 4) || '•',
            start: clamp(num(n?.start, 80), 0, 100),
            rate: clamp(num(n?.rate, 2), 0, 50),
            sym: n?.sym && typeof n.sym === 'object' ? { 주의: line(n.sym.주의, 120), 위험: line(n.sym.위험, 120) } : null,
        }))
        .filter((n) => n.key && n.name)
        .slice(0, 5);
    if (needs.length) e.me.needs = needs;
    if (Array.isArray(me.gauges))
        e.me.gauges = me.gauges
            .map((g) => ({
                key: safeKey(g?.key) || safeKey(g?.name),
                name: line(g?.name, 16),
                max: Math.max(1, num(g?.max, 100)),
                start: num(g?.start, num(g?.max, 100)),
                desc: line(g?.desc, 120),
                color: /^#[0-9a-f]{6}$/i.test(g?.color ?? '') ? g.color : '#e5484d',
            }))
            .filter((g) => g.key && g.name)
            .slice(0, 4);
    if (Array.isArray(me.attrs)) e.me.attrs = me.attrs.map(a => ({ name: line(a?.name, 6), v: clamp(num(a?.v), -5, 10) })).filter(a => a.name).slice(0, 6);
    e.people = arr(b.people).map(normPerson).filter(Boolean).slice(0, LIMIT.people);
    if (arr(b.stages).length >= 2) e.stages = arr(b.stages).map(s => ({ at: clamp(num(s?.at), 0, 100), name: line(s?.name, 10), call: line(s?.call, 40), act: line(s?.act, 100) })).filter(s => s.name).sort((a, b2) => a.at - b2.at);
    e.src = { from: line(b.src?.from, 10) || 'user', at: num(b.src?.at), sig: b.src?.sig && typeof b.src.sig === 'object' ? b.src.sig : {} };
    return e;
}
// 이름 → 인물 (별칭 · 띄어쓰기 · 대소문자 무시)
export function personOf(book, name) {
    const n = norm(name);
    if (!n) return null;
    return arr(book?.people).find(p => norm(p.name) === n || p.aka.some(a => norm(a) === n)) ?? null;
}
export function placeOf(book, name) {
    const n = norm(name);
    return arr(book?.world?.places).find(p => norm(p.name) === n) ?? null;
}
// 설정집 글 (미트볼 AI 호출에만 붙인다) — 짧은 키 줄
export function bookText(book, who = null) {
    if (!book) return '';
    const w = book.world;
    const L = [...(w.summary ? [`[SETTING] ${w.summary}`] : []), ...(w.rules?.length ? [`[RULES] ${w.rules.join(' · ')}`] : []), `[WORLD] ${w.genre || '-'} · money: ${w.currency} (${w.fx?.rate > 0 ? `1 ${w.currency} ≈ ${w.fx.rate}원 · ` : ''}meal ≈ ${w.meal}) · weather: ${w.weather.join('/')}`];
    if (w.places.length) L.push(`[PLACES] ${w.places.map(p => `${p.name}(${p.kind}${p.goods.length ? `: ${p.goods.map(g => `${g.name} ${g.price}`).join(', ')}` : ''})`).join(' · ')}`);
    L.push(`[ME] ${book.me.name || '{{user}}'}${book.me.traits ? ` · ${book.me.traits}` : ''} · needs: ${book.me.needs.map(n => n.name).join('/')}`);
    for (const p of book.people) {
        if (who && !who.includes(p.name)) continue;
        L.push(`[${p.name}] ${p.line}${p.noLove ? ' · (friendship only)' : ''}${p.up.length ? ` · +${p.up.map(a => a.act).join('/')}` : ''}`
            + `${p.down.length ? ` · -${p.down.map(a => a.act).join('/')}` : ''}${p.likes.length ? ` · likes ${p.likes.join('/')}` : ''}`
            + `${p.hates.length ? ` · hates ${p.hates.join('/')}` : ''}${p.want ? ` · wants: ${p.want}` : ''}`);
    }
    return L.join('\n');
}
export const bookTokens = (book) => tokens(bookText(book));
export const personTokens = (book, p) => tokens(bookText({ ...book, people: [p], world: { ...book.world, places: [] } })) - tokens(bookText({ ...book, people: [], world: { ...book.world, places: [] } }));

// 💞 모든 인물의 기본 행동: 설정집에 딱 맞는 행동이 없어도 큰일은 반영되게 (분류 모델 목록 · 계산 둘 다)
export const BASIC_ACTS = { up: { act: '기쁘게 함', d: 2 }, down: { act: '상처 줌', d: -3 } };

// ⭐ 주요 인물: 설정집에서 온 인물은 기본 ⭐ · 이야기 중 새로 나온 인물(npc)은 기본 아님 · 누르면 바뀜 (meta.stars)
//   ⭐만 자세히(카드 · 규칙 채우기 AI 1회) · 나머지는 이름 · 단계 · 애정만 가볍게
export function isStar(meta, book, name) {
    const v = meta?.stars?.[name];
    if (typeof v === 'boolean') return v;
    const p = personOf(book, name);
    return !!p && p.auto !== 'npc';
}
