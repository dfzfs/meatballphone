// 💭 속마음 설정 표 (v2.10) — 다른 파일을 안 불러오는 순수한 조각 (engine · ai · mind · tiles · life가 같이 쓴다)
//   · 누가: cast(장면 속 인물) · watch(관전자 — 이야기 밖에서 이 채팅을 보는 사람들)
//   · 관전자 컨셉(WATCH) 여러 개를 골라 두면 턴마다 1~2명이 랜덤으로 한마디
//   · 어조(TONES) · 보는 방식(MIND_FMT) · 카모지 꾸러미(KAOMOJI)
//   · 속마음 글 → 도트 인형 표정 (faceOfMind) — 다른 인물 인형이 「기분 따라」 표정을 바꾼다

// 관전자 컨셉: nick = AI가 이름 칸에 적을 이름 (비어 있으면 AI가 장면에 맞게 정함) · p = AI에게 주는 설명
export const WATCH = {
    fan: { icon: '💖', name: '열성팬', nick: '열성팬', desc: '{{user}}와 이 이야기를 너무 사랑하는 팬 — 비명 · 영업 · 과몰입', p: 'a devoted superfan watching this story live — screams, ships, overreacts with love, cheers {{user}} on' },
    anti: { icon: '👎', name: '안티팬', nick: '안티', desc: '꼬투리만 잡는 안티 — 비꼬기 · 트집 · 짜게 식음', p: 'an anti-fan who only watches to nitpick and sneer at {{user}} and the characters — petty, salty, never impressed' },
    writer: { icon: '✍️', name: '공동작가', nick: '공동작가', desc: '이 채팅을 전부 자기가 쓰고 있다고 믿는 작가 — 복선 · 후회 · 다음 화 예고', p: 'the co-author who is secretly writing this entire chat — comments on their own plot choices, plants foreshadowing, regrets a line, smugly hints at what comes next (never spells out the plan)' },
    by: { icon: '👀', name: '주변인', nick: '', desc: '장면 근처에 우연히 있던 아무개 — 행인 · 점원 · 담 위 고양이…', p: 'a random ordinary bystander physically near this scene in this world who just happened to see it (pick a fitting one each time: a passerby, a shopkeeper, the cat on the wall, a guard, a kid…) — use that short label as the name' },
    cells: { icon: '🧠', name: '세포들', nick: '', desc: '{{user}} 머릿속에 사는 세포들 — 성격 제각각, 고른 세포 중 1~2마리가 튀어나와요', cells: true, p: '' },
    chat: { icon: '💬', name: '실시간 채팅', nick: '', desc: '방송 채팅창처럼 시청자들이 우르르 — ㅋㅋ · 도배 · 드립', p: 'one viewer in a live-stream chat watching this story as a broadcast — use a random short viewer nickname (like 감자튀김123, 새벽세시) and chat-style reaction' },
};
export const WATCH_IDS = Object.keys(WATCH);

