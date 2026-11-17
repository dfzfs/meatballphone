// 🧊 입체 그림 (v2.9) — 본거지 집 안 구조를 비스듬히 내려다본 미니어처로 그린다 · 건물 층 읽기 (지도는 노선도 하나 — metro.js)
//   · SVG만 쓴다 (3D 엔진 · 외부 라이브러리 없음) · AI 0회 · 토큰 0 · 저장하는 것 없음 (그리기만)
//   · 색: 면마다 --c 하나에서 윗면(밝게) · 왼면 · 오른면(어둡게)을 CSS가 섞어 만든다 (css/patches.css의 .ss-iso)
import { esc, short, norm } from './core.js';

const K = 0.58; // 마름모 세로/가로 비율
const R = (v) => Math.round(v * 100) / 100;
const P = (pts) => pts.map(([x, y]) => `${R(x)},${R(y)}`).join(' ');
const poly = (cls, pts) => `<polygon class="${cls}" points="${P(pts)}"/>`;

// ───── 기본 모양 ─────
const flat = (cx, cy, a, cls = 'f-t') => poly(cls, [[cx, cy - a * K], [cx + a, cy], [cx, cy + a * K], [cx - a, cy]]);
// 층 한 줄 「2층: 교실/복도/화장실」 → 이름 「2층」 · 방 [교실, 복도, 화장실] (방은 / · | 로 나눔 · 안 적으면 통째로 한 칸)
export function parseFloors(floors) {
    return (floors ?? []).slice(0, 12).map(x => {
        const str = String(x), k = str.search(/[:：]/);
        const name = (k < 0 ? str : str.slice(0, k)).trim(), rest = k < 0 ? '' : str.slice(k + 1);
        return { name: name || str.trim(), rooms: rest.split(/[\/·|]/).map(r => r.trim()).filter(Boolean).slice(0, 12).map(r => ({ name: r })) };
    }).filter(f => f.name);
}
// 「지금 여기」(spot)가 가리키는 층 — 층 이름으로 시작하는 것 중 가장 길게 맞는 하나 (「2층 교실」 → 「2층」)
export function spotFloor(fls, spot) {
    const sp = norm(spot ?? ''); if (!sp) return null;
    return fls.filter(f => norm(f.name) && sp.startsWith(norm(f.name))).sort((x, y) => norm(y.name).length - norm(x.name).length)[0] ?? null;
}
// 본거지 방들을 층별로 (층을 안 적은 방은 1층) — 아래층부터
export function homeFloors(home) {
    const lvOf = (r) => (Number.isFinite(r.floor) ? r.floor : 1);
    const rooms = home?.rooms ?? [];
    return [...new Set(rooms.map(lvOf))].sort((x, y) => x - y).map(lv => ({ name: lv < 0 ? `지하 ${-lv}층` : lv === 0 ? '지하' : `${lv}층`, rooms: rooms.filter(r => lvOf(r) === lv).map(r => ({ name: r.name, items: r.decor })) }));
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
export const furnIcon = (name) => FURN.find(([re]) => re.test(name))?.[1] ?? '📦';
export const ROOM_COLOR = [[/부엌|주방|kitchen|식당|dining/i, '#f3e2b8'], [/욕실|화장실|bath|toilet|세면/i, '#cfe6f2'], [/침실|bedroom|안방|내 방|방$/i, '#f2d9dc'], [/거실|living|응접|라운지|lounge/i, '#e9dcc3'], [/서재|study|도서|작업|work|연구/i, '#dcd2e8'], [/정원|마당|garden|yard|베란다|발코니|테라스|옥상|terrace|balcony|rooftop/i, '#cfe6bf'], [/지하|창고|cellar|basement|storage|다락|attic/i, '#d5d0c6'], [/현관|입구|entrance|hall|복도|corridor/i, '#e4ddd0']];
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
