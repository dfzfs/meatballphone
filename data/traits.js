// 🧬 특성 — 심즈 3 · 4의 특성 개념을 참고해 이 상태창의 계산에 맞게 새로 정리했다 (이름은 일반 단어 · 설명과 효과는 직접 씀)
//   효과 열쇠: dice { 능력치: n } · rate { 욕구: 배수 } · sleep · rest · workCost · food (배수) · price (배수) · aff · trust (오르는 폭 배수)
//              wx { 좋아하는 날씨 정규식 } · wxBad · luck: 'best' | 'worst' (운세 주사위 두 번) · crowd: +1 사람 많을 때 좋음 / −1 혼자일 때 좋음
//              neat: 위생이 낮으면 기분도 빨리 줄어듦 · buyMood: 살 때 기분 + · fumble: 대실패 범위 (1~n)
export const TRAIT_CATS = [['emo', '감정'], ['hobby', '취미'], ['life', '생활'], ['social', '사교']];
export const TRAITS = [
    // 감정
    { id: 'cheerful', cat: 'emo', icon: '😄', name: '명랑함', desc: '기분이 잘 안 꺾여요', rate: { mood: 0.7 } },
    { id: 'gloomy', cat: 'emo', icon: '🌧️', name: '우울함', desc: '기분이 쉽게 가라앉지만 비 오는 날은 편해요', rate: { mood: 1.3 }, wx: '비' },
    { id: 'hothead', cat: 'emo', icon: '😤', name: '다혈질', desc: '과감하지만 다투면 우정이 크게 깎여요', dice: { 힘: 1 }, trustDown: 1.4 },
    { id: 'brave', cat: 'emo', icon: '🦁', name: '용감함', desc: '위험 앞에서 물러서지 않아요', dice: { 힘: 1, 민첩: 1 } },
    { id: 'coward', cat: 'emo', icon: '🐭', name: '겁쟁이', desc: '위험한 판정에 약하지만 눈치가 빨라요', dice: { 힘: -1, 감각: 1 } },
    { id: 'emotional', cat: 'emo', icon: '🥺', name: '감수성 풍부', desc: '관계가 크게 오르고 크게 내려요', aff: 1.2, affDown: 1.2 },
    { id: 'stoic', cat: 'emo', icon: '🗿', name: '무덤덤', desc: '관계가 천천히 오르고 천천히 내려요', aff: 0.85, affDown: 0.7 },
    { id: 'lucky', cat: 'emo', icon: '🍀', name: '행운아', desc: '운세 주사위를 두 번 굴려 좋은 쪽', luck: 'best' },
    { id: 'unlucky', cat: 'emo', icon: '🐈‍⬛', name: '불운아', desc: '운세 주사위를 두 번 굴려 나쁜 쪽 · 대신 끈기 +1', luck: 'worst', dice: { 지능: 1 } },
    { id: 'calm', cat: 'emo', icon: '🧘', name: '침착함', desc: '대실패가 그냥 실패로 끝나요', noFumble: true },
    // 취미
    { id: 'foodie', cat: 'hobby', icon: '🍰', name: '미식가', desc: '맛있는 걸 먹으면 더 든든하고 기분도 좋아요', food: 1.3, foodMood: 4 },
    { id: 'glutton', cat: 'hobby', icon: '🍖', name: '먹보', desc: '배가 빨리 고파요', rate: { hunger: 1.3 } },
    { id: 'bookworm', cat: 'hobby', icon: '📚', name: '책벌레', desc: '머리 쓰는 판정에 강해요', dice: { 지능: 1 } },
    { id: 'active', cat: 'hobby', icon: '🏃', name: '활동적', desc: '몸 쓰는 판정에 강하지만 쉽게 지쳐요', dice: { 힘: 1 }, rate: { energy: 1.15 } },
    { id: 'artsy', cat: 'hobby', icon: '🎨', name: '예술가', desc: '감각이 예민해요', dice: { 감각: 1 } },
    { id: 'music', cat: 'hobby', icon: '🎧', name: '음악 애호가', desc: '곡이 흐르는 장면에선 기분이 잘 안 줄어요', bgmMood: 0.6 },
    { id: 'outdoor', cat: 'hobby', icon: '🌿', name: '자연 애호가', desc: '맑은 날 밖에 있으면 기분이 좋아요', wx: '맑' },
    { id: 'indoor', cat: 'hobby', icon: '🛋️', name: '집순이', desc: '집에선 금방 회복하지만 밖은 피곤해요', homeRest: 1.5, rate: { energy: 1.1 } },
    { id: 'cold', cat: 'hobby', icon: '❄️', name: '추위 좋아함', desc: '눈 오는 날 기운이 나요', wx: '눈|추', wxBad: '더' },
    { id: 'hot', cat: 'hobby', icon: '☀️', name: '더위 좋아함', desc: '더운 날 기운이 나요', wx: '더|맑', wxBad: '눈|추' },
    // 생활
    { id: 'neat', cat: 'life', icon: '🧽', name: '깔끔쟁이', desc: '씻지 못하면 기분까지 상해요', neat: true },
    { id: 'slob', cat: 'life', icon: '🧦', name: '털털함', desc: '위생이 천천히 줄어요', rate: { hygiene: 0.7 } },
    { id: 'sleeper', cat: 'life', icon: '😴', name: '잠꾸러기', desc: '자면 크게 회복돼요', sleep: 1.5 },
    { id: 'insomnia', cat: 'life', icon: '🦉', name: '예민한 잠', desc: '잠으로 덜 회복되지만 밤에 강해요', sleep: 0.8, dice: { 감각: 1 } },
    { id: 'workaholic', cat: 'life', icon: '💼', name: '일벌레', desc: '일해도 덜 지치고 더 벌어요', workCost: 0.7, workPay: 1.2 },
    { id: 'lazy', cat: 'life', icon: '🦥', name: '게으름', desc: '쉬면 잘 회복되지만 일은 힘들어요', rest: 1.5, workCost: 1.3 },
    { id: 'frugal', cat: 'life', icon: '🪙', name: '알뜰함', desc: '물건을 조금 싸게 사요', price: 0.9 },
    { id: 'shopaholic', cat: 'life', icon: '🛍️', name: '쇼핑 중독', desc: '물건을 사면 기분이 좋아요', buyMood: 5 },
    { id: 'clumsy', cat: 'life', icon: '🙃', name: '덤벙이', desc: '손재주 판정이 약하고 대실패가 잦아요', dice: { 민첩: -1 }, fumble: 2 },
    { id: 'genius', cat: 'life', icon: '🧠', name: '천재', desc: '머리가 아주 좋아요', dice: { 지능: 2 } },
    // 사교
    { id: 'charming', cat: 'social', icon: '✨', name: '매력덩이', desc: '말발이 좋고 호감을 잘 사요', dice: { 매력: 1 }, aff: 1.1 },
    { id: 'shy', cat: 'social', icon: '🙈', name: '수줍음', desc: '낯선 사람과는 천천히 · 가까워지면 깊어져요', shy: true },
    { id: 'romantic', cat: 'social', icon: '🌹', name: '로맨틱', desc: '애정이 잘 오르고 설렘이 잦아요', aff: 1.2 },
    { id: 'flirty', cat: 'social', icon: '😘', name: '바람둥이', desc: '애정은 잘 오르지만 질투를 부르기 쉬워요', aff: 1.15, jealousy: 1.5 },
    { id: 'jealous', cat: 'social', icon: '😒', name: '질투쟁이', desc: '질투가 생기면 관계가 더 흔들려요', jealousSelf: 1.5 },
    { id: 'loner', cat: 'social', icon: '🌙', name: '외톨이', desc: '혼자 있을 때 기분이 덜 줄어요', crowd: -1 },
    { id: 'outgoing', cat: 'social', icon: '🎉', name: '인싸', desc: '누군가와 있을 때 기분이 덜 줄어요', crowd: 1 },
    { id: 'kind', cat: 'social', icon: '🤍', name: '다정함', desc: '우정이 잘 쌓여요', trust: 1.2 },
    { id: 'mean', cat: 'social', icon: '😈', name: '못됨', desc: '우정은 덜 쌓이지만 기 싸움에 강해요', trust: 0.8, dice: { 매력: 1 } },
    { id: 'goofball', cat: 'social', icon: '🤡', name: '익살꾼', desc: '함께 있는 사람의 우정이 잘 올라요', trust: 1.1, crowd: 1 },
];
export const traitOf = (id) => TRAITS.find(t => t.id === id) ?? null;
// 특성끼리 궁합 (+ 좋음 / − 나쁨) — 같은 취미 특성은 좋음
const BAD = [['neat', 'slob'], ['hothead', 'hothead'], ['outgoing', 'loner'], ['kind', 'mean'], ['romantic', 'stoic'], ['jealous', 'flirty'], ['workaholic', 'lazy'], ['frugal', 'shopaholic'], ['cheerful', 'gloomy'], ['brave', 'coward'], ['indoor', 'outdoor'], ['cold', 'hot']];
const GOOD = [['romantic', 'romantic'], ['romantic', 'emotional'], ['kind', 'kind'], ['kind', 'shy'], ['goofball', 'cheerful'], ['bookworm', 'genius'], ['outgoing', 'goofball'], ['calm', 'hothead'], ['loner', 'loner'], ['charming', 'shy']];
const has = (L, a, b) => L.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
export function traitCompat(mine = [], theirs = []) {
    let s = 0; const why = [];
    for (const a of mine) for (const b of theirs) {
        if (has(BAD, a, b)) { s--; why.push(`${traitOf(a)?.name} ↔ ${traitOf(b)?.name}`); }
        else if (has(GOOD, a, b) || (a === b && traitOf(a)?.cat === 'hobby')) { s++; why.push(`${traitOf(a)?.name} ♥ ${traitOf(b)?.name}`); }
    }
    return { score: s, why };
}