// 🧠 세포들: {{user}} 머릿속 세포 — 「세포들」을 켜면 그 턴에 여기서 고른 것 중 1~2마리가 말한다 (이름 = 세포 이름 그대로)
const CELL_P = (x) => `one of the little brain cells living inside {{user}}'s head, reacting to what just happened to {{user}} — ${x}. Always stays in character as the cell — never talks like an assistant`;
export const CELLS = {
    jjogae: { icon: '😏', color: '#ffd36e', face: 'smirk', name: '쪼개세포', desc: '무조건 쪼개면서 돌려까는 애', p: CELL_P('always snickering (ㅋㅋ, 큭큭) while making a backhanded, roundabout dig — never says it straight') },
    yok: { icon: '🤬', color: '#ff8a7a', face: 'angry', name: '욕세포', desc: '일단 욕부터 박는 애', p: CELL_P('swears first and thinks later (씨, 아 미친, ㅅㅂ) — angry at the situation, never slurs') },
    woo: { icon: '🌧️', color: '#a9b7d6', face: 'gloom', name: '우울세포', desc: '뭘 해도 비관하는 애', p: CELL_P('gloomy and defeatist, sees the worst in everything, sighs a lot (하아…, 어차피, 망했어)') },
    sul: { icon: '💓', color: '#ffb3cf', face: 'love', name: '설렘세포', desc: '사소한 것에도 심쿵하는 애', p: CELL_P('melts over the tiniest thing, overreacts with heart-fluttering (헉 심장, 미쳤다 설레)') },
    jijeok: { icon: '🧐', color: '#c9e88a', face: 'nerd', name: '지적세포', desc: '뭐만 하면 AI 문장 표현 지적하는 애', p: CELL_P('a grumpy editor cell who roasts the PROSE of this reply every time — clichés, AI-isms (숨을 들이켰다, 입꼬리가 올라갔다, 공기가 무거워졌다, 한 박자 늦게), repeated words, weird metaphors. Quote the offending 2-6 word phrase from the latest reply and mock it — if there is no prose to roast yet, grumble in character about the scene instead (never ask the user to write something)') },
    bul: { icon: '😰', color: '#c6b4f0', face: 'worry', name: '불안세포', desc: '최악의 시나리오만 그리는 애', p: CELL_P('anxious, instantly imagines the worst-case scenario (이러다 차이는 거 아냐?)') },
    isung: { icon: '🤓', color: '#9fd8e8', face: 'calm', name: '이성세포', desc: '혼자 냉철한 척 분석하는 애', p: CELL_P('the cold, logical one who coolly analyses and tells the others to calm down') },
    mukbo: { icon: '🍙', color: '#ffc89a', face: 'yum', name: '먹보세포', desc: '무슨 상황이든 배고픈 애', p: CELL_P('only cares about food no matter what is happening') },
    noi: { icon: '🌀', color: '#d8a6f2', face: 'swirl', name: '뇌절세포', desc: '망상 폭주하는 애', p: CELL_P('jumps to wild delusional conclusions (벌써 결혼식장 잡음)') },
    jam: { icon: '😴', color: '#cfd6dd', face: 'sleep', name: '잠세포', desc: '다 귀찮고 졸린 애', p: CELL_P('sleepy and can\'t be bothered with anything (몰라 자고 싶어)') },
};
export const CELL_DEF = ['jjogae', 'yok', 'woo', 'sul', 'jijeok'];

// 어조 (관전자에게 걸린다 · 「인물에게도」를 켜면 인물 속마음에도)
export const TONES = {
    none: { name: '기본', p: '' },
    aegyo: { name: '애교체', p: 'cutesy aegyo speech (~용, 히잉, 뿌잉, 했쪄, 몰라몰라)' },
    perv: { name: '변태체', p: 'a leering, sleazy pervert-ish tone (흐흐흐, 츄릅, 음흉하게 · 능글맞게) — innuendo and leering only, never more explicit than the story itself' },
    swear: { name: '욕설', p: 'foul-mouthed casual swearing (씨, 존나, 미친, ㅅㅂ, 개-) aimed at the situation — never slurs' },
    tsun: { name: '츤데레', p: 'tsundere (흥, 딱히 너를 위해서 그런 건 아니거든)' },
    cynic: { name: '시니컬', p: 'dry, deadpan, sarcastic' },
    net: { name: '인터넷체', p: 'online community slang (ㅋㅋ, ㄹㅇ, ㅇㅈ, 실화냐, 미쳤다 진짜, ㅠㅠ)' },
    dialect: { name: '사투리', p: 'thick Korean dialect (pick Gyeongsang or Jeolla once and keep it)' },
    chuuni: { name: '중2병', p: 'chuunibyou dark-hero drama (크큭, 봉인된 오른팔이 욱신거린다)' },
    butler: { name: '존댓말 집사', p: 'an overly polite butler using heavy honorifics' },
    elder: { name: '노년체', p: 'an elderly person\'s warm, old-fashioned speech (아이고, 그래그래, 밥은 먹었니, 허허)' },
    ajae: { name: '아재개그', p: 'groan-worthy dad-joke puns' },
    custom: { name: '직접 쓰기', p: '' },
};

