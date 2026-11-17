// 🧸 도트 인형 (v2.9) — 16×20칸짜리 꼬마 캐릭터를 코드로 그린다 (SVG 네모들 · 내려받는 그림 없음 · 다른 파일을 안 불러오는 순수한 조각).
//   몸 → 하의 → 신발 → 상의 → 머리카락 → 겉옷 → 얼굴 → 장신구 → 손에 든 것 순서로 겹쳐 칠한다.
//   옷 모양은 칸(무기 · 겉옷 · 상의 · 하의 · 신발 · 장신구)마다 몇 가지가 있고, 물건 이름을 보고 고른다 (틀리면 옷차림 탭에서 바꾼다).
//   글자: o 테두리 · s 살 · h 머리카락 · c 옷 색 · C 옷의 어두운 쪽 · e 눈 · m 입 · b 볼 · w 땀
const W = 16, H = 20;
const rows = (o) => { const a = Array.from({ length: H }, () => '.'.repeat(W)); for (const [k, v] of Object.entries(o)) for (const r of String(k).split(',')) a[Number(r)] = v; return a; };

const BODY = rows({
    1: '....oooooooo....', 2: '...osssssssso...', '3,4,5,6,7': '..osssssssssso..', 8: '...osssssssso...', 9: '....oossssoo....',
    10: '...osssssssso...', 11: '..osssssssssso..', '12,13': '..osossssssoso..', 14: '..ooossssssooo..', 15: '....osssssso....', '16,17,18': '....ossoosso....', 19: '....oooooooo....',
});
// 속옷처럼 늘 깔리는 기본 옷 (아무것도 안 입어도 맨몸이 아니게)
const UNDER_TOP = rows({ 10: '....cccccccc....', 11: '...cccccccccc...', '12,13,14': '.....cccccc.....' });
const UNDER_BOTTOM = rows({ 15: '.....cccccc.....', 16: '.....cc..cc.....' });

export const HAIRS = {
    short: rows({ 1: '....hhhhhhhh....', 2: '...hhhhhhhhhh...', 3: '..hhhhhhhhhhhh..', 4: '..hhh.hhhh.hhh..', 5: '..h..........h..' }),
    bob: rows({ 1: '....hhhhhhhh....', 2: '...hhhhhhhhhh...', 3: '..hhhhhhhhhhhh..', 4: '..hhh.hhhh.hhh..', '5,6,7': '..hh........hh..', 8: '..hhh......hhh..' }),
    long: rows({ 1: '....hhhhhhhh....', 2: '...hhhhhhhhhh...', 3: '..hhhhhhhhhhhh..', 4: '..hhh.hhhh.hhh..', '5,6,7': '..hh........hh..', 8: '..hhh......hhh..', 9: '.hhhh......hhhh.', 10: '.hhh........hhh.', 11: '.hh..........hh.' }),
    tails: rows({ 1: '....hhhhhhhh....', 2: '...hhhhhhhhhh...', 3: '.hhhhhhhhhhhhhh.', 4: 'hhhhh.hhhh.hhhhh', 5: 'hh.h........h.hh', '6,7': 'hh............hh', 8: '.h............h.' }),
    buzz: rows({ 1: '....hhhhhhhh....', 2: '...hhhhhhhhhh...', 3: '..hh........hh..' }),
    none: rows({}),
};
export const HAIR_NAMES = { short: '짧은 머리', bob: '단발', long: '긴 머리', tails: '양갈래', buzz: '스포츠', none: '없음' };