// ♌ 별자리 — 생일(「3월 14일」)에서 · 원소 궁합
export const SIGNS = [
    ['염소자리', '♑', 'earth', 1, 19], ['물병자리', '♒', 'air', 2, 18], ['물고기자리', '♓', 'water', 3, 20], ['양자리', '♈', 'fire', 4, 19], ['황소자리', '♉', 'earth', 5, 20], ['쌍둥이자리', '♊', 'air', 6, 21],
    ['게자리', '♋', 'water', 7, 22], ['사자자리', '♌', 'fire', 8, 22], ['처녀자리', '♍', 'earth', 9, 22], ['천칭자리', '♎', 'air', 10, 23], ['전갈자리', '♏', 'water', 11, 22], ['사수자리', '♐', 'fire', 12, 21],
];
export const ELEMENT_KO = { fire: '불', earth: '흙', air: '공기', water: '물' };
// 별자리마다 어울리는 특성 (인물 특성을 자동으로 채울 때 하나 추천)
export const SIGN_TRAIT = { 양자리: 'brave', 황소자리: 'foodie', 쌍둥이자리: 'outgoing', 게자리: 'kind', 사자자리: 'charming', 처녀자리: 'neat', 천칭자리: 'romantic', 전갈자리: 'jealous', 사수자리: 'outdoor', 염소자리: 'workaholic', 물병자리: 'genius', 물고기자리: 'emotional' };
export function signOf(day) {
    const m = /(\d{1,2})\s*[월/.\-]\s*(\d{1,2})/.exec(String(day ?? '')); if (!m) return null;
    const mo = Number(m[1]), d = Number(m[2]); if (!(mo >= 1 && mo <= 12)) return null;
    // 각 별자리의 「끝나는 날」 표: 그 달의 끝 날 이전이면 그 별자리, 아니면 다음
    const i = SIGNS.findIndex(s => s[3] === mo), s = d <= SIGNS[i][4] ? SIGNS[i] : SIGNS[(i + 1) % 12];
    return { name: s[0], icon: s[1], el: s[2] };
}
export function signCompat(a, b) {
    if (!a || !b) return { mul: 1, word: '' };
    if (a.el === b.el) return { mul: 1.2, word: '아주 좋음' };
    const pair = [a.el, b.el].sort().join('-');
    if (pair === 'air-fire' || pair === 'earth-water') return { mul: 1.1, word: '좋음' };
    if (pair === 'fire-water' || pair === 'air-earth') return { mul: 0.85, word: '나쁨' };
    return { mul: 1, word: '보통' };
}

