// 🧊 입체 그림 (v2.9) — 지도 · 건물 층 · 집 안 구조를 비스듬히 내려다본 미니어처로 그린다
//   · SVG만 쓴다 (3D 엔진 · 외부 라이브러리 없음) · AI 0회 · 토큰 0 · 저장하는 것 없음 (그리기만)
//   · 색: 면마다 --c 하나에서 윗면(밝게) · 왼면 · 오른면(어둡게)을 CSS가 섞어 만든다 (css/patches.css의 .ss-iso)
import { esc, short, norm, clamp } from './core.js';
import { placeIcon } from './tiles.js';

const K = 0.58; // 마름모 세로/가로 비율
const R = (v) => Math.round(v * 100) / 100;
const P = (pts) => pts.map(([x, y]) => `${R(x)},${R(y)}`).join(' ');
const poly = (cls, pts) => `<polygon class="${cls}" points="${P(pts)}"/>`;
const G = (c, inner) => `<g style="--c:${c}">${inner}</g>`;

// 지도 좌표(0~100) → 비스듬한 화면 좌표
export const isoPt = (o) => ({ x: R((o.x - o.y) * 0.72 + 50), y: R((o.x + o.y) * 0.42) });

// ───── 기본 모양 ─────
const flat = (cx, cy, a, cls = 'f-t') => poly(cls, [[cx, cy - a * K], [cx + a, cy], [cx, cy + a * K], [cx - a, cy]]);
function box(cx, cy, a, h) {
    const b = a * K;
    return poly('f-l', [[cx - a, cy - h], [cx, cy - h + b], [cx, cy + b], [cx - a, cy]])
        + poly('f-r', [[cx + a, cy - h], [cx, cy - h + b], [cx, cy + b], [cx + a, cy]])
        + poly('f-t', [[cx, cy - h - b], [cx + a, cy - h], [cx, cy - h + b], [cx - a, cy - h]]);
}
function pyr(cx, cy, a, h) {
    const b = a * K;
    return poly('f-l', [[cx - a, cy], [cx, cy + b], [cx, cy - h]]) + poly('f-r', [[cx + a, cy], [cx, cy + b], [cx, cy - h]]);
}
// 층 줄 (상자 앞 두 면에 가로줄)
function stories(cx, cy, a, h, n) {
    const b = a * K; let out = '';
    for (let i = 1; i < n; i++) { const o = (h * i) / n; out += `<polyline class="ln" points="${P([[cx - a, cy - o], [cx, cy + b - o], [cx + a, cy - o]])}"/>`; }
    return out;
}

// ───── 장소 종류 → 모양 (이름 · 종류로 짐작 — 못 맞히면 기본 상자 + 이모지) ─────
const KINDS = [
    [/등대|lighthouse|탑|tower|첨탑/i, 'tower'], [/성당|교회|신전|사원|절$|church|temple|shrine|cathedral|chapel/i, 'church'],
    [/성$|성채|궁|왕궁|castle|palace|fort|요새|citadel/i, 'castle'],
    [/항구|선착장|부두|port|harbor|harbour|dock|pier/i, 'harbor'], [/바다|해변|해안|beach|sea|ocean|coast|섬|island|강|호수|river|lake|폭포|waterfall|연못|pond/i, 'water'],
    [/숲|forest|woods|정글|jungle/i, 'forest'], [/산$|산맥|mountain|봉우리|peak|절벽|cliff|화산|volcano/i, 'mountain'],
    [/동굴|던전|cave|dungeon|지하|ruin|폐허|유적|광산|mine/i, 'cave'], [/공원|정원|garden|park|농장|밭|farm|ranch|목장|초원|들판|field|meadow/i, 'park'],
    [/광장|square|plaza|거리|street|road|골목|alley|다리|bridge|길$|교차로/i, 'plaza'],
    [/시장|market|bazaar|장터|저잣거리|상점|가게|shop|store|잡화|편의점|매점|마트|mart/i, 'shop'],
    [/술집|선술집|주점|여관|객잔|tavern|inn|bar$|pub|카페|찻집|cafe|café|coffee|식당|레스토랑|restaurant|diner|빵집|bakery/i, 'inn'],
    [/마을|village|town|어귀|촌$/i, 'village'],
    [/학교|학원|아카데미|school|academy|대학|univ|병원|의원|clinic|hospital|도서관|library|회사|사무실|office|본부|headquarters|연구소|실험실|lab|역$|정거장|station|터미널|경찰|police|길드|guild|도시|city|번화가|downtown|빌딩|building|아파트|apartment|호텔|hotel|백화점|기지|base|격납고|hangar|체육관|gym|극장|theater/i, 'big'],
    [/집|home|house|자택|숙소|기숙사|dorm|하숙|오두막|cottage|cabin|방$|침실|bedroom|room|저택|mansion|별장/i, 'house'],
];
export const isoKind = (p) => KINDS.find(([re]) => re.test(String(p?.name ?? '').trim()) || (p?.kind && re.test(String(p.kind).trim())))?.[1] ?? 'box';
const BIG_COLOR = [[/병원|의원|clinic|hospital/i, '#e9eef2'], [/학교|학원|school|academy|대학|univ/i, '#e8c9a0'], [/도서관|library/i, '#c9b39a'], [/경찰|police|기지|base/i, '#9fb0c9'], [/길드|guild/i, '#c9a27e']];

