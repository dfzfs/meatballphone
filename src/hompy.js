// 📒 미니홈피 화면 (v2.8): 상태창을 전체화면으로 열면 수첩 모양의 「홈피」로 보여 준다 (설정 hompyFull · 기본 켬)
// 안쪽(오른쪽 쪽)은 평소 상태창 그대로 — 틀만 씌운다: 주소창 · 수첩 표지 · 왼쪽 프로필 쪽 · 링 · 오른쪽 색인 탭
// 계산은 없음(화면만) · 그림은 img/meatcon/ 의 미트볼콘 (폴더 이름을 con으로 하면 윈도우에서 못 만든다 — 예약된 이름)
import { app, esc, short, fmtNum, modOn, relAxes, ctx, TITLE, dateShort, getMeta, saveMeta, ssErr, settings, saveSettings } from './core.js';
import { avatar, askInput, choosePopup } from './kit.js';
import { shrinkImage, MINI, miniWidgets } from './tiles.js';

export const conUrl = (n) => new URL(`../img/meatcon/${n}.webp`, import.meta.url).href;
export const CONS = ['hi', 'proud', 'heart', 'pray', 'focus', 'groom', 'blank', 'roll', 'box', 'blanket', 'tongue', 'sulk', 'sad', 'gasp'];
// 프로필 그림: 설정 hpFace — 'auto'(기분 따라 · 기본) · 'con:이름'(기본 이모티콘) · 'my:번호'(내가 올린 그림 · settings().hpFaces · 최대 12장 · 모든 채팅 공통)
function faceSrc(autoCon) {
    const f = String(settings().hpFace ?? 'auto');
    if (f.startsWith('con:') && CONS.includes(f.slice(4))) return conUrl(f.slice(4));
    if (f.startsWith('my:')) { const src = settings().hpFaces?.[Number(f.slice(3))]; if (src) return src; }
    return conUrl(autoCon);
}
async function pickFace(redraw) {
    const set = settings(), cur = String(set.hpFace ?? 'auto'), mine = set.hpFaces ?? [];
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-hp-pick';
    const cell = (v, inner, title = '') => `<button class="ss-hp-face ${cur === v ? 'on' : ''}" data-choice="${v}" title="${esc(title)}">${inner}</button>`;
    box.innerHTML = `<h3>프로필 그림 고르기</h3><p class="ss-hint">「기분 따라」는 지금 상태에 맞춰 알아서 바뀌어요. 내 그림은 12장까지 올릴 수 있고 모든 채팅에서 같이 써요.</p>
        <div class="ss-hp-faces">${cell('auto', '<span>기분<br>따라</span>', '상태에 따라 자동')}${CONS.map(n => cell(`con:${n}`, `<img src="${conUrl(n)}" alt="">`)).join('')}</div>
        <h4>내 그림</h4><div class="ss-hp-faces">${mine.map((src, i) => `<span class="ss-hp-mine">${cell(`my:${i}`, `<img src="${esc(src)}" alt="">`)}<button class="ss-ib" data-choice="del:${i}" title="이 그림 지우기"><i class="fa-solid fa-xmark"></i></button></span>`).join('')}${mine.length < 12 ? cell('upload', '<span><i class="fa-solid fa-plus"></i><br>올리기</span>', '내 그림 올리기') : ''}</div>`;
    const pick = await choosePopup(box, '닫기'); if (!pick) return;
    if (pick.startsWith('del:')) { const i = Number(pick.slice(4)); set.hpFaces = mine.filter((_, k) => k !== i); const c = cur.startsWith('my:') ? Number(cur.slice(3)) : -1; set.hpFace = c === i ? 'auto' : c > i ? `my:${c - 1}` : cur; saveSettings(); redraw(); return pickFace(redraw); }
    if (pick === 'upload') {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async () => { try { const f = inp.files?.[0]; if (!f) return; set.hpFaces = [...(set.hpFaces ?? []), await shrinkImage(f, 320, 0.85)].slice(0, 12); set.hpFace = `my:${set.hpFaces.length - 1}`; saveSettings(); redraw(); } catch (err) { ssErr(err); toastr.error('그림을 넣지 못했어요. 다른 그림으로 해 보세요.', TITLE); } };
        inp.click(); return;
    }
    set.hpFace = pick; saveSettings(); redraw();
}
// 🎨 꾸미기 (모든 채팅 공통): 색 · 바탕 무늬 · 글꼴 · 보일 창
export const THEMES = [['분홍', 340, 1], ['회색', 260, 0.08], ['하늘', 215, 1], ['민트', 150, 0.8], ['빨강', 2, 1], ['살구', 22, 1], ['노랑', 46, 1], ['보라', 268, 1]];
export const PATTERNS = { grid: '모눈', dot: '물방울', stripe: '줄무늬', none: '없음' };
const themeOf = () => THEMES[Number(settings().hpTheme) || 0] ?? THEMES[0];
const patOf = () => (PATTERNS[settings().hpPattern] ? settings().hpPattern : 'grid');
// 🪟 HUD · 미니창 · 보통 상태창에도 같은 색 · 테두리 (설정 hpSkinHud · 기본 켬): body에 색 값과 표시를 걸어 둔다
export function applyRetro() {
    const b = document.body; if (!b) return; const [, h, s] = themeOf(), on = settings().hpSkinHud !== false;
    b.classList.toggle('ss-retro', on); b.classList.toggle('ss-retro-dot', on && settings().hpDot !== false);
    b.style.setProperty('--hp-h', String(h)); b.style.setProperty('--hp-s', String(s));
    b.style.setProperty('--hp-fs', `${FS[fsOf()]}px`); // 다른 창(도우미 등)의 글씨 크기도 같이
}
// 창 하나하나의 자리: settings().hpLayout = { l: [왼쪽 줄 순서], r: [오른쪽 줄 순서], off: [숨긴 창], main: 'c'|'l'|'r'(가운데 창 위치), lw · rw: 0~2(줄 폭) }
export const WINS = { profile: '프로필', intro: '소개', stats: '상태', friends: '일촌', quest: '퀘스트', news: '뉴스', contact: '연락', mind: '속마음', cond: '상태 이상', fate: '저주 · 빚', music: 'BGM', custom: '내 탭', photo: '사진' };
const WIN_T = { profile: 'profile', intro: 'about', stats: 'status', photo: 'photo' };
const FS = { s: 9.5, m: 11, l: 12.5 }; // 글씨 크기(px) — 고르지 않았으면 화면 배율이 큰 기기(노트북 150%↑)는 작게
const PACK = { mix: '혼합 (두 단)', tetris: '테트리스 (여러 단)', wide: '넓게 (한 단 · 예전처럼)' }; // 가운데 창의 칸 쌓는 방식
const packOf = () => (PACK[settings().hpPack] ? settings().hpPack : 'mix'); // 기본은 혼합(두 단)
const fsOf = () => (FS[settings().hpFs] ? settings().hpFs : (window.devicePixelRatio || 1) >= 1.5 ? 's' : 'm');
const COLW = ['130px', 'clamp(150px, 15%, 200px)', 'clamp(210px, 23%, 320px)'];
let editWins = false; // 창 옮기기 중 (창마다 ▲▼⇄✕ 단추)
export function hpLayout() {
    const d = settings().hpLayout ?? {}, all = Object.keys(WINS), ok = (x) => (Array.isArray(x) ? x.filter(k => WINS[k]) : null);
    const l = ok(d.l) ?? ['profile', 'intro', 'stats'], r0 = (ok(d.r) ?? []).filter(k => !l.includes(k));
    return { l: [...new Set(l)], r: [...new Set([...r0, ...all.filter(k => !l.includes(k) && !r0.includes(k))])], off: ok(d.off) ?? [], main: ['l', 'c', 'r'].includes(d.main) ? d.main : 'c', lw: [0, 1, 2].includes(d.lw) ? d.lw : 1, rw: [0, 1, 2].includes(d.rw) ? d.rw : 1 };
}
// 한 탭(「모음」)으로 합칠 자잘한 탭 — 묶음 안에 2개 이상 켜져 있을 때만 합쳐진다
export const MINOR_ALL = { music: '추천 음악', album: '추억 앨범', record: '플레이 기록', ach: '업적', memo: '메모', custom: '내 탭', dice: '주사위', fate: '운명' };
export const hpMinor = () => (Array.isArray(settings().hpMinor) ? settings().hpMinor.filter(k => MINOR_ALL[k]) : ['music', 'album', 'record']);
const saveLayout = (L) => { settings().hpLayout = L; saveSettings(); };
// 창 옮기기: up · down(같은 줄에서 보이는 이웃과 자리 바꿈) · side(다른 줄로) · off(숨김)
function moveWin(key, how, shown) {
    const L = hpLayout(), side = L.l.includes(key) ? 'l' : 'r', arr = L[side], vis = shown.filter(k => arr.includes(k)), v = vis.indexOf(key);
    if (how === 'off') L.off = [...new Set([...L.off, key])];
    else if (how === 'side') { L[side] = arr.filter(k => k !== key); L[side === 'l' ? 'r' : 'l'].unshift(key); }
    else { const other = vis[v + (how === 'up' ? -1 : 1)]; if (!other) return; const i = arr.indexOf(key), j = arr.indexOf(other); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    saveLayout(L);
}
const winOn = (k) => !hpLayout().off.includes(k);
const win = (key, title, body, cls = '') => (body ? `<section class="ss-hp-win ${cls}" data-win="${key}"><div class="ss-hp-wt"><b>${title}</b>${editWins ? `<span class="ss-hp-wtools"><button data-hp="mv" data-arg="${key}:up" title="위로">▲</button><button data-hp="mv" data-arg="${key}:down" title="아래로">▼</button><button data-hp="mv" data-arg="${key}:side" title="반대쪽 줄로">⇄</button><button data-hp="mv" data-arg="${key}:off" title="숨기기 (꾸미기에서 다시 켜요)">✕</button></span>` : '<i>♡♡♡</i>'}</div><div class="ss-hp-wb">${body}</div></section>` : '');
async function openDeco(redraw) {
    for (;;) {
        const set = settings(), ti = Number(set.hpTheme) || 0, L = hpLayout(), box = document.createElement('div'); box.className = 'ss-root ss-scope ss-hp-pick';
        const seg = (k, cur, opts) => opts.map(([v, n]) => `<button class="ss-btn sm ${cur === v ? 'pri' : 'ghost'}" data-choice="${k}:${v}">${n}</button>`).join('');
        box.innerHTML = `<h3>🎨 꾸미기</h3><h4>색</h4><div class="ss-hp-faces">${THEMES.map(([n, h, s], i) => `<button class="ss-hp-sw ${ti === i ? 'on' : ''}" data-choice="theme:${i}" title="${n}" style="background:hsl(${h} ${Math.round(85 * s)}% 86%)"></button>`).join('')}</div>
            <h4>바탕 무늬</h4><div class="ss-row-btns">${seg('pat', patOf(), Object.entries(PATTERNS))}</div>
            <h4>글꼴</h4><div class="ss-row-btns">${seg('font', set.hpDot !== false ? '1' : '0', [['1', '도트 글꼴'], ['0', '실리 글꼴']])}</div>
            <div class="ss-row-btns"><small>글씨 크기</small>${seg('fs', fsOf(), [['s', '작게'], ['m', '보통'], ['l', '크게']])}</div>
            <div class="ss-row-btns"><small>칸 쌓기</small>${seg('pack', packOf(), Object.entries(PACK))}</div>
            <h4>창 자리</h4><div class="ss-row-btns"><button class="ss-btn sm pri" data-choice="edit:1"><i class="fa-solid fa-up-down-left-right"></i> 창 옮기기 ${editWins ? '끝내기' : '시작'}</button><small class="ss-hint">창마다 ▲▼(순서) · ⇄(반대쪽 줄) · ✕(숨기기) 단추가 생겨요.</small></div>
            <div class="ss-row-btns"><small>가운데 창 위치</small>${seg('main', L.main, [['l', '왼쪽'], ['c', '가운데'], ['r', '오른쪽']])}</div>
            <div class="ss-row-btns"><small>왼쪽 줄 폭</small>${seg('lw', String(L.lw), [['0', '좁게'], ['1', '보통'], ['2', '넓게']])}</div>
            <div class="ss-row-btns"><small>오른쪽 줄 폭</small>${seg('rw', String(L.rw), [['0', '좁게'], ['1', '보통'], ['2', '넓게']])}</div>
            <h4>「모음」 한 탭으로 합칠 탭 <small>(같은 묶음에 2개 이상일 때 합쳐져요)</small></h4><div class="ss-row-btns">${Object.entries(MINOR_ALL).map(([k, n]) => `<button class="ss-btn sm ${hpMinor().includes(k) ? 'pri' : 'ghost'}" data-choice="minor:${k}">${hpMinor().includes(k) ? '✓ ' : ''}${n}</button>`).join('')}</div>
            <h4>보일 창 <small>(내용이 있는 창만 떠요)</small></h4><div class="ss-row-btns">${Object.entries(WINS).map(([k, n]) => `<button class="ss-btn sm ${L.off.includes(k) ? 'ghost' : 'pri'}" data-choice="win:${k}">${L.off.includes(k) ? '' : '✓ '}${n}</button>`).join('')}</div>
            <h4>HUD · 미니창 · 보통 상태창</h4><div class="ss-row-btns"><button class="ss-btn sm ${set.hpSkinHud !== false ? 'pri' : 'ghost'}" data-choice="skin:1">${set.hpSkinHud !== false ? '✓ ' : ''}같은 모양으로</button><button class="ss-btn sm ghost" data-choice="reset:1">창 자리 처음으로</button></div>`;
        const pick = await choosePopup(box, '닫기'); if (!pick) return;
        const [k, v] = pick.split(':');
        if (k === 'theme') set.hpTheme = Number(v); if (k === 'pat') set.hpPattern = v; if (k === 'font') set.hpDot = v === '1';
        if (k === 'win') saveLayout({ ...L, off: L.off.includes(v) ? L.off.filter(x => x !== v) : [...L.off, v] });
        if (k === 'main') saveLayout({ ...L, main: v }); if (k === 'lw' || k === 'rw') saveLayout({ ...L, [k]: Number(v) });
        if (k === 'reset') set.hpLayout = {};
        if (k === 'fs') set.hpFs = v;
        if (k === 'pack') set.hpPack = v;
        if (k === 'minor') { const m = hpMinor(); set.hpMinor = m.includes(v) ? m.filter(x => x !== v) : [...m, v]; }
        if (k === 'skin') set.hpSkinHud = set.hpSkinHud === false;
        if (k === 'edit') editWins = !editWins;
        saveSettings(); applyRetro(); redraw(); if (k === 'skin' || k === 'theme' || k === 'font') { app.rerenderPanels?.(true); app.renderHud?.(); }
        if (k === 'edit') return; // 창을 옮기러 가게 닫는다
    }
}
// 오늘의 기분: 지금 상태로 정한다 (토큰 0)
function mood(s, meta, nNew) {
    if (meta.paused) return ['blanket', '쉬는 중'];
    const bars = s.data.stats?.bars ?? [], hp = bars.find(b => /체력|hp|health|생명/i.test(b.name)) ?? bars[0];
    if (hp && hp.max > 0 && hp.cur / hp.max < 0.3) return ['sad', '기운 없음'];
    if (nNew) return ['gasp', '새 소식!'];
    const top = (s.data.rel?.user ?? []).filter(r => !r.out).sort((a, b) => b.aff - a.aff)[0];
    if (top && top.aff >= 60) return ['heart', '두근두근'];
    if (s.data.wallet && modOn('wallet', meta) && s.data.wallet.cash <= 0) return ['sulk', '빈털터리'];
    if (top && top.aff < 0) return ['tongue', '될 대로 돼라'];
    return ['hi', '좋은 하루'];
}
// 🖼 홈 쪽 아래의 큰 사진 (선택 · 이 채팅에만 · meta.hpPhoto = { src, cap }) — 안 넣으면 얇은 단추 한 줄만
export function photoHTML(meta) {
    const p = meta.hpPhoto;
    if (!p?.src) return '<div class="ss-hp-addphoto"><button class="ss-btn sm ghost" data-hp="photo"><i class="fa-solid fa-image"></i> 여기에 큰 사진 넣기</button></div>';
    const top = p.pos === 'top'; // 기본은 소식 아래 (미니홈피처럼) · ↑ 단추로 맨 위
    return `<figure class="ss-hp-main ${top ? 'top' : ''}"><img src="${esc(p.src)}" alt=""><figcaption><button data-hp="cap" title="눌러서 한마디 고치기">${p.cap ? esc(p.cap) : '<i>한마디 적기…</i>'}</button>
        <span><button class="ss-ib" data-hp="photopos" title="${top ? '사진을 홈 맨 아래로' : '사진을 홈 맨 위로'}"><i class="fa-solid ${top ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></button><button class="ss-ib" data-hp="photo" title="사진 바꾸기"><i class="fa-solid fa-image"></i></button><button class="ss-ib" data-hp="photodel" title="사진 빼기"><i class="fa-solid fa-trash-can"></i></button></span></figcaption></figure>`;
}
// 📐 한 화면에 다 보이게 (넓은 화면): 홈 쪽은 스크롤 없이 — 사진이 남는 높이를 차지하고, 본문이 넘치면 본문을 줄여(zoom) 맞춘다.
//   왼쪽 프로필 쪽도 넘치면 줄인다. 다른 탭은 내용이 길어서 오른쪽 쪽 안에서 스크롤. 좁은 화면(폰)은 그냥 아래로 스크롤.
const MINZ = 0.92;
function shrinkToFit(box, room, nat) {
    box.style.zoom = '';
    if (room <= 0 || nat() <= room + 1) return true;
    let z = Math.max(MINZ, room / nat());
    for (let k = 0; k < 4; k++) { // 줄이면 폭이 넓어져 줄바꿈이 달라지므로 몇 번 다시 잰다
        box.style.zoom = String(z);
        const h = nat() * z; // zoom을 준 뒤의 scrollHeight는 줄이기 전 단위
        if (Math.abs(h - room) <= 2 || z <= MINZ && h > room) break;
        z = Math.min(1, Math.max(MINZ, z * room / h));
    }
    box.style.zoom = String(z);
    return nat() * z <= room + 2;
}
export function fitHompy(el, tries = 0) {
    const root = el?.querySelector?.('.ss-hompy'); if (!root) return;
    const right = root.querySelector('.ss-hp-right'), body = right?.querySelector(':scope > .ss-body'), cols = [...root.querySelectorAll('.ss-hp-col')];
    cols.forEach(c => { c.firstElementChild.style.zoom = ''; }); if (body) { body.style.zoom = ''; body.style.height = ''; const hb0 = body.querySelector('.ss-hp-homebody'); if (hb0) hb0.style.zoom = ''; } right?.classList.remove('ss-hp-over');
    if (matchMedia('(max-width: 860px)').matches) return;
    if (!right || right.clientHeight < 60) { if (tries < 8) setTimeout(() => fitHompy(el, tries + 1), 80); return; } // 창이 아직 안 떴음
    const pad = (x) => { const cs = getComputedStyle(x); return parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom); };
    for (const c of cols) { const inn = c.firstElementChild; if (!shrinkToFit(inn, c.clientHeight - pad(c), () => inn.scrollHeight)) c.classList.add('ss-hp-over'); else c.classList.remove('ss-hp-over'); }
    // 가운데 창: 넘치면 내용을 더 작게 줄여 한 화면에 맞춘다 (0.5배까지 · 그래도 넘칠 때만 스크롤)
    let used = 0; for (const ch of right.children) { if (ch === body) continue; const cs = getComputedStyle(ch); used += ch.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom); }
    const room = right.clientHeight - pad(right) - used - 8;
    const hb = body.querySelector(':scope > .ss-hp-homewrap > .ss-hp-homebody'), target = hb ?? body;
    if (hb) { body.style.height = `${room}px`; }
    right.classList.add('ss-hp-over'); // 가운데 창은 글씨를 줄이지 않고, 넘치면 창 안에서 스크롤 (칸은 여러 단으로 쌓여 있음)
}
// 사진 단추 (패널마다 걸지 않고 문서에 한 번)
export function initHompy() {
    try { applyRetro(); } catch (e) { ssErr(e); }
    let rt = null; const refit = () => { clearTimeout(rt); rt = setTimeout(() => document.querySelectorAll('.ss-hompy').forEach(r => fitHompy(r.closest('.ss-panel'))), 120); };
    window.addEventListener('resize', refit);
    document.addEventListener('load', (e) => { if (e.target?.tagName === 'IMG' && e.target.closest?.('.ss-hompy')) refit(); }, true);
    document.addEventListener('click', async (e) => {
        const b = e.target.closest?.('.ss-hompy [data-hp]'); if (!b) return;
        e.preventDefault(); e.stopPropagation();
        const el = b.closest('.ss-panel');
        if (b.dataset.hp === 'close') { el?.closest('dialog')?.querySelector('.popup-button-ok')?.click(); return; }
        if (b.dataset.hp === 'mv') { const [key, how] = String(b.dataset.arg).split(':'); moveWin(key, how, [...(b.closest('.ss-hp-col')?.querySelectorAll('[data-win]') ?? [])].map(x => x.dataset.win)); if (el?.isConnected) app.renderPanel?.(el); return; }
        if (b.dataset.hp === 'solo' && el?._ss) { Object.assign(el._ss, { tab: b.dataset.arg, hpSolo: b.dataset.arg, mode: 'view', ui: {} }); app.renderPanel?.(el); return; } // 이 칸만 크게
        if (b.dataset.hp === 'all' && el?._ss) { el._ss.hpSolo = null; el._ss.mode = 'view'; app.renderPanel?.(el); return; } // 묶음 전체로
        if (b.dataset.hp === 'editdone') { editWins = false; if (el?.isConnected) app.renderPanel?.(el); return; }
        if (b.dataset.hp === 'deco') { try { await openDeco(() => { if (el?.isConnected) app.renderPanel?.(el); }); } catch (err) { ssErr(err); } return; }
        if (b.dataset.hp === 'face') { try { await pickFace(() => { if (el?.isConnected) app.renderPanel?.(el); }); } catch (err) { ssErr(err); } return; }
        const meta = getMeta(); if (!meta) return;
        const done = () => { saveMeta(); if (el?.isConnected) app.renderPanel?.(el); };
        try {
            if (b.dataset.hp === 'photodel') { delete meta.hpPhoto; return done(); }
            if (b.dataset.hp === 'photopos') { if (meta.hpPhoto) meta.hpPhoto.pos = meta.hpPhoto.pos === 'top' ? 'bottom' : 'top'; return done(); }
            if (b.dataset.hp === 'cap') { const v = await askInput('사진 아래 한마디', '비워 두면 지워져요.', meta.hpPhoto?.cap ?? ''); if (v === null || !meta.hpPhoto) return; meta.hpPhoto.cap = short(v.trim(), 80); return done(); }
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
            inp.onchange = async () => { try { const f = inp.files?.[0]; if (!f) return; meta.hpPhoto = { src: await shrinkImage(f, 900, 0.82), cap: meta.hpPhoto?.cap ?? '', pos: meta.hpPhoto?.pos ?? 'bottom' }; done(); } catch (err) { ssErr(err); toastr.error('사진을 넣지 못했어요. 다른 그림으로 해 보세요.', TITLE); } };
            inp.click();
        } catch (err) { ssErr(err); }
    }, true);
}
export function hompyHTML({ rootCls, headHTML, pauseHTML, groupsHTML, restHTML, s, meta, nNew, enter, homeGroup }) {
    const c = s.core, d = s.data, [con, feel] = mood(s, meta, nNew), [, hue, sat] = themeOf();
    const total = (ctx().chat ?? []).filter(m => !m.is_system).length;
    const cal = d.calendar && modOn('calendar', meta) ? d.calendar : null, here = modOn('map', meta) ? d.map?.here : '';
    const w = d.wallet && modOn('wallet', meta) ? d.wallet : null;
    const bars = modOn('stats', meta) ? (d.stats?.bars ?? []).slice(0, 6) : [];
    const rel = d.rel && modOn('rel', meta) ? d.rel : null, AX = rel ? relAxes(rel) : null;
    const friends = rel ? rel.user.filter(r => !r.out).sort((x, y) => y.aff + y.trust - x.aff - x.trust).slice(0, 6) : [];
    const mini = [cal ? ['날짜', `${dateShort(cal)} ${cal.time}`] : null, here ? ['장소', here] : null, w ? ['재산', `${fmtNum(w.cash)} ${w.currency ?? ''}`] : null].filter(Boolean);
    const mine = String(settings().hpFace ?? '').startsWith('my:') && !!settings().hpFaces?.[Number(String(settings().hpFace).slice(3))];
    const home = !!homeGroup, photo = photoHTML(meta), hasPhoto = !!meta.hpPhoto?.src; // 홈 묶음에서는 사진이 가운데 창에 크게 → 옆의 사진 창은 안 띄움
    // 창 내용 (없으면 빈 글 → 창이 안 뜸)
    const BODY = {
        profile: () => `<div class="ss-hp-prof"><div class="ss-hp-photo ${mine ? 'mine' : ''}" data-hp="face" role="button" title="눌러서 프로필 그림 바꾸기"><img src="${esc(faceSrc(con))}" alt=""></div>
            <div class="ss-hp-prof-t"><div class="ss-hp-today"><small>TODAY IS</small><b>${esc(feel)}</b></div><b class="ss-hp-name">${esc(c.title || TITLE)}</b></div></div>`,
        intro: () => (c.summary ? `<p class="ss-hp-intro">${esc(c.summary)}</p>` : ''),
        quest: () => { const q = d.quest && modOn('quest', meta) ? d.quest.list.filter(x => x.status === 'active') : []; return q.length ? `<ul class="ss-hp-list" data-act="tab" data-arg="quest">${q.slice(0, 6).map(x => `<li>${esc(x.title)}</li>`).join('')}</ul>` : ''; },
        news: () => { const n = d.news && modOn('news', meta) ? d.news.items.slice(-3).reverse() : []; return n.length ? `<ul class="ss-hp-list" data-act="tab" data-arg="news">${n.map(x => `<li>${esc(x.title)}</li>`).join('')}</ul>` : ''; },
        stats: () => `${mini.length ? `<dl class="ss-hp-mini">${mini.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}${bars.length ? `<div class="ss-hp-bars">${bars.map(b => `<div><span>${esc(b.name)}</span><i><b style="width:${b.max > 0 ? Math.max(0, Math.min(100, (b.cur / b.max) * 100)) : 0}%"></b></i><small>${fmtNum(b.cur)}</small></div>`).join('')}</div>` : ''}`,
        friends: () => (friends.length ? `<div class="ss-hp-friends">${friends.map(r => `<button data-act="tab" data-arg="rel" title="관계 탭 열기">${avatar(r.name)}<span><b>${esc(r.name)}</b><small>${r.label ? esc(r.label) : ''}</small></span><em>♥${r.aff}</em><em class="t">★${r.trust}</em></button>`).join('')}</div>` : ''),
        photo: () => (!home && hasPhoto ? photo : ''),
    };
    const LY = hpLayout(), mk = (k) => (LY.off.includes(k) ? '' : win(k, WIN_T[k] ?? WINS[k], BODY[k] ? BODY[k]() : miniWidgets(s, [k]), BODY[k] ? '' : 'x'));
    const L = LY.l.map(mk).join(''), R = LY.r.map(mk).join('');
    const mainBody = restHTML;
    return `<div class="${rootCls} ss-hompy ss-hp-k-${packOf()} ss-hp-p-${patOf()} ${settings().hpDot !== false ? 'ss-hp-dot' : ''} ${enter ? 'ss-hp-enter' : ''}" style="--hp-h:${hue};--hp-s:${sat};--hp-fs:${FS[fsOf()]}px">
        <div class="ss-hp-url ss-hp-top"><i></i><i></i><i></i><span class="ss-hp-nav" aria-hidden="true">‹ › ⟳</span><span class="ss-hp-addr">meatball.home/<b>${esc(short(c.title || TITLE, 30))}</b></span>${headHTML}<button class="ss-hp-x" data-hp="close" title="닫기"><i class="fa-solid fa-xmark"></i></button><em></em></div>
        <div class="ss-hp-marks"><div class="ss-hp-index">${groupsHTML}</div><span class="ss-hp-count">TURN <b>${s.turn ?? 0}</b> · TOTAL <b>${total}</b></span>${editWins ? '<button class="ss-hp-deco-b on" data-hp="editdone">✓ 창 옮기기 끝</button>' : ''}<button class="ss-hp-deco-b" data-hp="deco" title="색 · 무늬 · 글꼴 · 창 자리 · 보일 창">🎨 꾸미기</button></div>
        ${(() => {
            const lcol = L ? `<aside class="ss-hp-col ss-hp-left"><div class="ss-hp-col-in ss-hp-left-in">${L}</div></aside>` : '', rcol = R ? `<aside class="ss-hp-col ss-hp-rcol"><div class="ss-hp-col-in">${R}</div></aside>` : '';
            const main = `<section class="ss-hp-win main"><div class="ss-hp-wt"><b>${esc(c.title || TITLE)}</b><i>♡♡♡</i></div><div class="ss-hp-right">${pauseHTML}${mainBody}</div></section>`;
            const order = LY.main === 'l' ? [['m', main], ['l', lcol], ['r', rcol]] : LY.main === 'r' ? [['l', lcol], ['r', rcol], ['m', main]] : [['l', lcol], ['m', main], ['r', rcol]];
            const cols = order.filter(([, h]) => h).map(([k]) => (k === 'm' ? 'minmax(0, 1fr)' : COLW[k === 'l' ? LY.lw : LY.rw])).join(' ');
            return `<div class="ss-hp-book ${editWins ? 'ss-hp-editing' : ''}" style="grid-template-columns:${cols}">${order.map(([, h]) => h).join('')}</div>`;
        })()}
    </div>`;
}