// ⭐ 야망 — 단계 목표 (지금 상태에서 저절로 확인 · AI 0회)
export const ASPIRES = [
    { id: 'lover', icon: '💘', name: '사랑꾼', desc: '누군가와 연인이 되기', steps: [20, 40, 60, 80], val: (S) => Math.max(0, ...Object.values(S.rel).filter(r => !r.gone).map(r => r.aff)), unit: '최고 애정' },
    { id: 'rich', icon: '💰', name: '부자', desc: '돈을 모으기', steps: [10, 30, 100, 300], scale: 'meal', val: (S) => S.cash, unit: '돈' },
    { id: 'popular', icon: '🌟', name: '인기인', desc: '친구 많이 사귀기', steps: [1, 2, 3, 5], val: (S) => Object.values(S.rel).filter(r => !r.gone && r.trust >= 40).length, unit: '친구' },
    { id: 'explorer', icon: '🧭', name: '탐험가', desc: '여러 곳 가 보기', steps: [2, 4, 6, 9], val: (S) => (S.visited ?? []).length, unit: '가 본 곳' },
    { id: 'gourmet', icon: '🍽️', name: '미식 여행', desc: '여러 음식 먹어 보기', steps: [2, 4, 7, 10], val: (S) => (S.tasted ?? []).length, unit: '먹어 본 음식' },
    { id: 'collector', icon: '🧺', name: '수집가', desc: '여러 물건 모으기', steps: [3, 5, 8, 12], val: (S) => S.items.length, unit: '물건 종류' },
];
export const aspireOf = (id) => ASPIRES.find(a => a.id === id) ?? null;
export function aspireSteps(a, book) { return a.scale === 'meal' ? a.steps.map(x => x * (book.world.meal || 10)) : a.steps; }