// 모양 하나 → { svg, top (바닥에서 꼭대기까지 높이), emoji (위에 이모지를 띄울지) }
function shape(kind, cx, cy, p) {
    const fl = p?.floors?.length ?? 0;
    switch (kind) {
        case 'house': return { svg: G('#f0e3c8', box(cx, cy, 2.6, 2.4) + (fl > 1 ? stories(cx, cy, 2.6, 2.4, fl) : '')) + G('#d9694c', pyr(cx, cy - 2.4, 2.95, 2.4)), top: 4.8 };
        case 'shop': return { svg: G('#f3ead8', box(cx, cy, 2.8, 2.1)) + G('#e9a23b', box(cx, cy - 2.1, 3.1, 0.7)), top: 4.6, emoji: true };
        case 'inn': return { svg: G('#eadcc4', box(cx, cy, 2.7, 2.6)) + G('#a8603a', pyr(cx, cy - 2.6, 3.0, 1.8)), top: 4.4, emoji: true };
        case 'castle': return { svg: G('#c3bfd0', box(cx, cy, 3.1, 4)) + G('#c3bfd0', box(cx, cy - 4, 1.6, 2.2)) + G('#7a6fd0', pyr(cx, cy - 6.2, 1.9, 2.2)), top: 8.4 };
        case 'tower': return { svg: G('#e9e1d4', box(cx, cy, 1.5, 6.6)) + G('#d9694c', pyr(cx, cy - 6.6, 1.85, 2)), top: 8.6 };
        case 'church': return { svg: G('#f1ece2', box(cx, cy, 2.4, 3)) + G('#6f86b8', pyr(cx, cy - 3, 2.7, 3.8)), top: 6.8 };
        case 'big': { const n = fl || 3, h = clamp(n * 1.5, 3, 9); return { svg: G(BIG_COLOR.find(([re]) => re.test(`${p?.name ?? ''} ${p?.kind ?? ''}`))?.[1] ?? '#b9c6d8', box(cx, cy, 2.9, h) + stories(cx, cy, 2.9, h, Math.min(n, 8))), top: h + 1.7, emoji: true }; }
        case 'forest': return { svg: G('#5fa052', pyr(cx - 1.8, cy - 0.5, 1.5, 4) + pyr(cx + 1.7, cy, 1.4, 3.4) + pyr(cx - 0.1, cy + 0.9, 1.7, 4.6)), top: 4.6 };
        case 'park': return { svg: G('#9fd086', flat(cx, cy, 3.5)) + G('#5fa052', pyr(cx - 0.9, cy - 0.2, 1.3, 3.4)), top: 3.6, emoji: true };
        case 'mountain': return { svg: G('#a39a90', pyr(cx, cy, 3.9, 6.6)) + G('#f6f6f4', pyr(cx, cy - 4.4, 1.3, 2.2)), top: 6.6 };
        case 'water': return { svg: G('#6ab2e6', flat(cx, cy, 4)) + `<path class="wv" d="M${R(cx - 1.8)} ${R(cy - 0.3)} q.6 -.5 1.2 0 t1.2 0 M${R(cx - 0.6)} ${R(cy + 0.9)} q.6 -.5 1.2 0 t1.2 0"/>`, top: 0.6, emoji: true };
        case 'harbor': return { svg: G('#6ab2e6', flat(cx, cy, 4)) + G('#b98b5e', box(cx - 1.1, cy - 0.5, 1.7, 0.7)) + G('#fafafa', pyr(cx + 1.5, cy + 0.9, 0.9, 2.4)), top: 2.6, emoji: true };
        case 'cave': return { svg: G('#8f8a80', pyr(cx, cy, 3.3, 3.4)) + `<ellipse class="hole" cx="${R(cx + 1)}" cy="${R(cy + 0.5)}" rx=".75" ry="1"/>`, top: 3.4 };
        case 'plaza': return { svg: G('#ddd5c4', flat(cx, cy, 3.5)) + G('#7fb6e6', box(cx, cy, 0.9, 0.5)), top: 1.2, emoji: true };
        case 'village': return { svg: G('#f0e3c8', box(cx - 1.5, cy - 0.5, 1.5, 1.6)) + G('#d9694c', pyr(cx - 1.5, cy - 2.1, 1.75, 1.5)) + G('#f0e3c8', box(cx + 1.4, cy + 0.5, 1.5, 1.6)) + G('#c98a3e', pyr(cx + 1.4, cy - 1.1, 1.75, 1.5)), top: 3.8 };
        default: return { svg: G('#d6cdbd', box(cx, cy, 2.6, 2.8) + (fl > 1 ? stories(cx, cy, 2.6, 2.8, fl) : '')), top: 4.3, emoji: true };
    }
}