// 칸 종류마다 옷 모양
export const SHAPES = {
    top: {
        tee: rows({ 10: '....cccccccc....', 11: '...cccccccccc...', '12,13,14': '.....cccccc.....' }),
        long: rows({ 10: '....cccccccc....', 11: '...cccccccccc...', '12,13': '...c.cccccc.c...', 14: '.....cccccc.....' }),
        dress: rows({ 10: '....cccccccc....', 11: '...cccccccccc...', '12,13,14': '.....cccccc.....', 15: '....cccccccc....', '16,17': '...cccccccccc...' }),
        armor: rows({ 10: '....cCccccCc....', 11: '...CccccccccC...', 12: '.....cCCCCc.....', 13: '.....cccccc.....', 14: '.....CCCCCC.....' }),
    },
    bottom: {
        pants: rows({ 15: '.....cccccc.....', '16,17,18': '.....cc..cc.....' }),
        shorts: rows({ 15: '.....cccccc.....', 16: '.....cc..cc.....' }),
        skirt: rows({ 15: '....cccccccc....', 16: '...cccccccccc...' }),
    },
    outer: {
        coat: rows({ 10: '...ccc....ccc...', 11: '..cccc....cccc..', 12: '..ccCc....cCcc..', '13,14': '..cccc....cccc..', '15,16': '....cc....cc....' }),
        jacket: rows({ 10: '...ccc....ccc...', 11: '..cccc....cccc..', 12: '..ccCc....cCcc..', '13,14': '..cccc....cccc..' }),
        cloak: rows({ 0: '....cccccccc....', 1: '...cc......cc...', 2: '..cc........cc..', '3,4,5,6,7': '.cc..........cc.', 8: '..cc........cc..', 9: '...cccc..cccc...', 10: '..ccccc..ccccc..', '11,12,13,14': '.cccccC..Cccccc.', 15: '..cccc....cccc..', 16: '..ccc......ccc..' }),
    },
    shoes: {
        shoes: rows({ 19: '...cccc..cccc...' }),
        boots: rows({ '17,18': '.....cc..cc.....', 19: '...cccc..cccc...' }),
    },
    acc: {
        hat: rows({ 0: '....cccccccc....', 1: '...cccccccccc...', 2: '.cccccccccccccc.' }),
        wide: rows({ 0: '.....cccccc.....', 1: '....cCCCCCCc....', 2: 'cccccccccccccccc' }),
        crown: rows({ 0: '....c.c..c.c....', 1: '....cccccccc....' }),
        mask: rows({ '6,7': '...cccccccccc...', 8: '....cccccccc....' }),
        scarf: rows({ 9: '....cccccccc....', 10: '.....cc.........', 11: '.....cc.........' }),
        gem: rows({ 6: '..c..........c..' }),
    },
    weapon: {
        sword: rows({ '4,5,6,7,8,9,10,11': '..............c.', 12: '.............CCC', 13: '..............C.' }),
        staff: rows({ 2: '.............ccc', 3: '.............cCc', '4,5,6,7,8,9,10,11,12,13,14,15,16,17': '..............c.' }),
        tool: rows({ 11: '.............cc.', 12: '.............ccc', 13: '.............C..', 14: '.............C..' }),
        bag: rows({ 11: '..............C.', '12,13,14': '.............ccc' }),
    },
};
export const SHAPE_NAMES = {
    tee: '반팔', long: '긴팔', dress: '원피스', armor: '갑옷', pants: '바지', shorts: '반바지', skirt: '치마', coat: '코트', jacket: '재킷', cloak: '후드 망토',
    shoes: '신발', boots: '부츠', hat: '모자', wide: '챙 넓은 모자', crown: '왕관 · 리본', mask: '마스크', scarf: '목도리 · 목걸이', gem: '귀걸이', sword: '검', staff: '지팡이 · 창', tool: '도구 · 총', bag: '가방 · 바구니',
};
// 칸 이름 → 종류
export function slotKind(slot) {
    const t = String(slot);
    if (/무기|손|weapon|hand/i.test(t)) return 'weapon';
    if (/겉|외투|outer|coat/i.test(t)) return 'outer';
    if (/하의|바지|bottom|pants|legs/i.test(t)) return 'bottom';
    if (/신발|발|shoe|feet|boot/i.test(t)) return 'shoes';
    if (/상의|옷|top|shirt|body/i.test(t)) return 'top';
    return 'acc';
}
const GUESS = {
    outer: [['cloak', /망토|로브|후드|케이프|cloak|cape|robe|hood|poncho|우비/i], ['jacket', /자켓|재킷|점퍼|가디건|조끼|jacket|blazer|cardigan|vest/i]],
    top: [['dress', /드레스|원피스|dress|gown/i], ['armor', /갑옷|흉갑|armor|armour|plate|mail/i], ['long', /긴팔|스웨터|니트|셔츠|블라우스|shirt|sweater|blouse|hoodie/i]],
    bottom: [['skirt', /치마|스커트|skirt/i], ['shorts', /반바지|shorts/i]],
    shoes: [['boots', /부츠|장화|boot/i]],
    acc: [['wide', /밀짚|챙|straw|sun ?hat|brim/i], ['hat', /모자|헬멧|두건|hat|cap|beanie|helmet/i], ['crown', /왕관|리본|티아라|머리띠|crown|ribbon|tiara/i], ['mask', /마스크|복면|가면|mask/i], ['scarf', /목도리|스카프|목걸이|넥타이|scarf|necklace|tie|pendant/i]],
    weapon: [['staff', /지팡이|스태프|창|봉|낚싯대|staff|wand|spear|rod|pole/i], ['tool', /총|권총|모종삽|도구|망치|도끼|곡괭이|gun|pistol|rifle|trowel|tool|hammer|axe|pick/i], ['bag', /가방|바구니|주머니|소포|bag|basket|pouch|parcel|sack/i]],
};
const FIRST = { outer: 'coat', top: 'tee', bottom: 'pants', shoes: 'shoes', acc: 'gem', weapon: 'sword' };
export const guessShape = (kind, name) => (GUESS[kind] ?? []).find(([, re]) => re.test(String(name)))?.[0] ?? FIRST[kind] ?? 'gem';

