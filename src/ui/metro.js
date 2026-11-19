// 🚇 노선도 지도 · 🏢 건물 정면도 · 📍 인물 핀 — dev 미트볼 metro.js에서 옮김 (그리기만 · AI 0회 · 토큰 0)
//   장소 = 역, 이어진 곳(near) = 노선. 좌표는 설정집의 x · y(0~100) → 없으면 이어진 순서로 격자에 자동 배치
import { esc, short, norm } from '../base/util.js';
import { PLACE_KINDS } from '../rules/book.js';
export const ROOM_COLOR = [[/부엌|주방|kitchen|식당|dining/i, '#f3e2b8'], [/욕실|화장실|bath|toilet|세면|목욕/i, '#cfe6f2'], [/침실|bedroom|안방|내 방|방$/i, '#f2d9dc'], [/거실|living|응접|라운지|lounge|로비|lobby/i, '#e9dcc3'], [/서재|study|도서|작업|work|연구|사무/i, '#dcd2e8'], [/정원|마당|garden|yard|베란다|발코니|테라스|옥상|terrace|balcony|rooftop/i, '#cfe6bf'], [/지하|창고|cellar|basement|storage|다락|attic/i, '#d5d0c6'], [/현관|입구|entrance|hall|복도|corridor/i, '#e4ddd0'], [/가게|상점|shop|store|매장|카페|cafe/i, '#f6dcc6'], [/병원|의무|clinic|hospital|약국/i, '#d9ecef']];
const R = (v) => Math.round(v * 100) / 100;
export const LINE_COLORS = ['#e5484d', '#2f7de1', '#2fa56b', '#f08c2e', '#8b5bd6', '#16a3a8', '#d6409f', '#8d6e4f', '#6c7a89', '#c2a000'];

// ───── 좌표: 지도 좌표(0~100)를 격자에 맞춘다 (겹치면 가장 가까운 빈 칸) ─────
export const STEP = 12, HALF = STEP / 2;
export function linePos(flatPos, over = {}) {
    const used = new Set(), out = new Map();
    for (const [k] of flatPos) { const o = over?.[k]; if (o && Number.isFinite(o.x) && Number.isFinite(o.y)) { out.set(k, { x: o.x, y: o.y }); used.add(`${o.x / STEP},${o.y / STEP}`); } } // 끌어서 옮겨 둔 역이 먼저 자리를 잡는다
    for (const [k, o] of flatPos) {
        if (out.has(k)) continue;
        const fx = o.x / STEP, fy = o.y / STEP;
        let best = null;
        for (let r = 0; r < 6 && !best; r++) {
            for (let gx = Math.round(fx) - r; gx <= Math.round(fx) + r; gx++) for (let gy = Math.round(fy) - r; gy <= Math.round(fy) + r; gy++) {
                if (used.has(`${gx},${gy}`)) continue;
                const d = Math.hypot(gx - fx, gy - fy);
                if (!best || d < best.d) best = { gx, gy, d };
            }
        }
        best ??= { gx: Math.round(fx), gy: Math.round(fy) };
        used.add(`${best.gx},${best.gy}`);
        out.set(k, { x: best.gx * STEP, y: best.gy * STEP });
    }
    return out;
}

