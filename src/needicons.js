// 🎨 욕구 그림 · 분류 (v2.9) — 다른 파일을 하나도 안 불러오는 순수한 조각이라 HUD 타일(tiles.js)에서도 그대로 쓴다. 화면 · 행동은 life.js
// 게이지 이름 → 무슨 욕구인지 (이미 있는 게이지에 얹을 때 · 상점 품목을 고를 때)
export const KIND = [
    ['hunger', /허기|배고|포만|hunger|satiety/i], ['thirst', /갈증|수분|thirst|hydrat/i], ['fatigue', /피로|fatigue/i], ['energy', /에너지|기력|수면|졸음|energy|sleep/i],
    ['hygiene', /위생|청결|hygiene/i], ['boredom', /지루|boredom/i], ['fun', /재미|즐거|\bfun\b/i], ['social', /사교|외로|social|lonel/i], ['stress', /스트레스|stress/i],
    ['sanity', /정신|이성|멘탈|sanity|mental/i], ['fear', /공포|두려|fear|panic/i], ['warmth', /체온|온기|warmth|temperature/i], ['mp', /마나|마력|\bmp\b|mana/i], ['stamina', /스태미나|지구력|stamina/i], ['hp', /체력|생명|\bhp\b|health/i],
];
export const kindOf = (name) => KIND.find(([, re]) => re.test(String(name)))?.[0] ?? '';
export const RISING = new Set(['fatigue', 'boredom', 'stress', 'fear']); // 높을수록 나쁜 것 (0에서 시작)
export const svg = (d, cls = 'ss-ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
    hunger: '<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M9 4c-1 1.5 1 2.5 0 4M13 3c-1 1.5 1 2.5 0 4"/><path d="M8.5 20.5h7"/>',
    thirst: '<path d="M12 3c3.5 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.5 6-11z"/><path d="M9.5 14.5A2.5 2.5 0 0 0 12 17"/>',
    energy: '<path d="M13 2 5 13.5h6L10 22l9-12.5h-6z"/>',
    fatigue: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/><path d="M15 3.5h4l-4 4h4"/>',
    hygiene: '<path d="M3.5 11h17v2a6 6 0 0 1-6 6h-5a6 6 0 0 1-6-6z"/><path d="M6 11V6.5a2 2 0 0 1 4 0"/><circle cx="15" cy="6" r="1.1"/><circle cx="18.6" cy="8" r=".8"/><path d="M8 19l-1 2M16 19l1 2"/>',
    fun: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r=".9"/><circle cx="15" cy="15" r=".9"/><circle cx="15" cy="9" r=".9"/><circle cx="9" cy="15" r=".9"/><circle cx="12" cy="12" r=".9"/>',
    boredom: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    social: '<path d="M4 5h9a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H9l-3 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M18 10h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v2.5L16.5 17H13"/>',
    stress: '<path d="M7 16a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9.5 3.5 3.5 0 0 1 17.5 16"/><path d="M13 13l-2 3.5h3L12 20"/>',
    sanity: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    fear: '<path d="M5 21V10a7 7 0 0 1 14 0v11l-2.3-2-2.3 2-2.4-2-2.3 2-2.4-2z"/><circle cx="9.5" cy="10.5" r="1"/><circle cx="14.5" cy="10.5" r="1"/>',
    warmth: '<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 17.5v-6"/>',
    mp: '<path d="M10 3h4M10.5 3v5L6 17a3 3 0 0 0 2.7 4h6.6A3 3 0 0 0 18 17l-4.5-9V3"/><path d="M8 15h8"/>',
    stamina: '<path d="M3 16c3 0 4.5-2 5.5-5l2.5 2c1.5 1 3.5 1.6 6 2 2 .3 4 1 4 3H3z"/><path d="M3 19.500h18"/>',
    hp: '<path d="M12 20.500S3.5 15.5 3.5 9.200A4.7 4.7 0 0 1 12 6.600a4.7 4.7 0 0 1 8.5 2.600c0 6.3-8.5 11.3-8.5 11.300z"/>',
    other: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.500M12 16h.01"/>',
};
export const needIcon = (name, cls) => svg(ICON[kindOf(name)] ?? ICON.other, cls);
// 0~1: 1이 좋은 쪽 (높을수록 나쁜 게이지는 뒤집어서)
export const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));
export const goodOf = (b) => { const p = clamp01(b.cur / Math.max(1, b.max)); return RISING.has(kindOf(b.name)) || /\+\s*:/.test(b.stages ?? '') ? 1 - p : p; };
export const lvOf = (g) => (g > 0.6 ? 'ok' : g > 0.3 ? 'mid' : 'low');