export const COLORS = ['#e2524a', '#e8853a', '#e8b93a', '#5aa85a', '#3aa3a3', '#4a8fe2', '#5a6ad6', '#9a6ad6', '#e26aa8', '#8a6a4a', '#c9b38a', '#f2f0ea', '#8a8f98', '#2f3138'];
const COLOR_WORD = [[/검|까만|black|dark/i, 13], [/흰|하얀|white/i, 11], [/빨|붉|red|crimson/i, 0], [/주황|orange/i, 1], [/노랑|노란|금|밀짚|yellow|gold|straw/i, 2], [/초록|녹|green/i, 3], [/청록|민트|teal|mint/i, 4], [/파랑|파란|하늘|blue|sky/i, 5], [/남색|navy|indigo/i, 6], [/보라|purple|violet/i, 7], [/분홍|핑크|pink|rose/i, 8], [/갈색|가죽|brown|leather|wood/i, 9], [/캔버스|베이지|린넨|canvas|beige|linen|tan/i, 10], [/회색|은|철|grey|gray|silver|iron|steel/i, 12]];
export function guessColor(name) {
    const t = String(name), hit = COLOR_WORD.find(([re]) => re.test(t)); if (hit) return COLORS[hit[1]];
    let h = 0; for (const ch of t) h = (h * 31 + ch.codePointAt(0)) % 9973;
    return COLORS[h % 11]; // 이름으로 정해지는 색 (흰 · 회 · 검은 빼고)
}
export const SKINS = ['#ffe0c4', '#f6c9a0', '#dba77a', '#b07a52', '#7a4f33', '#c8e6c0', '#cfd8f0'];
export const HAIR_COLORS = ['#2f2a2a', '#5a3a26', '#a8692f', '#e8c36a', '#d24a3a', '#e88aa8', '#7a6ad6', '#4a9fd6', '#5aa86a', '#f2f0ea'];