// ───── 길 한 줄: 곧게 가다가 45°로 꺾는다 (모서리는 둥글게) ─────
export const BENDS = { auto: '자동', flip: '반대로 꺾기', straight: '직선', curve: '곡선' };
function octSeg(a, b, bend = 'auto') {
    const dx = b.x - a.x, dy = b.y - a.y, ax = Math.abs(dx), ay = Math.abs(dy), sx = Math.sign(dx), sy = Math.sign(dy);
    const str = () => ({ d: `M${R(a.x)} ${R(a.y)}L${R(b.x)} ${R(b.y)}`, da: Math.atan2(dy, dx), db: Math.atan2(-dy, -dx) });
    if (bend === 'curve') { // 한쪽으로 살짝 휜 곡선
        const len = Math.hypot(dx, dy) || 1, k = Math.min(9, len * 0.28), m = { x: (a.x + b.x) / 2 - (dy / len) * k, y: (a.y + b.y) / 2 + (dx / len) * k };
        return { d: `M${R(a.x)} ${R(a.y)}Q${R(m.x)} ${R(m.y)} ${R(b.x)} ${R(b.y)}`, da: Math.atan2(m.y - a.y, m.x - a.x), db: Math.atan2(m.y - b.y, m.x - b.x) };
    }
    if (bend === 'straight' || !ax || !ay || Math.abs(ax - ay) < 0.01) return str();
    if (bend === 'flip') { const r = octSeg(b, a); const pts = r.d.slice(1).split(/[LQ]/); return { d: revPath(r.d, pts), da: r.db, db: r.da }; } // 비스듬히 먼저 → 곧게
    const dg = Math.min(ax, ay), m = ax > ay ? { x: b.x - sx * dg, y: a.y } : { x: a.x, y: b.y - sy * dg };
    const l1 = Math.hypot(m.x - a.x, m.y - a.y), l2 = Math.hypot(b.x - m.x, b.y - m.y), r = Math.min(3, l1 * 0.6, l2 * 0.6);
    const p1 = { x: m.x - ((m.x - a.x) / l1) * r, y: m.y - ((m.y - a.y) / l1) * r }, p2 = { x: m.x + ((b.x - m.x) / l2) * r, y: m.y + ((b.y - m.y) / l2) * r };
    return { d: `M${R(a.x)} ${R(a.y)}L${R(p1.x)} ${R(p1.y)}Q${R(m.x)} ${R(m.y)} ${R(p2.x)} ${R(p2.y)}L${R(b.x)} ${R(b.y)}`, da: Math.atan2(m.y - a.y, m.x - a.x), db: Math.atan2(m.y - b.y, m.x - b.x) };
}
// 「M p0 L p1 Q m p2 L p3」를 거꾸로 (p3에서 p0으로)
function revPath(d, pts) {
    if (pts.length !== 4) return d;
    const [p0, p1, q, p3] = pts.map(x => x.trim()), [m, p2] = [q.split(' ').slice(0, 2).join(' '), q.split(' ').slice(2).join(' ')];
    return `M${p3}L${p2}Q${m} ${p1}L${p0}`;
}

// ───── 길들을 노선으로 묶는다: 끝역(길이 하나뿐인 곳)에서 출발해 되도록 곧게 이어 간다 → 노선마다 색 ─────
// pairs = [{ a, b, key, route, unk }] (a · b는 장소 이름) · st = mapStyle · o = { edit (꾸미기 중 — 길을 누를 수 있게), sel (고른 길의 key) }
//   → { svg, dirs (이름 → 길이 나가는 방향들), lines (이름 → 지나는 노선 번호들), lineOf (key → 노선 번호), colorOf (key → 색) }
export const EDGE_W = { thin: 1.2, n: 1.9, thick: 2.8 };
export function lineEdges(pairs, pos, st = {}, o = {}) {
    const adj = new Map(), unused = new Map(pairs.map(e => [e.key, e]));
    const add = (n, to, e) => { if (!adj.has(n)) adj.set(n, []); adj.get(n).push({ to, e }); };
    for (const e of pairs) { add(e.a, e.b, e); add(e.b, e.a, e); }
    const left = (n) => adj.get(n).filter(x => unused.has(x.e.key));
    const lineOf = new Map(); let li = 0;
    for (;;) {
        const names = [...adj.keys()].filter(n => left(n).length);
        if (!names.length) break;
        let cur = names.find(n => left(n).length % 2 === 1) ?? names[0], prev = null;
        for (;;) {
            const opts = left(cur); if (!opts.length) break;
            const p = pos.get(cur);
            const turn = (x) => { if (!prev) return 0; const q = pos.get(x.to), a1 = Math.atan2(p.y - prev.y, p.x - prev.x), a2 = Math.atan2(q.y - p.y, q.x - p.x); return Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1))); };
            const nx = opts.reduce((m, x) => (turn(x) < turn(m) ? x : m), opts[0]);
            unused.delete(nx.e.key); lineOf.set(nx.e.key, li); prev = p; cur = nx.to;
        }
        li++;
    }
    const dirs = new Map(), lines = new Map(), colorOf = new Map(); let base = '', top = '', hits = '';
    const note = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
    for (const e of pairs) {
        const es = st?.e?.[e.key] ?? {}, s = octSeg(pos.get(e.a), pos.get(e.b), BENDS[es.bend] ? es.bend : 'auto'), n = lineOf.get(e.key);
        const c = /^#[0-9a-f]{6}$/i.test(es.c ?? '') ? es.c : LINE_COLORS[n % LINE_COLORS.length], w = EDGE_W[es.w] ?? EDGE_W.n;
        colorOf.set(e.key, c);
        note(dirs, e.a, s.da); note(dirs, e.b, s.db); note(lines, e.a, n); note(lines, e.b, n);
        base += `<path class="ln ${e.unk ? 'unk' : ''} ${o.sel === e.key ? 'sel' : ''}" data-k="${esc(e.key)}" style="--c:${c};--w:${w}" d="${s.d}"/>`;
        if (e.route) top += `<path class="ln route" d="${s.d}"/>`;
        if (o.edit) hits += `<path class="ln hit" data-act="mapedsel" data-arg="e:${esc(e.key)}" d="${s.d}"><title>${esc(e.a)} ↔ ${esc(e.b)}</title></path>`;
    }
    return { svg: base + top + hits, dirs, lines, lineOf, colorOf };
}

