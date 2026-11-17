// 🖌 도트 편집기 (v2.9) — 인형의 머리 · 옷 · 장신구 · 덧그림을 칸 단위로 직접 찍는다. 「그리기」를 누를 때만 불러온다 (life.js).
//   찍은 그림은 설정(settings().dollArt)에 모아 둔다 → 어느 채팅에서나 꺼내 쓴다. 코드(글자)로 내보내고 받아 올 수 있다.
//   그림 파일을 올리면 32×42칸으로 줄여서 칸에 옮겨 준다 (그 뒤에 손으로 고친다).
import { settings, saveSettings, esc } from './core.js';
import { choosePopup } from './kit.js';

const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
const PALETTE = ['#2f2a2a', '#5a4636', '#8a6a4a', '#c9b38a', '#f7f4ee', '#aab2bd', '#6b7280', '#ffe3cc', '#e3ae82', '#8a5a3c', '#e2524a', '#e8853a', '#e8b93a', '#f2df8a', '#5aa85a', '#9ac86a', '#3aa3a3', '#4a8fe2', '#8ac6f2', '#5a6ad6', '#9a6ad6', '#c9a0e8', '#e26aa8', '#f5b6c8'];

// opt = { DL, id?, kind, ghost(밑에 깔 인형 그림 HTML) } → 저장하면 그 id, 아니면 null
export async function editArt({ DL, id = '', kind = 'over', ghost = '' }) {
    const lib = (settings().dollArt ??= {}), old = lib[id] ?? null;
    const W = DL.W, H = DL.H;
    let g = old ? DL.decodeArt(old) : Array.from({ length: H }, () => Array(W).fill(''));
    let color = '#e2524a', tool = 'pen', mirror = false, down = false, last = null; const undo = [];
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-de';
    box.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-paintbrush"></i><div><b>${esc(DL.ART_KINDS[old?.kind ?? kind] ?? '그림')} 직접 그리기</b><small>칸을 눌러 찍어요 · 흐린 인형은 자리 맞추기용</small></div></div>
        <label class="ss-de-name"><span>이름</span><input class="text_pole" type="text" maxlength="24" value="${esc(old?.n ?? '')}" placeholder="예: 내 후드티"></label>
        <div class="ss-de-stage"><div class="ss-de-ghost">${ghost}</div><canvas width="${W * 8}" height="${H * 8}" aria-label="그림 칸"></canvas></div>
        <div class="ss-de-tools">
            <button type="button" class="ss-pill on" data-de="tool:pen"><i class="fa-solid fa-pen"></i> 찍기</button>
            <button type="button" class="ss-pill" data-de="tool:erase"><i class="fa-solid fa-eraser"></i> 지우기</button>
            <button type="button" class="ss-pill" data-de="tool:fill"><i class="fa-solid fa-fill-drip"></i> 채우기</button>
            <button type="button" class="ss-pill" data-de="tool:pick"><i class="fa-solid fa-eye-dropper"></i> 색 뽑기</button>
            <button type="button" class="ss-pill" data-de="mirror"><i class="fa-solid fa-arrows-left-right"></i> 좌우 같이</button>
            <button type="button" class="ss-pill" data-de="undo"><i class="fa-solid fa-rotate-left"></i> 되돌리기</button>
            <button type="button" class="ss-pill" data-de="clear"><i class="fa-solid fa-trash"></i> 다 지우기</button>
        </div>
        <div class="ss-sws ss-de-pal">${PALETTE.map(c => `<button type="button" class="ss-sw" data-de="color:${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}<label class="ss-de-any" title="아무 색"><input type="color" value="${color}"><i class="fa-solid fa-palette"></i></label></div>
        <div class="ss-row-btns"><label class="ss-btn sm"><i class="fa-solid fa-image"></i> 그림 파일 올려서 옮기기<input type="file" accept="image/*" hidden></label></div>
        <details class="ss-de-code"><summary>코드로 주고받기</summary><textarea class="text_pole" rows="3" placeholder="받은 코드를 붙여 넣고 「코드 불러오기」"></textarea>
            <div class="ss-row-btns"><button type="button" class="ss-btn sm" data-de="export">지금 그림을 코드로</button><button type="button" class="ss-btn sm" data-de="import">코드 불러오기</button></div></details>
        <div class="ss-row-btns"><button type="button" class="ss-btn pri" data-choice="save"><i class="fa-solid fa-floppy-disk"></i> 저장</button></div>`;
    const cv = box.querySelector('canvas'), c2 = cv.getContext('2d'), ta = box.querySelector('textarea'), any = box.querySelector('input[type=color]');
    const draw = () => {
        c2.clearRect(0, 0, cv.width, cv.height);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) { c2.fillStyle = g[y][x]; c2.fillRect(x * 8, y * 8, 8, 8); }
        c2.strokeStyle = 'rgba(120,120,140,.22)'; c2.lineWidth = 1; c2.beginPath();
        for (let x = 0; x <= W; x += 4) { c2.moveTo(x * 8 + 0.5, 0); c2.lineTo(x * 8 + 0.5, H * 8); }
        for (let y = 0; y <= H; y += 4) { c2.moveTo(0, y * 8 + 0.5); c2.lineTo(W * 8, y * 8 + 0.5); }
        c2.stroke();
    };
    const snap = () => { undo.push(g.map(r => r.slice())); if (undo.length > 40) undo.shift(); };
    const setColor = (c) => { color = c; any.value = c; box.querySelectorAll('[data-de^="color:"]').forEach(b => b.classList.toggle('on', b.dataset.de === `color:${c}`)); };
    const setTool = (t) => { tool = t; box.querySelectorAll('[data-de^="tool:"]').forEach(b => b.classList.toggle('on', b.dataset.de === `tool:${t}`)); };
    const put = (x, y, v) => { if (x < 0 || y < 0 || x >= W || y >= H) return; g[y][x] = v; if (mirror) g[y][W - 1 - x] = v; };
    const fill = (x, y, v) => { const from = g[y][x]; if (from === v) return; const st = [[x, y]]; while (st.length) { const [a, b] = st.pop(); if (a < 0 || b < 0 || a >= W || b >= H || g[b][a] !== from) continue; g[b][a] = v; st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); } };
    const cell = (e) => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)]; };
    const act = (e) => {
        const [x, y] = cell(e); if (x < 0 || y < 0 || x >= W || y >= H) return;
        if (tool === 'pick') { if (g[y][x]) { setColor(g[y][x]); setTool('pen'); } return; }
        if (tool === 'fill') fill(x, y, color);
        else { // 빨리 그어도 칸이 안 끊기게 지난 칸에서 이번 칸까지 이어서 찍는다
            const v = tool === 'erase' ? '' : color, [px, py] = last ?? [x, y], n = Math.max(Math.abs(x - px), Math.abs(y - py), 1);
            for (let i = 0; i <= n; i++) put(Math.round(px + (x - px) * i / n), Math.round(py + (y - py) * i / n), v);
            last = [x, y];
        }
        draw();
    };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); down = true; last = null; try { cv.setPointerCapture(e.pointerId); } catch { /* 없어도 됨 */ } if (tool !== 'pick') snap(); act(e); });
    cv.addEventListener('pointermove', (e) => { if (down && (tool === 'pen' || tool === 'erase')) act(e); });
    ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { down = false; last = null; }));
    any.addEventListener('input', () => setColor(any.value));
    box.querySelector('input[type=file]').addEventListener('change', (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        const im = new Image(), url = URL.createObjectURL(f);
        im.onload = () => {
            const t = document.createElement('canvas'); t.width = W; t.height = H; const x2 = t.getContext('2d');
            const k = Math.min(W / im.width, H / im.height), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
            x2.imageSmoothingEnabled = k < 1; x2.drawImage(im, Math.floor((W - w) / 2), H - h, w, h); URL.revokeObjectURL(url);
            const d = x2.getImageData(0, 0, W, H).data; snap();
            // 색 수를 줄여 둔다 (칸마다 조금씩 다른 색이면 저장이 커지고 손으로 고치기 어렵다)
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; g[y][x] = d[o + 3] < 128 ? '' : `#${hex2(Math.round(d[o] / 17) * 17)}${hex2(Math.round(d[o + 1] / 17) * 17)}${hex2(Math.round(d[o + 2] / 17) * 17)}`; }
            draw();
        };
        im.onerror = () => URL.revokeObjectURL(url);
        im.src = url; e.target.value = '';
    });
    box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-de]'); if (!b) return;
        const [k, v] = [b.dataset.de.split(':')[0], b.dataset.de.split(':').slice(1).join(':')];
        if (k === 'tool') setTool(v);
        else if (k === 'color') { setColor(v); if (tool !== 'fill') setTool('pen'); }
        else if (k === 'mirror') { mirror = !mirror; b.classList.toggle('on', mirror); }
        else if (k === 'undo') { const p = undo.pop(); if (p) { g = p; draw(); } }
        else if (k === 'clear') { snap(); g = Array.from({ length: H }, () => Array(W).fill('')); draw(); }
        else if (k === 'export') { ta.value = JSON.stringify({ meatballArt: 1, n: box.querySelector('.ss-de-name input').value.trim(), kind: old?.kind ?? kind, ...DL.encodeArt(g) }); ta.select(); try { navigator.clipboard?.writeText(ta.value)?.catch(() => {}); } catch { /* 직접 복사하면 됨 */ } }
        else if (k === 'import') { try { const j = JSON.parse(ta.value); if (!j || !Array.isArray(j.pal) || typeof j.px !== 'string') throw new Error('x'); snap(); g = DL.decodeArt(j); if (j.n && !box.querySelector('.ss-de-name input').value) box.querySelector('.ss-de-name input').value = String(j.n).slice(0, 24); draw(); } catch { ta.value = ''; ta.placeholder = '코드를 읽지 못했어요 — 처음부터 끝까지 그대로 붙여 넣어 주세요'; } }
    });
    setColor(color); draw();
    const pick = await choosePopup(box, '닫기'); if (pick !== 'save') return null;
    if (!g.some(r => r.some(Boolean))) return null;
    const nid = id || `a${Date.now().toString(36)}`, k2 = old?.kind ?? kind;
    lib[nid] = { n: box.querySelector('.ss-de-name input').value.trim().slice(0, 24) || `${DL.ART_KINDS[k2] ?? '그림'} ${Object.keys(lib).length + (old ? 0 : 1)}`, kind: k2, rev: (old?.rev ?? 0) + 1, ...DL.encodeArt(g) };
    saveSettings();
    return nid;
}