const shade = (hex, k = 0.78) => { const n = parseInt(String(hex).slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `#${[n >> 16 & 255, n >> 8 & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('')}`; };
function paint(grid, map, pal) { for (let y = 0; y < H; y++) { const r = map[y]; for (let x = 0; x < W; x++) { const c = pal[r[x]]; if (c) grid[y][x] = c; } } }
// 얼굴: mood 0(한계) ~ 4(아주 좋음)
function faceMap(mood) {
    const g = Array.from({ length: H }, () => Array(W).fill('.')), put = (y, x, ch) => { g[y][x] = ch; };
    if (mood >= 4) { put(4, 5, 'e'); put(5, 4, 'e'); put(5, 6, 'e'); put(4, 10, 'e'); put(5, 9, 'e'); put(5, 11, 'e'); put(6, 3, 'b'); put(6, 12, 'b'); put(7, 6, 'm'); put(7, 9, 'm'); put(8, 7, 'm'); put(8, 8, 'm'); }
    else if (mood === 3) { put(4, 5, 'e'); put(5, 5, 'e'); put(4, 10, 'e'); put(5, 10, 'e'); put(6, 4, 'b'); put(6, 11, 'b'); put(7, 6, 'm'); put(7, 9, 'm'); put(8, 7, 'm'); put(8, 8, 'm'); }
    else if (mood === 2) { put(4, 5, 'e'); put(5, 5, 'e'); put(4, 10, 'e'); put(5, 10, 'e'); put(7, 7, 'm'); put(7, 8, 'm'); }
    else if (mood === 1) { put(5, 5, 'e'); put(5, 10, 'e'); put(4, 4, 'm'); put(4, 11, 'm'); put(7, 7, 'm'); put(7, 8, 'm'); put(8, 6, 'm'); put(8, 9, 'm'); }
    else { for (const x of [4, 6, 9, 11]) { put(4, x, 'e'); put(6, x, 'e'); } put(5, 5, 'e'); put(5, 10, 'e'); put(7, 6, 'm'); put(7, 7, 'm'); put(7, 8, 'm'); put(7, 9, 'm'); put(3, 12, 'w'); put(4, 12, 'w'); }
    return g.map(r => r.join(''));
}
// look = { skin, hair, hairColor, eye } · wear = [{ kind, shape, color }] · mood 0~4
export function dollSVG(look = {}, wear = [], mood = 3, cls = '') {
    const grid = Array.from({ length: H }, () => Array(W).fill(''));
    const skin = look.skin || SKINS[0], hc = look.hairColor || HAIR_COLORS[1];
    paint(grid, BODY, { o: '#4a3a36', s: skin });
    const of = (kind) => wear.find(x => x.kind === kind && SHAPES[kind]?.[x.shape]);
    const cloth = (kind, fallback) => { const x = of(kind); if (x) paint(grid, SHAPES[kind][x.shape], { c: x.color, C: shade(x.color) }); else if (fallback) paint(grid, fallback[0], { c: fallback[1], C: shade(fallback[1]) }); };
    const top = of('top');
    cloth('bottom', top?.shape === 'dress' ? null : [UNDER_BOTTOM, '#8a8f98']);
    cloth('shoes');
    cloth('top', [UNDER_TOP, '#f2f0ea']);
    paint(grid, HAIRS[look.hair] ?? HAIRS.short, { h: hc });
    cloth('outer');
    paint(grid, faceMap(Math.max(0, Math.min(4, Math.round(mood)))), { e: look.eye || '#2f2a2a', m: '#8a4a44', b: '#f5a3a3', w: '#6ab7f0' });
    cloth('acc');
    cloth('weapon');
    let out = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W;) { const c = grid[y][x]; if (!c) { x++; continue; } let n = 1; while (x + n < W && grid[y][x + n] === c) n++; out += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${c}"/>`; x += n; }
    return `<svg class="ss-px ${cls}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
}