// ───── 📍 인물 핀: 역 위에 뜨는 말풍선 (이모지 넷까지 · 더 있으면 +n) — list = [{ e, name }] · (cx, tipY) = 꼬리 끝 ─────
export function pinBubble(cx, tipY, list) {
    if (!list?.length) return '';
    const shown = list.slice(0, 4), more = list.length - shown.length, n = shown.length + (more > 0 ? 1 : 0);
    const w = n * 4.3 + 1.4, h = 5.6, x = cx - w / 2, y = tipY - 1.5 - h;
    return `<g class="pins"><title>${esc(list.map(p => p.name).join(', '))}</title><path class="tail" d="M${R(cx - 1.1)} ${R(y + h - 0.2)}L${R(cx)} ${R(tipY)}L${R(cx + 1.1)} ${R(y + h - 0.2)}z"/><rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${h}" rx="2.8"/>
        ${shown.map((p, i) => `<text class="pe" x="${R(x + 0.7 + 2.15 + i * 4.3)}" y="${R(y + 4.05)}">${esc(p.e)}</text>`).join('')}${more > 0 ? `<text class="pm" x="${R(x + 0.7 + 2.15 + shown.length * 4.3)}" y="${R(y + 3.75)}">+${more}</text>` : ''}</g>`;
}


