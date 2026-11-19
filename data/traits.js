// 🧬 특성 — 심즈 3 · 4의 특성 개념을 참고해 이 상태창 계산에 맞게 새로 정리 (이름은 일반 단어 · 설명과 효과는 직접 씀)
//   주사위 · 관계 오르는 폭 · 증상(욕구가 줄어드는 속도)에 실제로 쓰이는 효과만 둔다.
//   효과 열쇠: dice { 능력치: n }       판정 보정
//              rate { 욕구: 배수 }      욕구가 줄어드는 속도 (증상이 빨리 · 늦게 옴)
//              aff · affDown · trust · trustDown   애정 · 우정이 오르는 / 깎이는 폭 배수
//              early · late           애정 60 전 / 후에 오르는 폭 배수
//              one                    가장 가까운 한 사람에게 애정 배수
//              shy                    낯설 땐 덜, 가까워지면 더 오름
//              jealousy · jealousSelf 질투가 생길 때 우정이 깎이는 폭 배수
//              wx                     좋아하는 날씨(정규식) — 그날 판정 +1
//              luck: 'best' | 'worst' 오늘 운세 주사위를 두 번 굴려 좋은 / 나쁜 쪽
//              noFumble · fumble      대실패 없음 / 대실패 1~n
//              when                   (나만의 특성) 이 조건일 때만 켜짐
export const TRAIT_CATS = [['emo', '감정'], ['love', '연애'], ['social', '사교'], ['life', '취미 · 생활']];
const T = (cat, id, icon, name, desc, fx = {}) => ({ id, cat, icon, name, desc, ...fx });
export const TRAITS = [
    // 감정 (10)
    T('emo', 'cheerful', '😄', '명랑함', '웬만한 일은 웃어넘겨요. 기분이 쉽게 꺾이지 않아요', { rate: { mood: 0.75 } }),
    T('emo', 'gloomy', '🌧️', '우울함', '세상이 늘 조금 흐려 보여요. 대신 비 오는 날엔 마음이 놓여요', { rate: { mood: 1.25 }, wx: '비' }),
    T('emo', 'hothead', '😤', '다혈질', '참을성이 짧고 일단 부딪쳐요. 다투면 우정이 크게 깎여요', { dice: { 힘: 1 }, trustDown: 1.4, rate: { mood: 1.1 } }),
    T('emo', 'calm', '🧘', '침착함', '어떤 상황에서도 손이 떨리지 않아요. 대실패가 없어요', { noFumble: true }),
    T('emo', 'emotional', '🥹', '감수성 풍부', '마음이 쉽게 움직여요. 애정이 잘 오르고, 상처도 크게 받아요', { aff: 1.2, affDown: 1.2 }),
    T('emo', 'stoic', '🗿', '무덤덤', '감정이 잘 드러나지 않아요. 애정이 느리게 오르고 덜 깎여요', { aff: 0.85, affDown: 0.7 }),
    T('emo', 'brave', '🦁', '용감함', '겁먹을 일에도 먼저 나서요', { dice: { 힘: 1, 민첩: 1 } }),
    T('emo', 'coward', '🐭', '겁쟁이', '힘으로는 약하지만, 위험을 먼저 알아채요', { dice: { 힘: -1, 감각: 1 } }),
    T('emo', 'lucky', '🍀', '행운아', '오늘 운세 주사위를 두 번 굴려 좋은 쪽을 가져요', { luck: 'best' }),
    T('emo', 'unlucky', '🐈‍⬛', '불운아', '운세는 두 번 굴려 나쁜 쪽 · 대신 머리로 버텨서 지능 판정 +1', { luck: 'worst', dice: { 지능: 1 } }),
    // 연애 (6)
    T('love', 'romantic', '🌹', '로맨틱', '사랑에 진심이에요. 애정이 잘 오르고, 가까워질수록 더 깊어져요', { aff: 1.2, late: 1.1 }),
    T('love', 'flirty', '😘', '바람둥이', '누구에게나 다정해요. 애정은 잘 오르지만 질투를 쉽게 사요', { aff: 1.15, jealousy: 1.5 }),
    T('love', 'noncommittal', '🕊️', '구속 싫음', '처음엔 쉽게 다가가지만, 깊어질수록 한 발 물러나요', { early: 1.15, late: 0.6 }),
    T('love', 'loyal', '💍', '일편단심', '마음을 준 한 사람에게만 애정이 더 쌓여요', { one: 1.25 }),
    T('love', 'unflirty', '🧱', '철벽', '연애엔 벽이 높지만, 우정은 단단히 쌓아요', { aff: 0.75, trust: 1.2 }),
    T('love', 'jealous', '💢', '질투쟁이', '질투가 생기면 우정이 크게 깎여요', { jealousSelf: 1.5 }),
    // 사교 (6)
    T('social', 'charming', '✨', '매력덩이', '말 한마디로 분위기를 잡아요. 매력 판정 +1, 애정이 조금 잘 올라요', { dice: { 매력: 1 }, aff: 1.1 }),
    T('social', 'shy', '🙈', '수줍음', '낯설 땐 말을 아끼지만, 가까워지면 마음이 활짝 열려요', { shy: true }),
    T('social', 'kind', '🤗', '다정함', '누구에게나 따뜻해요. 우정이 잘 쌓여요', { trust: 1.2 }),
    T('social', 'mean', '😈', '못됨', '말이 날카로워요. 우정은 덜 쌓이지만 기 싸움엔 강해요', { trust: 0.8, dice: { 매력: 1 } }),
    T('social', 'bro', '🤜', '의리파', '친구는 끝까지 챙겨요. 우정이 잘 쌓이고 잘 안 깎여요', { trust: 1.2, trustDown: 0.7, aff: 0.9 }),
    T('social', 'perceptive', '👁️', '눈치 백단', '말하지 않아도 알아채요. 감각 판정 +1', { dice: { 감각: 1 } }),
    // 취미 · 생활 (8)
    T('life', 'bookworm', '📚', '책벌레', '모르는 게 있으면 찾아봐야 직성이 풀려요. 지능 판정 +1', { dice: { 지능: 1 } }),
    T('life', 'genius', '🧠', '천재', '머리 회전이 남달라요. 지능 판정 +2', { dice: { 지능: 2 } }),
    T('life', 'active', '🏃', '활동적', '가만히 있질 못해요. 힘 판정 +1, 대신 쉽게 지쳐요', { dice: { 힘: 1 }, rate: { energy: 1.15 } }),
    T('life', 'artsy', '🎨', '예술가', '보고 듣는 게 섬세해요. 감각 판정 +1', { dice: { 감각: 1 } }),
    T('life', 'glutton', '🍙', '먹보', '배가 금방 꺼져요', { rate: { hunger: 1.3 } }),
    T('life', 'slob', '🧦', '털털함', '좀 지저분해도 신경 안 써요. 위생 걱정이 늦게 와요', { rate: { hygiene: 0.7 } }),
    T('life', 'perfectionist', '📐', '완벽주의', '작은 것도 놓치지 않아요. 감각 판정 +1, 대신 쉽게 예민해져요', { dice: { 감각: 1 }, rate: { mood: 1.1 } }),
    T('life', 'clumsy', '🫠', '덤벙이', '손이 먼저 나가요. 민첩 판정 −1, 대실패가 1~2', { dice: { 민첩: -1 }, fumble: 2 }),
];
// 지운 특성 → 가장 가까운 남은 특성 (없으면 조용히 뺌)
export const OLD_TRAIT = {
    selfassured: 'charming', partyanimal: 'charming', schmoozer: 'charming', outgoing: 'charming', irresistible: 'flirty',
    neurotic: 'perceptive', insomnia: 'perceptive', excitable: 'cheerful', childish: 'cheerful', grumpy: 'gloomy',
    hopeless: 'romantic', kisser: 'romantic', awkward: 'shy', loner: 'shy', good: 'kind', goofball: 'kind', generous: 'kind',
    evil: 'mean', snob: 'mean', mooch: 'mean', kleptomaniac: 'mean', geek: 'bookworm', athletic: 'active', adventurous: 'active', dancer: 'active',
    couch: 'slob', indoor: 'slob', lazy: 'slob', sleeper: 'slob', music: 'artsy', foodie: 'glutton', absent: 'clumsy',
    neat: 'perfectionist', squeamish: 'perfectionist', workaholic: 'perfectionist', ambitious: 'perfectionist',
};
export const migrateTraitId = (id) => (TRAITS.some(t => t.id === id) || /^c_[a-z0-9]{2,12}$/.test(String(id)) ? id : OLD_TRAIT[id] ?? null);
export const migrateTraitIds = (ids, max = 3) => [...new Set((Array.isArray(ids) ? ids : []).map(migrateTraitId).filter(Boolean))].slice(0, max);