// ───── 지도의 장소들 (뒤에서 앞으로 그린다) ─────
// o = { pos (이름 → 화면 좌표), here, sel, label(p), count(p) → 지금 거기 있는 사람 수 }
export function isoNodes(places, o) {
    return [...places].sort((a, b) => o.pos.get(a.name).y - o.pos.get(b.name).y).map(p => {
        const { x: cx, y: cy } = o.pos.get(p.name);
        const here = norm(p.name) === norm(o.here), isSel = o.sel && o.sel.name === p.name;
        const sh = p.known ? shape(isoKind(p), cx, cy, p) : { svg: G('#b8b6b0', box(cx, cy, 2.4, 2.4)) + `<text class="q" x="${cx}" y="${R(cy - 3.1)}">?</text>`, top: 3.8 };
        const n = o.count?.(p) ?? 0, top = cy - sh.top;
        return `<g class="node iso-n ${here ? 'here' : ''} ${isSel ? 'sel' : ''} ${p.known ? '' : 'unk'}" data-act="selplace" data-arg="${esc(p.name)}">
            ${flat(cx, cy, 4.4, 'gnd')}${sh.svg}
            ${p.known && (sh.emoji || p.icon) ? `<text class="ico" x="${cx}" y="${R(top - 0.4)}">${esc(placeIcon(p))}</text>` : ''}
            ${here ? `<g class="pin"><line x1="${cx}" y1="${R(top - (sh.emoji || p.icon ? 4.6 : 1))}" x2="${cx}" y2="${R(top - (sh.emoji || p.icon ? 6.4 : 2.8))}"/><circle cx="${cx}" cy="${R(top - (sh.emoji || p.icon ? 7.6 : 4))}" r="1.5"/></g>` : ''}
            <text x="${cx}" y="${R(cy + 5.9)}">${esc(short(o.label(p), 8))}</text>${n ? `<text class="ppl" x="${R(cx + 4.4)}" y="${R(cy + 1)}">👥${n}</text>` : ''}</g>`;
    }).join('');
}