// ───── 역 (장소) — dev lineNodes를 줄여 옮김: 이름표는 길 · 다른 이름표와 안 겹치는 쪽으로 ─────
function stn(cx, cy, r) { return `<circle class="stn" cx="${cx}" cy="${cy}" r="${r}"/>`; }
const textW = (t) => { let w = 0; for (const ch of String(t)) w += ch.codePointAt(0) > 0x2000 ? 3.4 : 2; return w; };
const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
export function lineNodes(places, o) {
    const taken = places.map(p => { const q = o.pos.get(p.name); return [q.x - 3, q.y - 3, 6, 6]; });
    const ext = [Infinity, Infinity, -Infinity, -Infinity], grow = (b) => { ext[0] = Math.min(ext[0], b[0]); ext[1] = Math.min(ext[1], b[1]); ext[2] = Math.max(ext[2], b[0] + b[2]); ext[3] = Math.max(ext[3], b[1] + b[3]); };
    const svg = [...places].sort((a, b) => (o.pos.get(a.name).y - o.pos.get(b.name).y) || (o.pos.get(a.name).x - o.pos.get(b.name).x)).map(p => {
        const { x: cx, y: cy } = o.pos.get(p.name);
        const here = norm(p.name) === norm(o.here), isSel = o.sel === p.name;
        const ls = [...new Set(o.net.lines.get(p.name) ?? [])], xfer = ls.length > 1;
        const pins = o.pins?.(p) ?? [];
        const ico = PLACE_KINDS[p.kind] ?? '📍', nm = short(p.name, 9), txt = `${ico} ${nm}`, w = textW(txt) + 1;
        const dirs = o.net.dirs.get(p.name) ?? [];
        const cands = [['b', 0, 6.6, 'middle', Math.PI / 2], ['t', 0, -4.4, 'middle', -Math.PI / 2], ['r', 4.4, 1.15, 'start', 0], ['l', -4.4, 1.15, 'end', Math.PI]]
            .filter(c => !(pins.length && c[0] === 't'))
            .map(([k, dx, dy, anchor, ang], i) => {
                const box = [anchor === 'middle' ? cx - w / 2 : anchor === 'start' ? cx + dx : cx + dx - w, cy + dy - 3.1, w, 4.2];
                const free = dirs.length ? Math.min(...dirs.map(d => Math.abs(Math.atan2(Math.sin(d - ang), Math.cos(d - ang))))) : Math.PI;
                return { k, dx, dy, anchor, box, score: Math.min(free, 1.6) - taken.filter(t => hit(box, t)).length * 4 - i * 0.05 };
            });
        const lb = cands.reduce((m, c) => (c.score > m.score ? c : m), cands[0]);
        taken.push(lb.box); grow(lb.box); grow([cx - 6, cy - (pins.length ? 12 : 6), 12, pins.length ? 18 : 12]);
        const c = ls.length ? LINE_COLORS[ls[0] % LINE_COLORS.length] : 'var(--sub)';
        return `<g class="node ${here ? 'here' : ''} ${isSel ? 'sel' : ''} ${xfer ? 'xfer' : ''}" style="--c:${c}" data-act="mapsel" data-v="${esc(p.name)}">
            <circle class="hitbox" cx="${cx}" cy="${cy}" r="5"/>${here ? `<circle class="ring" cx="${cx}" cy="${cy}" r="5.2"/>` : ''}${isSel ? `<circle class="halo" cx="${cx}" cy="${cy}" r="${xfer ? 4.3 : 3.8}"/>` : ''}
            ${stn(cx, cy, xfer ? 2.9 : 2.3)}${here ? `<circle class="me" cx="${cx}" cy="${cy}" r="1.25"/>` : ''}
            <text class="lb" x="${R(cx + lb.dx)}" y="${R(cy + lb.dy)}" style="text-anchor:${lb.anchor}"><tspan class="pi">${esc(ico)} </tspan><tspan class="pn">${esc(nm)}</tspan>${p.floors?.length ? `<tspan class="pf"> ${p.floors.length}층</tspan>` : ''}</text>
            ${pinBubble(cx, cy - 3.2, pins)}</g>`;
    }).join('');
    return { svg, ext };
}
// ───── 자리 잡기: x · y가 있으면 그대로, 없으면 이어진 곳을 따라 격자에 (오른쪽 → 아래 → 위 → 왼쪽 → 대각선) ─────
export function layout(places) {
    const flat = new Map(), names = places.map(p => p.name), byN = new Map(places.map(p => [norm(p.name), p]));
    const adj = new Map(names.map(n => [n, new Set()]));
    for (const p of places) for (const q of p.near ?? []) { const t = byN.get(norm(q)); if (t && t.name !== p.name) { adj.get(p.name).add(t.name); adj.get(t.name).add(p.name); } }
    const used = new Set(), put = (n, gx, gy) => { flat.set(n, { x: gx * STEP, y: gy * STEP }); used.add(`${gx},${gy}`); };
    const D = [[1, 0], [0, 1], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const p of places) if (Number.isFinite(p.x) && Number.isFinite(p.y)) put(p.name, Math.round(p.x / STEP), Math.round(p.y / STEP));
    let col = 0;
    for (const start of names) {
        if (flat.has(start)) continue;
        put(start, col, 3); const q = [start];
        while (q.length) {
            const cur = q.shift(), c = flat.get(cur), cx = c.x / STEP, cy = c.y / STEP;
            for (const nb of adj.get(cur)) {
                if (flat.has(nb)) continue;
                const d = D.find(([dx, dy]) => !used.has(`${cx + dx * 2},${cy + dy * 2}`) && !used.has(`${cx + dx},${cy + dy}`)) ?? [1, 0];
                let gx = cx + d[0] * 2, gy = cy + d[1] * 2; while (used.has(`${gx},${gy}`)) gx += 2;
                put(nb, gx, gy); q.push(nb);
            }
        }
        col = Math.max(...[...flat.values()].map(v => v.x / STEP)) + 3;
    }
    const pos = linePos([...flat]);
    // 이어진 곳이 하나도 없으면 설정집 순서대로 한 노선으로 잇는다
    let pairs = [];
    const seen = new Set();
    for (const [a, s] of adj) for (const b of s) { const k = [a, b].sort().join('|'); if (!seen.has(k)) { seen.add(k); pairs.push({ a, b, key: k }); } }
    if (!pairs.length) for (let i = 1; i < names.length; i++) pairs.push({ a: names[i - 1], b: names[i], key: `${names[i - 1]}|${names[i]}`, unk: true });
    return { pos, pairs, adj };
}
// 지금 자리 → 고른 자리 가장 짧은 길 (역 이름들)
export function route(adj, from, to) {
    if (!from || !to || from === to || !adj.has(from)) return [];
    const prev = new Map([[from, null]]), q = [from];
    while (q.length) { const c = q.shift(); if (c === to) break; for (const n of adj.get(c) ?? []) if (!prev.has(n)) { prev.set(n, c); q.push(n); } }
    if (!prev.has(to)) return [];
    const out = []; for (let c = to; c; c = prev.get(c)) out.unshift(c); return out;
}
// 「2층: 병원, 약국」 「지하 1층 창고」 → [{ name, rooms }] (아래층부터)
export function floorsOf(list) {
    const lv = (s) => { const t = String(s); if (/옥상|루프|roof/i.test(t)) return 999; const m = /(지하|b)\s*(\d*)/i.exec(t); if (m) return -Number(m[2] || 1); const n = /(\d+)\s*(층|f)/i.exec(t); return n ? Number(n[1]) : 1; };
    return (list ?? []).map(s => { const [h, rest] = String(s).split(/[:：]/); const rooms = (rest ?? '').split(/[,·、]/).map(x => x.trim()).filter(Boolean).map(name => ({ name })); return { name: h.trim(), rooms, k: lv(h) }; }).sort((a, b) => a.k - b.k);
}
// ───── 🏢 정면도: 건물을 앞에서 자른 그림 — 모든 층 · 방이 한 장에 ─────
// fls = [{ name, rooms: [{ name, items? }] }] (아래층부터) · o = { act ('spot' | 'selroom' | ''), on(f, r), arg(f, r), at(f) → 지금 있는 층인가, home (집이면 박공지붕), me (지금 여기에 띄울 이모지), pinsAt(f, r) → 그 칸에 띄울 인물 [{ e, name }] }
const UNDER = /지하|basement|cellar|^b\d/i, DECK = /^(옥상|루프탑|rooftop|roof\b)/i, HALL = /복도|통로|corridor|hallway|홀$|^hall$|계단|stairs?$/i;
const LV = /^(지하\s*\d*\s*층?|b\d+f?|\d+\s*층|\d+f|옥상|옥탑|루프탑|다락방?|rooftop|roof|attic|basement|로비|lobby)\s*/i;
// 「2층 병원」 → 층 이름표 「2층」 + 칸 안 글 「병원」
function splitLv(name) {
    const s = String(name).trim(), m = s.match(LV);
    if (!m) return ['', s];
    return [m[1].replace(/\s+/g, ' ').trim(), s.slice(m[0].length).trim()];
}
export function elevSVG(fls, o = {}) {
    if (!fls?.length) return '';
    const W = 130, GUT = 21, X0 = 23, BW = 103, XE = X0 + BW;
    const shaft = fls.length >= 2 ? 9 : 0; // 🪜 계단실 (두 층부터)
    const rows = [...fls].reverse().map((f, i, all) => {
        const rooms = f.rooms.length ? f.rooms : [{ name: f.name, whole: true }], two = rooms.length > 6, k = Math.ceil(rooms.length / 2);
        const deck = i === 0 && all.length > 1 && !f.rooms.length && DECK.test(f.name); // 맨 위 옥상은 벽 없이 난간만
        return { f, lines: two ? [rooms.slice(0, k), rooms.slice(k)] : [rooms], h: deck ? 13 : two ? 34 : 22, deck, under: UNDER.test(f.name) };
    });
    let gi = rows.length; while (gi > 0 && rows[gi - 1].under) gi--; // gi번째 줄부터 땅 밑
    const roofH = rows[0].deck || gi === 0 ? 0 : o.home ? 14 : 4;
    let y = 5 + roofH; for (const r of rows) { r.y = y; y += r.h; }
    const bottom = y, encY = rows[0].deck ? rows[1].y : rows[0].y, groundY = gi < rows.length ? rows[gi].y : bottom;
    let cells = '', deco = '', labels = '';
    rows.forEach((row, ri) => {
        const { f } = row, [tag, rest] = splitLv(f.name), at = !!o.at?.(f), bw = BW - (row.deck ? 0 : shaft), ch = row.h / row.lines.length;
        row.lines.forEach((line, li) => {
            const w = bw / line.length, cy = row.y + li * ch;
            line.forEach((r, i) => {
                const x = X0 + i * w, on = !!o.on?.(f, r), name = r.whole ? rest : r.name, items = (r.items ?? []).slice(0, Math.max(2, Math.floor(w / 5.5)));
                const col = row.under ? '#d5d0c6' : HALL.test(r.name) ? '#e9e4da' : ROOM_COLOR.find(([re]) => re.test(r.name))?.[1] ?? '#f4eee2';
                const pp = o.pinsAt?.(f, r) ?? [], ppTxt = pp.length ? pp.slice(0, w < 24 ? 2 : 4).map(p => p.e).join('') + (pp.length > (w < 24 ? 2 : 4) ? `+${pp.length - (w < 24 ? 2 : 4)}` : '') : '';
                const hereTxt = on && o.act === 'spot' ? (w < 24 ? (o.me || '●') : `${o.me || '●'} 지금 여기`) : '';
                cells += `<g class="rm ${on ? 'on' : ''} ${o.act ? 'can' : ''} ${row.deck ? 'deck' : ''}" ${o.act ? `data-act="${o.act}" data-arg="${esc(o.arg ? o.arg(f, r) : r.name)}" role="button"` : ''}><title>${esc(r.whole ? f.name : `${f.name} · ${r.name}`)}${r.items?.length ? ` — ${esc(r.items.join(', '))}` : ''}</title>
                    <rect x="${R(x)}" y="${R(cy)}" width="${R(w)}" height="${R(ch)}" style="--c:${col}"/>
                    ${name ? `<text class="nm" x="${R(x + w / 2)}" y="${R(cy + ch / 2 + (items.length || hereTxt ? -1.6 : 1.4))}">${esc(short(name, Math.max(3, Math.floor(w / 3.9))))}</text>` : ''}
                    ${items.length ? `<text class="fu" x="${R(x + w / 2)}" y="${R(cy + ch / 2 + 4.6)}">${items.join('')}${r.items.length > items.length ? '…' : ''}</text>` : ''}
                    ${hereTxt ? `<text class="here" x="${R(x + w / 2)}" y="${R(cy + ch - (items.length ? 0.9 : 3))}">${esc(hereTxt)}</text>` : ''}
                    ${ppTxt ? `<g class="pp"><title>${esc(pp.map(p => p.name).join(', '))}</title><text x="${R(x + w - 1.2)}" y="${R(cy + 4.3)}">${esc(ppTxt)}</text></g>` : ''}</g>`;
            });
        });
        if (row.deck) deco += `<path class="rail" d="M${X0} ${R(row.y + row.h)}V${R(row.y + 5)}H${XE}V${R(row.y + row.h)}"/>${[1, 2, 3, 4, 5, 6, 7].map(k => `<line class="rail p" x1="${R(X0 + (BW * k) / 8)}" y1="${R(row.y + 5)}" x2="${R(X0 + (BW * k) / 8)}" y2="${R(row.y + row.h)}"/>`).join('')}`;
        else {
            if (shaft) { const sx = XE - shaft, up = ri % 2 === 0; deco += `<rect class="shaft" x="${R(sx)}" y="${R(row.y)}" width="${shaft}" height="${row.h}"/><path class="st" d="M${R(sx + 1.4)} ${R(up ? row.y + row.h - 1.4 : row.y + 1.4)}L${R(XE - 1.4)} ${R(up ? row.y + 1.4 : row.y + row.h - 1.4)}"/>`; }
            if (row.y > encY) deco += `<line class="slab" x1="${X0}" y1="${R(row.y)}" x2="${XE}" y2="${R(row.y)}"/>`;
        }
        const lab = tag || short(f.name, 5);
        labels += `<g class="lv ${at ? 'on' : ''}"><title>${esc(f.name)}</title><text x="${GUT - 1.5}" y="${R(row.y + row.h / 2 + 1.4)}">${esc(short(lab, 5))}</text></g>`;
    });
    const roof = !roofH ? '' : o.home ? `<polygon class="roof" points="${X0 - 3},${encY} ${R(X0 + BW / 2)},${R(encY - 13)} ${XE + 3},${encY}"/>` : `<rect class="roof" x="${X0 - 2}" y="${R(encY - 3.6)}" width="${BW + 4}" height="3.6" rx=".8"/>`;
    const earth = groundY < bottom ? `<rect class="earth" x="0" y="${R(groundY)}" width="${W}" height="${R(bottom - groundY + 5)}"/>` : '';
    return `<svg class="ss-elev" viewBox="0 0 ${W} ${R(bottom + 5)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="건물 정면도">${earth}${cells}${deco}
        <rect class="outer" x="${X0}" y="${R(encY)}" width="${BW}" height="${R(bottom - encY)}"/>${roof}<line class="ground" x1="0" y1="${R(groundY)}" x2="${W}" y2="${R(groundY)}"/>${labels}</svg>`;
}