// 🛠 나만의 특성: 좋은 효과 하나 + (세게 하려면) 대가 하나 또는 조건
export const CUSTOM_FX = [
    { id: 'mood', name: '기분이 잘 안 꺾임', make: (p) => ({ rate: { mood: p > 1 ? 0.7 : 0.85 } }) },
    { id: 'energy', name: '잘 안 지침', make: (p) => ({ rate: { energy: p > 1 ? 0.75 : 0.88 } }) },
    { id: 'hunger', name: '배가 덜 고픔', make: (p) => ({ rate: { hunger: p > 1 ? 0.75 : 0.88 } }) },
    { id: 'hygiene', name: '잘 안 더러워짐', make: (p) => ({ rate: { hygiene: p > 1 ? 0.7 : 0.85 } }) },
    { id: 'dice', name: '판정 보너스', attr: true, make: (p, a) => ({ dice: { [a || '매력']: p > 1 ? 2 : 1 } }) },
    { id: 'aff', name: '애정이 잘 오름', make: (p) => ({ aff: p > 1 ? 1.2 : 1.1 }) },
    { id: 'trust', name: '우정이 잘 쌓임', make: (p) => ({ trust: p > 1 ? 1.2 : 1.1 }) },
];
export const CUSTOM_CON = [
    { id: '', name: '없음', make: () => ({}) },
    { id: 'moodfast', name: '기분이 빨리 줄어듦', make: () => ({ rate: { mood: 1.2 } }) },
    { id: 'tired', name: '쉽게 지침', make: () => ({ rate: { energy: 1.15 } }) },
    { id: 'hungry', name: '배가 빨리 고픔', make: () => ({ rate: { hunger: 1.15 } }) },
    { id: 'clumsy', name: '대실패 잦음', make: () => ({ fumble: 2 }) },
    { id: 'cold', name: '우정이 덜 쌓임', make: () => ({ trust: 0.9 }) },
];
export const WHEN = [['always', '항상'], ['alone', '혼자일 때'], ['with', '누군가와 있을 때'], ['night', '밤 (20~6시)'], ['day', '낮 (6~20시)'], ['wet', '비 · 눈 오는 날'], ['home', '집에서'], ['out', '밖에서'], ['low', '욕구가 낮을 때']];
export const CUSTOM_MAX = 6;
// 효과 합치기: dice는 더하고 · 배수는 곱하고 · fumble은 큰 쪽
const mergeFx = (...L) => L.reduce((o, x) => {
    for (const [k, v] of Object.entries(x)) {
        if (v && typeof v === 'object') {
            o[k] = { ...(o[k] ?? {}) };
            for (const [s, n] of Object.entries(v)) o[k][s] = k === 'dice' ? (o[k][s] ?? 0) + n : (o[k][s] ?? 1) * n;
        } else if (typeof v === 'number' && k !== 'fumble') o[k] = (o[k] ?? 1) * v;
        else o[k] = typeof v === 'number' ? Math.max(o[k] ?? 0, v) : v;
    }
    return o;
}, {});
// 저장된 정의 → 정리 (이상한 값은 버림 · 조건 규칙 지키기)
export function normCustomTrait(c) {
    if (!c || typeof c !== 'object') return null;
    const name = String(c.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 10); if (!name) return null;
    const fx = CUSTOM_FX.find(f => f.id === c.fx) ?? CUSTOM_FX[0], con = CUSTOM_CON.find(f => f.id === c.con) ?? CUSTOM_CON[0];
    const when = WHEN.some(([w]) => w === c.when) ? c.when : 'always';
    let pow = c.pow === 2 ? 2 : 1; if (pow === 2 && when === 'always' && !con.id) pow = 1; // 조건 없이 「강」은 못 씀
    const id = /^c_[a-z0-9]{2,12}$/.test(c.id ?? '') ? c.id : `c_${Math.random().toString(36).slice(2, 8)}`;
    return {
        id, name, icon: String(c.icon ?? '').trim().slice(0, 4) || '🔖', desc: String(c.desc ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
        fx: fx.id, pow, attr: fx.attr ? (String(c.attr ?? '').trim().slice(0, 6) || '매력') : '', con: con.id, when,
    };
}
const buildCustom = (c) => ({
    id: c.id, cat: 'custom', custom: true, icon: c.icon, name: c.name, desc: c.desc || '나만의 특성', when: c.when,
    ...mergeFx(CUSTOM_FX.find(f => f.id === c.fx).make(c.pow, c.attr), CUSTOM_CON.find(f => f.id === c.con).make()),
});
let CUSTOM = [], customRef = null;
// 설정집의 커스텀 특성을 목록에 올린다 (같은 배열이면 건너뜀)
export function syncCustomTraits(list) {
    if (list === customRef) return; customRef = list;
    CUSTOM = (Array.isArray(list) ? list : []).map(normCustomTrait).filter(Boolean).map(buildCustom);
}
export const customTraits = () => CUSTOM;
export const traitOf = (id) => TRAITS.find(t => t.id === id) ?? CUSTOM.find(t => t.id === id) ?? null;

// 한 사람이 같이 가질 수 없는 특성 (심즈처럼)
const CONFLICT = [
    ['cheerful', 'gloomy'], ['brave', 'coward'], ['calm', 'hothead'], ['stoic', 'emotional'], ['lucky', 'unlucky'],
    ['romantic', 'unflirty'], ['loyal', 'noncommittal'], ['loyal', 'flirty'], ['kind', 'mean'], ['charming', 'shy'],
    ['perfectionist', 'slob'], ['perfectionist', 'clumsy'], ['genius', 'clumsy'],
];
export function conflictOf(id, mine = []) {
    for (const m of mine) if (CONFLICT.some(([a, b]) => (a === id && b === m) || (a === m && b === id))) return m;
    return null;
}

// ───── 특성끼리 궁합 ─────
// 💗 애정(aff) 축과 🤝 우정(trust) 축을 따로 센다
//   GOOD: 둘 다 + · FRIEND: 우정만 + · BAD: 둘 다 − · OPP(반대가 끌림): 애정 + / 우정 − (설렘은 크지만 생활은 부딪침)
const BAD = [['romantic', 'stoic'], ['hothead', 'hothead'], ['jealous', 'flirty'], ['loyal', 'flirty'], ['perfectionist', 'clumsy'], ['mean', 'mean'], ['unflirty', 'flirty']];
const GOOD = [
    ['romantic', 'romantic'], ['romantic', 'emotional'], ['kind', 'kind'], ['kind', 'shy'], ['bookworm', 'genius'], ['bookworm', 'bookworm'],
    ['calm', 'stoic'], ['charming', 'shy'], ['loyal', 'loyal'], ['active', 'brave'], ['artsy', 'emotional'], ['glutton', 'cheerful'],
];
const FRIEND = [['bro', 'bro'], ['bro', 'kind'], ['perceptive', 'calm'], ['cheerful', 'cheerful']];
// 반대가 끌리는 이유 — 궁합 화면에 그대로 보여 준다
const OPP = [
    ['perfectionist', 'slob', '정돈된 사람은 풀어진 여유가, 털털한 사람은 단단한 질서가 신기해요'],
    ['cheerful', 'gloomy', '햇살은 빗소리에 쉬고, 빗소리는 햇살에 웃어요'],
    ['brave', 'coward', '지켜 주고 싶은 마음과 기대고 싶은 마음이 딱 맞물려요'],
    ['kind', 'mean', '모두에게 못된 사람이 나한테만 다정할 때'],
    ['stoic', 'emotional', '잔잔한 호수에 파도가 치면 — 처음 보는 표정이 나와요'],
    ['romantic', 'unflirty', '철벽일수록 녹이고 싶어지고, 꾸준함에 결국 금이 가요'],
    ['calm', 'hothead', '불같은 사람이 아무리 두드려도 꿈쩍 않는 사람에게 끌려요'],
    ['charming', 'shy', '확신에 찬 사람이 수줍은 사람의 속도를 기다려 줄 때'],
    ['genius', 'clumsy', '머리는 빠른데 손이 느린 사람, 손이 먼저 나가는 사람'],
];
const pairIn = (L, a, b) => L.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
export function traitCompat(mine = [], theirs = []) {
    let aff = 0, trust = 0; const why = [], opp = [];
    for (const a of mine) for (const b of theirs) {
        const ta = traitOf(a), tb = traitOf(b); if (!ta || !tb) continue;
        const o = pairIn(OPP, a, b);
        if (o) { aff++; trust--; why.push(`${ta.name} ⇄ ${tb.name}`); opp.push({ a: ta, b: tb, text: o[2] }); }
        else if (pairIn(BAD, a, b)) { aff--; trust--; why.push(`${ta.name} ↔ ${tb.name}`); }
        else if (pairIn(GOOD, a, b)) { aff++; trust++; why.push(`${ta.name} ♥ ${tb.name}`); }
        else if (pairIn(FRIEND, a, b)) { trust++; why.push(`${ta.name} 🤝 ${tb.name}`); }
    }
    return { score: aff, aff, trust, why, opp };
}