// 보는 방식
export const MIND_NAMES = { off: '끔', thought: '속마음 글', emoji: '이모티콘', kaomoji: '카모지', mix: '글 + 카모지' };
export const SHORT_RULE = 'a SHORT blunt reaction like a muttered aside — 2 to 8 words, one breath. Good: "뭐하자는 건지 모르겠네" / "…또 저러네" / "아 귀엽네 진짜". NEVER literary monologue or narration like "그녀는 꼭 이런 식으로 나를 힘들게 한다" — no third person, no explaining feelings, no name, no numbers';
export const MIND_FMT = {
    thought: SHORT_RULE,
    emoji: '1-3 emoji that show the true feeling right now (emoji only, no words)',
    kaomoji: 'ONE kaomoji that shows the true feeling right now — kaomoji only, no words',
    mix: `${SHORT_RULE}, then ONE fitting kaomoji at the end`,
};

// 카모지 꾸러미 — 프롬프트에는 매번 여기서 10개를 섞어 보여 준다 (늘 같은 것만 쓰지 않게)
export const KAOMOJI = [
    '(｡•́︿•̀｡)', '(≧▽≦)', '(￣ヘ￣)', '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', '( ˘•ω•˘ )', '(╬ Ò﹏Ó)', '(¬_¬ )', '( ͡° ͜ʖ ͡°)', '(ノಠ益ಠ)ノ彡┻━┻', '┬─┬ノ( º _ ºノ)',
    '(ಥ﹏ಥ)', '(╥﹏╥)', '(っ˘̩╭╮˘̩)っ', '٩(◕‿◕｡)۶', '(๑˃ᴗ˂)ﻭ', '(☆▽☆)', '(*≧ω≦)', '(ﾉ´ヮ`)ﾉ*: ･ﾟ', '(＾▽＾)', '(◕‿◕✿)',
    '(・_・;)', '(；￣Д￣)', '(°ロ°) !', 'Σ(°△°|||)', '(⊙_⊙)', '(O_O;)', '(＃`Д´)', '(ꐦ ಠ皿ಠ )', '凸(￣ヘ￣)', '(눈_눈)',
    '( ´_ゝ`)', '(￣～￣;)', '(－‸ლ)', '(-_-;)・・・', '(｡-_-｡)', '( ˘ ³˘)♥', '(´ε｀ )♡', '(っ´ω`c)♡', '(灬º‿º灬)♡', '(///▽///)',
    '(〃＞＿＜;〃)', '(*/ω＼)', '(￢‿￢ )', '(๑•̀ㅂ•́)و✧', '( •̀ᴗ•́ )و ̑̑', 'ᕦ(ò_óˇ)ᕤ', '(ง •̀_•́)ง', '(¬‿¬)', '(￣ー￣)ｂ', '(⌐■_■)',
    '( ˙꒳˙ )', '(・∀・)', '(=^･ω･^=)', 'ʕ•ᴥ•ʔ', '(⁰▿⁰)', '( ´ ▽ ` )ﾉ', '(-ω-、)', '(´-ω-`)', '(¦3[▓▓]', '(～﹃～)~zZ',
    '(╯°□°）╯︵ ┻━┻', 'ヽ(`Д´)ﾉ', '(ﾟДﾟ;)', '(*ﾟﾛﾟ)', '(´°̥̥̥̥̥̥̥̥ω°̥̥̥̥̥̥̥̥｀)', '(；ω；)', '(´；ω；`)', '(ᗒᗣᗕ)՞', '(˵ ͡° ͜ʖ ͡°˵)', '(☞ﾟヮﾟ)☞',
    '(￣▽￣*)ゞ', '(*´∀`)~♥', '(´• ω •`)', '(ღ˘⌣˘ღ)', 'ヾ(＾∇＾)', '(⊃｡•́‿•̀｡)⊃', '(´ﾟдﾟ`)', '(ﾟ⊿ﾟ)', '(；一_一)', '(￣(エ)￣)',
];
export function kaoSample(n = 10, seed = Math.random) {
    const a = [...KAOMOJI];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(seed() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
}

// ───── 설정 읽기 (settings 객체를 받는다 — core.js를 안 불러오려고) ─────
// v2.10: 기본 프리셋은 「쉬운 시작점」일 뿐 — 이름 · 아이콘 · AI에게 가는 설명 · 그 사람만의 어조 · 색 · 표정까지 전부 고칠 수 있다
//   set.mindEdit = { w: { id: {…고친 칸} }, c: {…}, t: {…} } — 기본 위에 덮어쓴다 (「기본으로」 = 그 id를 지움)
//   set.mindHide = { w: [id…], c: [], t: [] } — 기본 프리셋 숨기기 (지우기)
//   직접 만든 것: set.mindWatchOwn · set.mindCellOwn · set.mindToneOwn = [{ id, … }]
//   숫자 · 글: set.mindNum = { max, two, cast, cellTwo, len, sec, pos, kao } · set.mindRule (짧게 규칙 글)
const arr = (x) => (Array.isArray(x) ? x : []);
const hid = (set, k) => new Set(arr(set.mindHide?.[k]));
const own = (set, key) => arr(set[key]).filter(x => x?.id && x?.name).slice(0, 16);
function merged(base, set, k, ownKey) {
    const out = {}, H = hid(set, k), E = set.mindEdit?.[k] ?? {};
    for (const [id, d] of Object.entries(base)) if (!H.has(id)) out[id] = { ...d, ...(E[id] ?? {}), id, builtin: true, edited: !!E[id] };
    for (const x of own(set, ownKey)) out[x.id] = { icon: '🎭', desc: '', p: '', ...x, own: true };
    return out;
}
export const watchOwn = (set) => own(set, 'mindWatchOwn');
export const cellDefs = (set) => merged(CELLS, set, 'c', 'mindCellOwn');
export const toneDefs = (set) => merged(TONES, set, 't', 'mindToneOwn');
export const cellsOn = (set) => { const D = cellDefs(set), a = (Array.isArray(set.mindCells) ? set.mindCells : CELL_DEF).filter(id => D[id]); return a.length ? a : Object.keys(D).slice(0, 1); };
export function watchDefs(set) { // 고를 수 있는 관전자 전부 (기본 + 고친 것 + 직접 만든 것) + 세포 하나하나(cell:id)
    const out = merged(WATCH, set, 'w', 'mindWatchOwn');
    for (const x of Object.values(out)) if (x.own) { x.nick ??= x.name; x.p ||= `${x.name}: ${x.desc || 'a spectator with their own concept'}`; }
    for (const [id, c] of Object.entries(cellDefs(set))) out[`cell:${id}`] = { ...c, nick: c.name, p: c.p || CELL_P(`${c.name}: ${c.desc}`), cell: true, cid: id };
    return out;
}
export function watchOn(set) { // 지금 켠 관전자 id들 (세포 하나하나는 빼고 「cells」 한 칸으로)
    const defs = watchDefs(set);
    return (Array.isArray(set.mindWatch) ? set.mindWatch : ['fan']).filter(id => defs[id] && !defs[id].cell);
}
export const watchMode = (set) => set.mindWho === 'watch';
// 숫자 (범위를 넘으면 기본값)
export const NUM_DEF = { max: 2, two: 45, cast: 50, cellTwo: 60, len: 0, sec: 6, pos: 'hud', kao: 10 }; // len 0 = 글자 수 제한 없음 (잘라서 끊기던 것 · v2.10)
export function numOf(set) {
    const n = set.mindNum ?? {}, c = (k, lo, hi) => { const v = Number(n[k]); return Number.isFinite(v) && v >= lo && v <= hi ? v : NUM_DEF[k]; };
    return { max: c('max', 1, 4), two: c('two', 0, 100), cast: c('cast', 0, 100), cellTwo: c('cellTwo', 0, 100), len: c('len', 0, 300), sec: c('sec', 2, 20), pos: ['hud', 'tr', 'tl', 'br', 'bl'].includes(n.pos) ? n.pos : 'hud', kao: c('kao', 0, 30) };
}
export const ruleOf = (set) => String(set.mindRule ?? '').trim() || SHORT_RULE;
export function fmtOf(set) { // 보는 방식 글 (짧게 규칙을 고쳤으면 그걸로)
    const r = ruleOf(set);
    return { ...MIND_FMT, thought: r, mix: `${r}, then ONE fitting kaomoji at the end` };
}
export function toneP(set, id) { const t = toneDefs(set)[id]; if (!t) return ''; if (id === 'custom' && !t.own) return String(set.mindToneCustom ?? '').trim().slice(0, 200) || t.p; return t.p ?? ''; }
export function toneLine(set) { return toneP(set, toneDefs(set)[set.mindTone] ? set.mindTone : 'none'); }
// 관전자 이름 → 컨셉 (화면 꾸미기용) — 고정 이름이 맞으면 그 컨셉, 아니면 이름이 비어 있던 것(주변인 · 실시간 채팅)
export function conceptOf(set, who, hint) {
    const defs = watchDefs(set);
    if (hint && defs[hint]) return hint;
    for (const [id, d] of Object.entries(defs)) if (d.nick && String(who).replace(/\s+/g, '') === String(d.nick).replace(/\s+/g, '')) return id;
    const free = watchOn(set).filter(id => !defs[id].nick && id !== 'cells');
    if (free.length === 1) return free[0];
    return free.includes('chat') && /\d|[a-z]/i.test(String(who)) ? 'chat' : defs.by ? 'by' : (free[0] ?? '');
}

// 🌐 속마음만 따로 언어 (v2.10): '' = 상태창 출력 언어 따라 · custom = 직접 적은 언어
export const MIND_LANGS = { '': '자동', ko: '한국어', en: 'English', ja: '日本語', zh: '中文', custom: '직접' };
const LANG_EN = { ko: 'Korean', en: 'English', ja: 'Japanese', zh: 'Chinese' };
export function langOf(set) {
    const v = set.mindLang ?? '';
    if (v === 'custom') return String(set.mindLangCustom ?? '').trim().slice(0, 40);
    return LANG_EN[v] ?? '';
}

// ───── 🧠 세포 그림 — 동글동글 말랑한 파스텔 찹쌀떡 + 새싹 하나 (직접 디자인 · 색 · 표정은 세포마다 고칠 수 있다) ─────
export const CELL_FACES = { smirk: '씨익', angry: '버럭', gloom: '시무룩', love: '하트 눈', nerd: '안경', worry: '불안', calm: '덤덤', yum: '침 꼴깍', swirl: '빙글 눈', sleep: '쿨쿨', happy: '방긋', shock: '깜짝' };
const H = (c) => (/^#[0-9a-f]{6}$/i.test(String(c)) ? c : '#ffd36e');
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `#${[n >> 16 & 255, n >> 8 & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('')}`; };
const INK = '#4a3a3a';
const FACE_SVG = {
    smirk: `<path d="M11 16.5h3M18 16.5h3" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M14 21c1.6 1 3.4.6 4.6-.8" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    angry: `<path d="M10.5 14l3.5 1.4M21.5 14L18 15.4" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/><circle cx="12.6" cy="17.2" r="1.3" fill="${INK}"/><circle cx="19.4" cy="17.2" r="1.3" fill="${INK}"/><path d="M14 22c1.2-1.2 2.8-1.2 4 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M23.5 9.5l1.6 1.6M25.1 9.5l-1.6 1.6" stroke="#e2524a" stroke-width="1.3" stroke-linecap="round"/>`,
    gloom: `<path d="M11 15.6l2.6 1M21 15.6l-2.6 1" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/><circle cx="12.8" cy="18" r="1.1" fill="${INK}"/><circle cx="19.2" cy="18" r="1.1" fill="${INK}"/><path d="M14.4 22.2c1-.6 2.2-.6 3.2 0" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M12.6 19.6v2.2" stroke="#7cc4f5" stroke-width="1.3" stroke-linecap="round"/>`,
    love: `<path d="M12.6 19.2l-2-2a1.2 1.2 0 0 1 2-1.3 1.2 1.2 0 0 1 2 1.3z" fill="#e85a7a"/><path d="M19.6 19.2l-2-2a1.2 1.2 0 0 1 2-1.3 1.2 1.2 0 0 1 2 1.3z" fill="#e85a7a"/><path d="M14.6 21.4c.8.8 2 .8 2.8 0" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
    nerd: `<circle cx="12.6" cy="17.4" r="2.6" fill="#fff" fill-opacity=".55" stroke="${INK}" stroke-width="1.1"/><circle cx="19.4" cy="17.4" r="2.6" fill="#fff" fill-opacity=".55" stroke="${INK}" stroke-width="1.1"/><path d="M15.2 17.4h1.6" stroke="${INK}" stroke-width="1.1"/><circle cx="12.6" cy="17.6" r=".9" fill="${INK}"/><circle cx="19.4" cy="17.6" r=".9" fill="${INK}"/><path d="M14.6 22h2.8" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`,
    worry: `<circle cx="12.8" cy="17.4" r="1.3" fill="${INK}"/><circle cx="19.2" cy="17.4" r="1.3" fill="${INK}"/><path d="M13.6 22.2l1.1-.8 1.2.8 1.2-.8 1.2.8" stroke="${INK}" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 12.5c.6 1 .6 1.8 0 2.3-.6-.5-.6-1.3 0-2.3z" fill="#7cc4f5"/>`,
    calm: `<path d="M11.4 17.6h2.6M18 17.6h2.6" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/><path d="M14.8 21.6h2.4" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`,
    yum: `<circle cx="12.8" cy="17" r="1.3" fill="${INK}"/><circle cx="19.2" cy="17" r="1.3" fill="${INK}"/><path d="M13.8 20.6c1.4 1.4 3 1.4 4.4 0" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M17.6 21.4c.2 1.2.1 1.8-.3 2.2" stroke="#7cc4f5" stroke-width="1.2" stroke-linecap="round"/>`,
    swirl: `<path d="M12.8 17.4m-1.6 0a1.6 1.6 0 1 0 1.6-1.6a.9.9 0 1 0 .7 .9" stroke="${INK}" stroke-width="1.1" fill="none"/><path d="M19.2 17.4m-1.6 0a1.6 1.6 0 1 0 1.6-1.6a.9.9 0 1 0 .7 .9" stroke="${INK}" stroke-width="1.1" fill="none"/><ellipse cx="16" cy="21.8" rx="1.2" ry="1" fill="${INK}"/>`,
    sleep: `<path d="M11.4 17.6c.8.8 2 .8 2.8 0M17.8 17.6c.8.8 2 .8 2.8 0" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/><circle cx="16" cy="21.6" r=".9" fill="${INK}"/><text x="22.5" y="11" font-size="5" font-weight="700" fill="${INK}" font-family="sans-serif">z</text>`,
    happy: `<path d="M11.4 18c.8-1.2 2-1.2 2.8 0M17.8 18c.8-1.2 2-1.2 2.8 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M13.8 20.6c1.4 1.8 3 1.8 4.4 0z" fill="#c95a5a"/>`,
    shock: `<circle cx="12.8" cy="17.2" r="1.8" fill="#fff" stroke="${INK}" stroke-width="1.1"/><circle cx="19.2" cy="17.2" r="1.8" fill="#fff" stroke="${INK}" stroke-width="1.1"/><circle cx="12.8" cy="17.2" r=".7" fill="${INK}"/><circle cx="19.2" cy="17.2" r=".7" fill="${INK}"/><ellipse cx="16" cy="22" rx="1.1" ry="1.4" fill="${INK}"/>`,
};
export function cellSvg(c = {}, cls = '') {
    const col = H(c.color), face = FACE_SVG[c.face] ? c.face : 'happy', dk = shade(col, 0.82);
    return `<svg class="ss-cellsvg ${cls}" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 7.6c-.4-2.2.6-3.8 2.4-4.4" stroke="#6aa85a" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M18.2 3.4c1.8-.6 3.2.2 3.4 1.6-1.6.6-3 .2-3.4-1.6z" fill="#8ac86a"/>`
        + `<path d="M16 7.4c7 0 11.6 5 11.6 11.2 0 5.6-4.4 9.2-11.6 9.2S4.4 24.2 4.4 18.6C4.4 12.4 9 7.4 16 7.4z" fill="${col}" stroke="${dk}" stroke-width="1"/>`
        + `<ellipse cx="11" cy="11.8" rx="2.4" ry="1.3" fill="#fff" opacity=".6" transform="rotate(-25 11 11.8)"/><ellipse cx="9.4" cy="20.6" rx="1.8" ry="1.1" fill="#ff8aa0" opacity=".45"/><ellipse cx="22.6" cy="20.6" rx="1.8" ry="1.1" fill="#ff8aa0" opacity=".45"/>`
        + `${FACE_SVG[face]}</svg>`;
}
const escH = (t) => String(t ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
// 관전자 · 세포 얼굴 (화면용 HTML) — 세포는 그림, 나머지는 고른 이모지
export const watchIcon = (d, cls = '') => (d?.cell ? cellSvg(d, cls) : `<span class="ss-wt-emo ${cls}">${escH(d?.icon || '👀')}</span>`);

// ───── 속마음 → 표정 (다른 인물의 도트 인형 · 표정을 「기분 따라」로 둔 것만) ─────
const FACE_RX = [
    ['love', /♥|♡|❤|💕|💗|😍|🥰|😘|사랑|좋아해|두근|설레|반했|귀엽|예쁘|잘생/],
    ['shy', /⁄|\/\/\/|〃|😳|☺|부끄|쑥스|창피|민망|얼굴.*빨/],
    ['cry', /ಥ|╥|；ω；|😭|😢|🥲|°̥|울고|눈물|슬퍼|서러|흑흑|ㅠㅠ|ㅜㅜ/],
    ['angry', /╬|ꐦ|益|皿|Д´|`Д|凸|┻━┻|😠|😡|🤬|💢|화나|짜증|열받|빡치|죽여|씨|ㅅㅂ|미친/],
    ['surprised', /°ロ°|°△°|⊙_⊙|O_O|ﾟДﾟ|ﾟﾛﾟ|😲|😮|😱|헉|뭐야|어\?|깜짝|설마|진짜\?/],
    ['worried', /・_・;|；￣|-_-;|😟|😰|😥|걱정|불안|괜찮을까|어쩌지|큰일/],
    ['smirk', /¬‿¬|￢‿￢|͜ʖ|😏|흐흐|후후|역시|그럼 그렇지|재밌|흥미/],
    ['sleepy', /zZ|😴|졸려|피곤|하품|귀찮/],
    ['sad', /︿|˘̩|😔|😞|서운|외로|쓸쓸|실망|씁쓸/],
    ['happy', /≧▽≦|☆▽☆|≧ω≦|๑˃ᴗ˂|◕‿◕|＾▽＾|😆|😄|😁|🤩|신나|좋다|최고|야호|ㅋㅋ|하하/],
    ['neutral', /눈_눈|´_ゝ`|－‸ლ|-ω-|😐|😑|하아|한숨|글쎄|별로|그냥/],
];
export function faceOfMind(text) {
    const t = String(text ?? ''); if (!t) return '';
    for (const [f, rx] of FACE_RX) if (rx.test(t)) return f;
    return '';
}
// 속마음이 없거나 표정을 못 읽었을 때: 관계 수치로 (질투가 크면 화남 · 애정이 아주 낮으면 무표정 …)
export function faceOfRel(r) {
    if (!r) return '';
    if ((r.jealous ?? 0) >= 60) return 'angry';
    const a = Number(r.aff ?? 0);
    if (r.noLove) return a >= 30 ? 'smile' : 'neutral';
    if (a <= -30) return 'angry';
    if (a < 0) return 'neutral';
    if (a >= 70) return 'love';
    if (a >= 40) return 'happy';
    return 'smile';
}