// ───── 건물 안 · 층 (아래층부터 쌓는다) — 지금 그 건물에 있으면 층을 눌러 「여기 있어요」 ─────
export function floorsSVG(p, spot, canSet) {
    const fl = (p.floors ?? []).slice(0, 12), n = fl.length; if (!n) return '';
    const a = 20, b = a * K, h = 3.4, gap = 11.5, H = (n - 1) * gap + 2 * b + h + 5, base = H - b - 2.5;
    const rows = fl.map((name, i) => {
        const cy = base - i * gap, on = spot && norm(spot) === norm(name);
        return `<g class="fl ${on ? 'on' : ''} ${canSet ? 'can' : ''}" ${canSet ? `data-act="spot" data-arg="${esc(name)}" role="button"` : ''}>${G(on ? 'var(--ss-hi)' : '#e6dfd0', box(26, cy, a, h))}
            <line class="lead" x1="46" y1="${R(cy - h / 2)}" x2="52" y2="${R(cy - h / 2)}"/><text x="54" y="${R(cy - h / 2 + 1.5)}">${esc(short(name, 16))}${on ? ' · 지금 여기' : ''}</text></g>`;
    }).join('');
    return `<svg class="ss-iso ss-floors" viewBox="0 0 110 ${R(H)}" preserveAspectRatio="xMinYMid meet" role="img" aria-label="${esc(p.name)} 안">${rows}</svg>`;
}

// ───── 집 안 구조 (본거지): 지붕을 걷어낸 인형의 집 — 방마다 바닥 한 칸 + 뒤쪽 벽 두 장 · 가구는 이모지 ─────
const FURN = [
    [/침대|bed|요$|이불|매트리스/i, '🛏️'], [/소파|sofa|couch|안락의자/i, '🛋️'], [/의자|chair|stool|스툴|벤치|bench/i, '🪑'], [/책상|desk|탁자|테이블|table|식탁/i, '🪵'],
    [/책장|책꽂이|bookshel|서가|책$|book/i, '📚'], [/화분|식물|plant|꽃|flower|나무|tree|선인장/i, '🪴'], [/램프|등$|조명|lamp|light|스탠드|촛|candle|랜턴|lantern/i, '💡'],
    [/거울|mirror/i, '🪞'], [/그림|액자|painting|picture|poster|포스터|사진/i, '🖼️'], [/tv|텔레비전|티비|모니터|monitor|컴퓨터|computer|pc$/i, '📺'], [/시계|clock/i, '🕰️'],
    [/냉장고|fridge|refrigerator/i, '🧊'], [/난로|벽난로|fireplace|stove|화로|히터|heater/i, '🔥'], [/욕조|bath|샤워|shower/i, '🛁'], [/변기|toilet/i, '🚽'], [/러그|카펫|carpet|rug|매트|mat$/i, '🧶'],
    [/커튼|curtain|블라인드/i, '🪟'], [/옷장|장롱|wardrobe|closet|서랍|drawer|수납|선반|shelf|cabinet|캐비닛/i, '🗄️'], [/인형|doll|곰|bear|장난감|toy/i, '🧸'], [/피아노|piano|기타|guitar|악기/i, '🎹'],
    [/상자|box|궤|chest|금고|safe/i, '📦'], [/무기|검|sword|칼|방패|shield|갑옷/i, '⚔️'], [/트로피|trophy|상패|메달/i, '🏆'], [/어항|fish|수조/i, '🐟'], [/쿠션|베개|pillow|cushion/i, '🛌'],
];
const furnIcon = (name) => FURN.find(([re]) => re.test(name))?.[1] ?? '📦';
const ROOM_COLOR = [[/부엌|주방|kitchen|식당|dining/i, '#f3e2b8'], [/욕실|화장실|bath|toilet|세면/i, '#cfe6f2'], [/침실|bedroom|안방|내 방|방$/i, '#f2d9dc'], [/거실|living|응접|라운지|lounge/i, '#e9dcc3'], [/서재|study|도서|작업|work|연구/i, '#dcd2e8'], [/정원|마당|garden|yard|베란다|발코니|테라스|옥상|terrace|balcony|rooftop/i, '#cfe6bf'], [/지하|창고|cellar|basement|storage|다락|attic/i, '#d5d0c6'], [/현관|입구|entrance|hall|복도|corridor/i, '#e4ddd0']];
export function homeSVG(home, selRoom) {
    const rooms = home?.rooms ?? []; if (!rooms.length) return '';
    const lvOf = (r) => (Number.isFinite(r.floor) ? r.floor : 1);
    const levels = [...new Set(rooms.map(lvOf))].sort((x, y) => x - y); // 아래층부터
    const a = 15, b = a * K, wall = 3.6, st = a * 1.3; // st = 방 사이 간격 (앞방 벽이 뒷방 바닥을 가리지 않게 띄운다)
    let out = '', yOff = 0, minX = 0, maxX = 0; const minY = -b - wall - 2;
    const blocks = [];
    for (const lv of levels) {
        const list = rooms.filter(r => lvOf(r) === lv), cols = Math.ceil(Math.sqrt(list.length)), nRows = Math.ceil(list.length / cols);
        const hgt = (cols + nRows - 2) * st * K + 2 * b + wall + 4; // 이 층이 차지하는 세로 길이
        blocks.push({ lv, list, cols, hgt });
    }
    // 위층일수록 화면 위쪽에: 맨 위층부터 아래로 쌓아 그린다
    for (const bl of [...blocks].reverse()) {
        const cells = bl.list.map((r, i) => ({ r, gx: i % bl.cols, gy: Math.floor(i / bl.cols) })).sort((p, q) => (p.gx + p.gy) - (q.gx + q.gy));
        const lab = levels.length > 1 ? `<text class="lv" x="${R(-(Math.ceil(bl.list.length / bl.cols) - 1) * st - a - 2)}" y="${R(yOff + (Math.ceil(bl.list.length / bl.cols) - 1) * st * K + 1)}">${bl.lv < 0 ? `지하 ${-bl.lv}층` : bl.lv === 0 ? '지하' : `${bl.lv}층`}</text>` : '';
        out += lab;
        for (const { r, gx, gy } of cells) {
            const cx = (gx - gy) * st, cy = yOff + (gx + gy) * st * K;
            minX = Math.min(minX, cx - a - 1); maxX = Math.max(maxX, cx + a + 1);
            const on = selRoom && norm(selRoom) === norm(r.name);
            const col = ROOM_COLOR.find(([re]) => re.test(r.name))?.[1] ?? '#ece4d4';
            const items = r.decor.slice(0, 5), spots = [[-6, 0.4], [6, 0.4], [0, -3.2], [-3, -1.4], [3, -1.4]];
            out += `<g class="rm ${on ? 'on' : ''}" data-act="selroom" data-arg="${esc(r.name)}" role="button"><title>${esc(r.name)}${r.decor.length ? ` — ${esc(r.decor.join(', '))}` : ''}</title>
                <g style="--c:${col}">${poly('w-l', [[cx - a, cy], [cx, cy - b], [cx, cy - b - wall], [cx - a, cy - wall]])}${poly('w-r', [[cx + a, cy], [cx, cy - b], [cx, cy - b - wall], [cx + a, cy - wall]])}${flat(cx, cy, a)}</g>
                ${items.map((x, i) => `<text class="fu" x="${R(cx + spots[i][0])}" y="${R(cy + spots[i][1])}">${furnIcon(x)}</text>`).join('')}${r.decor.length > 5 ? `<text class="more" x="${R(cx + 8.5)}" y="${R(cy + 2.4)}">+${r.decor.length - 5}</text>` : ''}
                <text class="nm" x="${cx}" y="${R(cy + b * 0.55)}">${esc(short(r.name, 9))}</text></g>`;
        }
        yOff += bl.hgt;
    }
    const lvPad = levels.length > 1 ? 16 : 0;
    const vb = [R(minX - lvPad), R(minY), R(maxX - minX + lvPad), R(yOff - minY - 6)];
    return `<svg class="ss-iso ss-homeiso" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="집 안 구조">${out}</svg>`;
}
