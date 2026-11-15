// 📒 미니홈피 화면 (v2.8): 상태창을 전체화면으로 열면 수첩 모양의 「홈피」로 보여 준다 (설정 hompyFull · 기본 켬)
// 안쪽(오른쪽 쪽)은 평소 상태창 그대로 — 틀만 씌운다: 주소창 · 수첩 표지 · 왼쪽 프로필 쪽 · 링 · 오른쪽 색인 탭
// 계산은 없음(화면만) · 그림은 img/meatcon/ 의 미트볼콘 (폴더 이름을 con으로 하면 윈도우에서 못 만든다 — 예약된 이름)
import { app, esc, short, fmtNum, modOn, relAxes, ctx, TITLE, dateShort, getMeta, saveMeta, ssErr, settings, saveSettings } from './core.js';
import { avatar, askInput, choosePopup } from './kit.js';
import { shrinkImage, MINI, miniWidgets } from './tiles.js';

// 🎨 꾸밈 값: 보통은 설정(모든 채팅 공통). 이 채팅에 꾸밈 세트를 묶어 두었으면(meta.hpSet = 세트 이름) 그 세트 값이 먼저다 — 고쳐도 그 세트가 바뀐다
const DECO_KEYS = ['hpSkin', 'hpPattern', 'hpFsPx', 'hpInk', 'hpBg', 'hpPaper', 'hpNavTop', 'hpTheme', 'hpHue', 'hpSat', 'hpFs', 'hpFont', 'hpCorner', 'hpGap', 'hpDark', 'hpMotion', 'hpLayout', 'hpMinor', 'hpFace'];
const boundSet = () => { try { const n = getMeta()?.hpSet; return n ? (settings().hpSets ?? []).find(x => x.name === n) ?? null : null; } catch { return null; } };
const D = () => { const b = boundSet(); return b ? { ...settings(), ...b.data } : settings(); };
const W = (k, v) => { const b = boundSet(); (b ? b.data : settings())[k] = v; };
const snapshot = () => { const d = D(), o = {}; for (const k of DECO_KEYS) if (d[k] !== undefined) o[k] = JSON.parse(JSON.stringify(d[k])); return o; };
const cleanSet = (o) => { const r = {}; if (!o || typeof o !== 'object') return r; for (const k of DECO_KEYS) { const v = o[k]; if (v === undefined || v === null) continue; if (k === 'hpLayout') { if (typeof v === 'object' && !Array.isArray(v)) r[k] = { l: v.l, r: v.r, off: v.off, main: v.main, lw: v.lw, rw: v.rw }; } else if (k === 'hpMinor') { if (Array.isArray(v)) r[k] = v.filter(x => typeof x === 'string').slice(0, 12); } else if (['string', 'number', 'boolean'].includes(typeof v) && String(v).length <= 24) r[k] = v; } if (String(r.hpFace ?? '').startsWith('my:')) delete r.hpFace; return r; };
export const toCode = (name, data) => 'MBH1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ n: name, d: cleanSet(data) }))));
export const fromCode = (code) => { try { const j = JSON.parse(decodeURIComponent(escape(atob(String(code).trim().replace(/^MBH1:/, ''))))); const d = cleanSet(j.d); return Object.keys(d).length ? { name: short(String(j.n || '가져온 꾸밈'), 20), data: d } : null; } catch { return null; } };
export const conUrl = (n) => new URL(`../img/meatcon/${n}.webp`, import.meta.url).href;
export const CONS = ['hi', 'proud', 'heart', 'pray', 'focus', 'groom', 'blank', 'roll', 'box', 'blanket', 'tongue', 'sulk', 'sad', 'gasp'];
// 프로필 그림: 설정 hpFace — 'auto'(기분 따라 · 기본) · 'con:이름'(기본 이모티콘) · 'my:번호'(내가 올린 그림 · settings().hpFaces · 최대 12장 · 모든 채팅 공통)
function faceSrc(autoCon) {
    const f = String(D().hpFace ?? 'auto');
    if (f.startsWith('con:') && CONS.includes(f.slice(4))) return conUrl(f.slice(4));
    if (f.startsWith('my:')) { const src = settings().hpFaces?.[Number(f.slice(3))]; if (src) return src; }
    return conUrl(autoCon);
}
async function pickFace(redraw) {
    const set = settings(), cur = String(D().hpFace ?? 'auto'), mine = set.hpFaces ?? [];
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-hp-pick';
    const cell = (v, inner, title = '') => `<button class="ss-hp-face ${cur === v ? 'on' : ''}" data-choice="${v}" title="${esc(title)}">${inner}</button>`;
    box.innerHTML = `<h3>프로필 그림 고르기</h3><p class="ss-hint">「기분 따라」는 지금 상태에 맞춰 알아서 바뀌어요. 내 그림은 12장까지 올릴 수 있고 모든 채팅에서 같이 써요.</p>
        <div class="ss-hp-faces">${cell('auto', '<span>기분<br>따라</span>', '상태에 따라 자동')}${CONS.map(n => cell(`con:${n}`, `<img src="${conUrl(n)}" alt="">`)).join('')}</div>
        <h4>내 그림</h4><div class="ss-hp-faces">${mine.map((src, i) => `<span class="ss-hp-mine">${cell(`my:${i}`, `<img src="${esc(src)}" alt="">`)}<button class="ss-ib" data-choice="del:${i}" title="이 그림 지우기"><i class="fa-solid fa-xmark"></i></button></span>`).join('')}${mine.length < 12 ? cell('upload', '<span><i class="fa-solid fa-plus"></i><br>올리기</span>', '내 그림 올리기') : ''}</div>`;
    const pick = await choosePopup(box, '닫기'); if (!pick) return;
    if (pick.startsWith('del:')) { const i = Number(pick.slice(4)); set.hpFaces = mine.filter((_, k) => k !== i); const c = cur.startsWith('my:') ? Number(cur.slice(3)) : -1; W('hpFace', c === i ? 'auto' : c > i ? `my:${c - 1}` : cur); saveSettings(); redraw(); return pickFace(redraw); }
    if (pick === 'upload') {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async () => { try { const f = inp.files?.[0]; if (!f) return; set.hpFaces = [...(set.hpFaces ?? []), await shrinkImage(f, 320, 0.85)].slice(0, 12); W('hpFace', `my:${set.hpFaces.length - 1}`); saveSettings(); redraw(); } catch (err) { ssErr(err); toastr.error('그림을 넣지 못했어요. 다른 그림으로 해 보세요.', TITLE); } };
        inp.click(); return;
    }
    W('hpFace', pick); saveSettings(); redraw();
}
// 🎨 꾸미기 (모든 채팅 공통): 포인트 색 · 글씨 크기 · 창 자리 · 보일 창 (깔끔한 블로그 모양 — 무늬 · 도트 글꼴은 뺐다)
export const THEMES = [['분홍', 340, 1], ['회색', 260, 0.08], ['하늘', 215, 1], ['민트', 150, 0.8], ['빨강', 2, 1], ['살구', 22, 1], ['노랑', 46, 1], ['보라', 268, 1]];
const themeOf = () => { const d = D(); return d.hpTheme === 'c' ? ['직접', Math.max(0, Math.min(360, Number(d.hpHue) || 0)), Math.max(0, Math.min(1.2, Number(d.hpSat ?? 1)))] : THEMES[Number(d.hpTheme) || 0] ?? THEMES[0]; };
const FONTS = { g: '고딕', s: '명조', r: '둥근 글꼴' }, CORNERS = ['각지게', '보통', '둥글게'], GAPS = ['촘촘', '보통', '넉넉'], DARKS = { light: '밝게', dark: '어둡게', auto: '기기 따라' };
const pick3 = (v) => ([0, 1, 2].includes(Number(v)) && v !== null && v !== undefined && v !== '' ? Number(v) : 1);
export const SKINS = { clean: '깔끔', dot: '도트' }, PATTERNS = { grid: '모눈', dot: '물방울', stripe: '줄무늬', none: '없음' };
export const skinOf = () => (D().hpSkin === 'dot' ? 'dot' : 'clean'); // 고르지 않았으면 깔끔 (처음 열 때 고르는 줄이 뜬다)
const patOf = () => (PATTERNS[D().hpPattern] ? D().hpPattern : 'grid');
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v ?? '')) ? String(v) : '');
const darkOn = () => { const v = D().hpDark; return v === 'dark' || v === 'auto' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches; };
// 🪟 HUD · 미니창 · 보통 상태창에도 같은 색 · 테두리 (설정 hpSkinHud · 기본 켬): body에 색 값과 표시를 걸어 둔다
export function applyRetro() {
    const b = document.body; if (!b) return; const d = D(), [, h, s] = themeOf(), on = settings().hpSkinHud !== false, dot = skinOf() === 'dot';
    b.classList.toggle('ss-retro', on); b.classList.toggle('ss-skin-dot', dot); b.classList.toggle('ss-hp-dark', darkOn()); b.classList.toggle('ss-hp-still', d.hpMotion === false); b.classList.toggle('ss-hp-navtop', d.hpNavTop === true);
    for (const [p, v, all] of [['ss-hp-r-', pick3(d.hpCorner), [0, 1, 2]], ['ss-hp-g-', pick3(d.hpGap), [0, 1, 2]], ['ss-hp-f-', dot ? 'd' : FONTS[d.hpFont] ? d.hpFont : 'g', [...Object.keys(FONTS), 'd']]]) for (const x of all) b.classList.toggle(p + x, x === v);
    b.style.setProperty('--hp-h', String(h)); b.style.setProperty('--hp-s', String(s));
    b.style.setProperty('--hp-fs', `${fsPx()}px`); // 다른 창(도우미 등)의 글씨 크기도 같이
    // 직접 고른 글자 · 바탕 · 카드 색 (비우면 모양의 기본색)
    const ink = hex(d.hpInk), set = (k, v) => (v ? b.style.setProperty(k, v) : b.style.removeProperty(k));
    set('--hp-ink-u', ink); set('--hp-dim-u', ink ? `color-mix(in srgb, ${ink} 58%, transparent)` : ''); set('--hp-bg-u', hex(d.hpBg)); set('--hp-paper-u', hex(d.hpPaper));
}
// 창 하나하나의 자리: settings().hpLayout = { l: [왼쪽 줄 순서], r: [오른쪽 줄 순서], off: [숨긴 창], main: 'c'|'l'|'r'(가운데 창 위치), lw · rw: 0~2(줄 폭) }
export const WINS = { profile: '프로필', intro: '소개', stats: '상태', friends: '일촌', quest: '퀘스트', news: '뉴스', contact: '연락', mind: '속마음', cond: '상태 이상', fate: '저주 · 빚', music: 'BGM', custom: '내 탭', photo: '사진' };
const WIN_T = { profile: 'profile', intro: 'about', stats: 'status', photo: 'photo' };
const FS = { s: 11.5, m: 13, l: 14.5 }; // 글씨 크기(px) — 고르지 않았으면 화면 배율이 큰 기기(노트북 150%↑)는 작게
const FS_DOT = { s: 9.5, m: 11, l: 12.5 };
const fsPx = () => { const n = Number(D().hpFsPx); return n >= 8 && n <= 22 ? n : (skinOf() === 'dot' ? FS_DOT : FS)[fsOf()]; }; // 직접 정한 크기가 먼저
const fsOf = () => (FS[D().hpFs] ? D().hpFs : (window.devicePixelRatio || 1) >= 1.5 ? 's' : 'm');
const COLW = ['130px', 'clamp(150px, 15%, 200px)', 'clamp(210px, 23%, 320px)'];
let editWins = false; // 창 옮기기 중 (창마다 ▲▼⇄✕ 단추)
export function hpLayout() {
    const d = D().hpLayout ?? {}, all = Object.keys(WINS), ok = (x) => (Array.isArray(x) ? x.filter(k => WINS[k]) : null);
    const l = ok(d.l) ?? ['profile', 'intro', 'stats'], r0 = (ok(d.r) ?? []).filter(k => !l.includes(k));
    return { l: [...new Set(l)], r: [...new Set([...r0, ...all.filter(k => !l.includes(k) && !r0.includes(k))])], off: ok(d.off) ?? [], main: ['l', 'c', 'r'].includes(d.main) ? d.main : 'c', lw: [0, 1, 2].includes(d.lw) ? d.lw : 1, rw: [0, 1, 2].includes(d.rw) ? d.rw : 1 };
}
// 한 탭(「모음」)으로 합칠 자잘한 탭 — 묶음 안에 2개 이상 켜져 있을 때만 합쳐진다
export const MINOR_ALL = { music: '추천 음악', album: '추억 앨범', record: '플레이 기록', ach: '업적', memo: '메모', custom: '내 탭', dice: '주사위', fate: '운명' };
export const hpMinor = () => (Array.isArray(D().hpMinor) ? D().hpMinor.filter(k => MINOR_ALL[k]) : ['music', 'album', 'record']);
const saveLayout = (L) => { W('hpLayout', L); saveSettings(); };
// 창 옮기기: up · down(같은 줄에서 보이는 이웃과 자리 바꿈) · side(다른 줄로) · off(숨김)
function moveWin(key, how, shown) {
    const L = hpLayout(), side = L.l.includes(key) ? 'l' : 'r', arr = L[side], vis = shown.filter(k => arr.includes(k)), v = vis.indexOf(key);
    if (how === 'off') L.off = [...new Set([...L.off, key])];
    else if (how === 'side') { L[side] = arr.filter(k => k !== key); L[side === 'l' ? 'r' : 'l'].unshift(key); }
    else { const other = vis[v + (how === 'up' ? -1 : 1)]; if (!other) return; const i = arr.indexOf(key), j = arr.indexOf(other); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    saveLayout(L);
}
const winOn = (k) => !hpLayout().off.includes(k);
const win = (key, title, body, cls = '') => (body ? `<section class="ss-hp-win ${cls}" data-win="${key}"><div class="ss-hp-wt"><b>${title}</b>${editWins ? '' : '<i class="ss-hp-hearts">♡♡♡</i>'}${editWins ? `<span class="ss-hp-wtools"><button data-hp="mv" data-arg="${key}:up" title="위로">▲</button><button data-hp="mv" data-arg="${key}:down" title="아래로">▼</button><button data-hp="mv" data-arg="${key}:side" title="반대쪽 줄로">⇄</button><button data-hp="mv" data-arg="${key}:off" title="숨기기 (꾸미기에서 다시 켜요)">✕</button></span>` : ''}</div><div class="ss-hp-wb">${body}</div></section>` : '');
const pickImage = (max, q, done) => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = async () => { try { const f = inp.files?.[0]; if (f) done(await shrinkImage(f, max, q)); } catch (err) { ssErr(err); toastr.error('그림을 넣지 못했어요. 다른 그림으로 해 보세요.', TITLE); } }; inp.click(); };
async function openDeco(redraw) {
    const after = (k) => { saveSettings(); try { saveMeta(); } catch { /* 채팅 없음 */ } applyRetro(); redraw(); if (k !== 'quiet') { app.rerenderPanels?.(true); app.renderHud?.(); } };
    for (;;) {
        const set = settings(), d = D(), L = hpLayout(), [, hue, sat] = themeOf(), custom = d.hpTheme === 'c', ti = custom ? -1 : Number(d.hpTheme) || 0, sets = set.hpSets ?? [], bound = boundSet();
        const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-hp-pick';
        const seg = (k, cur, opts) => `<span class="ss-hp-seg">${opts.map(([v, n]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-choice="${k}:${v}">${n}</button>`).join('')}</span>`;
        const row = (label, html) => `<div class="ss-hp-row"><span>${label}</span><div>${html}</div></div>`;
        box.innerHTML = `<h3>꾸미기</h3>${bound ? `<p class="ss-hp-bound"><i class="fa-solid fa-link"></i> 이 채팅은 꾸밈 세트 <b>「${esc(bound.name)}」</b>를 써요 — 여기서 고치면 그 세트가 바뀌어요. <button class="ss-btn sm ghost" data-choice="unbind:1">풀기</button></p>` : ''}
            <h4>모양</h4>
            ${row('모양', seg('skin', skinOf(), Object.entries(SKINS)))}
            <h4>색</h4>
            ${row('포인트 색', `<div class="ss-hp-faces sw">${THEMES.map(([n, h, s], i) => `<button class="ss-hp-sw ${ti === i ? 'on' : ''}" data-choice="theme:${i}" title="${n}" style="background:hsl(${h} ${Math.round(62 * s)}% 60%)"></button>`).join('')}<span class="ss-hp-sw mine ${custom ? 'on' : ''}" title="직접 고른 색" style="background:hsl(${hue} ${Math.round(62 * sat)}% 60%)"></span></div>`)}
            ${row('직접 고르기', `<label class="ss-hp-range"><small>색상</small><input type="range" min="0" max="360" step="1" value="${hue}" data-hpr="hue" class="hue"></label><label class="ss-hp-range"><small>진하기</small><input type="range" min="0" max="1.2" step="0.05" value="${sat}" data-hpr="sat"></label>`)}
            ${row('글자 · 바탕 · 카드', ['Ink:글자', 'Bg:바탕', 'Paper:카드'].map(x => x.split(':')).map(([k, n]) => `<label class="ss-hp-color"><input type="color" data-hpc="hp${k}" value="${hex(d['hp' + k]) || (k === 'Ink' ? '#24262b' : '#ffffff')}"><small>${n}${hex(d['hp' + k]) ? ' ✓' : ''}</small></label>`).join('') + (hex(d.hpInk) || hex(d.hpBg) || hex(d.hpPaper) ? '<button class="ss-btn sm ghost" data-choice="colreset:1">기본색으로</button>' : ''))}
            ${skinOf() === 'dot' ? row('바탕 무늬', seg('pat', patOf(), Object.entries(PATTERNS))) : ''}
            ${row('밝기', seg('dark', DARKS[d.hpDark] ? d.hpDark : 'light', Object.entries(DARKS)))}
            <h4>글씨 · 칸</h4>
            ${skinOf() === 'dot' ? '' : row('글꼴', seg('font', FONTS[d.hpFont] ? d.hpFont : 'g', Object.entries(FONTS)))}
            ${row('글씨 크기', seg('fs', Number(d.hpFsPx) ? '' : fsOf(), [['s', '작게'], ['m', '보통'], ['l', '크게']]) + `<label class="ss-hp-range"><input type="range" min="9" max="18" step="0.5" value="${fsPx()}" data-hpr="fs"><small data-fsv>${fsPx()}px</small></label>`)}
            ${row('모서리', seg('corner', pick3(d.hpCorner), CORNERS.map((n, i) => [i, n])))}
            ${row('여백', seg('gap', pick3(d.hpGap), GAPS.map((n, i) => [i, n])))}
            ${row('움직임', seg('motion', d.hpMotion === false ? '0' : '1', [['1', '켬'], ['0', '끔']]))}
            ${row('머리 그림', `<button class="ss-btn sm" data-choice="cover:add"><i class="fa-solid fa-image"></i> ${set.hpCover ? '바꾸기' : '넣기'}</button>${set.hpCover ? '<button class="ss-btn sm ghost" data-choice="cover:del">빼기</button>' : ''}<small class="ss-hint">맨 위 제목 뒤에 얇은 띠로 들어가요.</small>`)}
            ${row('폰에서 메뉴', seg('navtop', d.hpNavTop === true ? '1' : '0', [['0', '아래'], ['1', '위']]))}
            <h4>창 자리</h4>
            ${row('창 옮기기', `<button class="ss-btn sm" data-choice="edit:1"><i class="fa-solid fa-up-down-left-right"></i> ${editWins ? '끝내기' : '시작'}</button><button class="ss-btn sm ghost" data-choice="reset:1">처음으로</button>`)}
            ${row('가운데 창', seg('main', L.main, [['l', '왼쪽'], ['c', '가운데'], ['r', '오른쪽']]))}
            ${row('왼쪽 줄 폭', seg('lw', L.lw, [['0', '좁게'], ['1', '보통'], ['2', '넓게']]))}
            ${row('오른쪽 줄 폭', seg('rw', L.rw, [['0', '좁게'], ['1', '보통'], ['2', '넓게']]))}
            ${row('보일 창', `<div class="ss-hp-chips">${Object.entries(WINS).map(([k, n]) => `<button class="${L.off.includes(k) ? '' : 'on'}" data-choice="win:${k}">${n}</button>`).join('')}</div>`)}
            ${row('「모음」에 넣을 탭', `<div class="ss-hp-chips">${Object.entries(MINOR_ALL).map(([k, n]) => `<button class="${hpMinor().includes(k) ? 'on' : ''}" data-choice="minor:${k}">${n}</button>`).join('')}</div>`)}
            ${row('다른 창들', `<div class="ss-hp-chips"><button class="${set.hpSkinHud !== false ? 'on' : ''}" data-choice="hudskin:1">HUD · 미니창 · 보통 상태창도 같은 모양</button></div>`)}
            <h4>꾸밈 세트</h4>
            <div class="ss-hp-sets">${sets.map((x, i) => `<div class="ss-hp-set ${bound?.name === x.name ? 'on' : ''}"><i style="background:hsl(${x.data.hpTheme === 'c' ? Number(x.data.hpHue) || 0 : (THEMES[Number(x.data.hpTheme) || 0] ?? THEMES[0])[1]} 62% 60%)"></i><b>${esc(x.name)}</b><span><button class="ss-btn sm" data-choice="apply:${i}" title="모든 채팅에 적용">적용</button><button class="ss-btn sm ${bound?.name === x.name ? 'pri' : 'ghost'}" data-choice="bind:${i}" title="이 채팅에서만 이 세트를 써요">${bound?.name === x.name ? '✓ 이 채팅' : '이 채팅만'}</button><button class="ss-btn sm ghost" data-choice="code:${i}" title="코드 복사 — 다른 사람에게 보내요">코드</button><button class="ss-ib" data-choice="setdel:${i}" title="지우기"><i class="fa-solid fa-trash-can"></i></button></span></div>`).join('') || '<p class="ss-hint">저장한 세트가 없어요.</p>'}</div>
            <div class="ss-row-btns"><button class="ss-btn sm" data-choice="setsave:1"><i class="fa-solid fa-floppy-disk"></i> 지금 꾸밈 저장</button><button class="ss-btn sm ghost" data-choice="setimport:1"><i class="fa-solid fa-paste"></i> 코드로 가져오기</button></div>`;
        // 색 슬라이더: 끄는 동안 바로 보이게 (저장은 손을 뗐을 때)
        box.addEventListener('input', (e) => {
            const c = e.target.closest?.('[data-hpc]'); if (c) { W(c.dataset.hpc, c.value); applyRetro(); return; }
            const r = e.target.closest?.('[data-hpr]'); if (!r) return;
            if (r.dataset.hpr === 'fs') { W('hpFsPx', Number(r.value)); applyRetro(); document.querySelectorAll('.ss-hompy').forEach(x => x.style.setProperty('--hp-fs', `${r.value}px`)); const o = box.querySelector('[data-fsv]'); if (o) o.textContent = `${r.value}px`; return; }
            W('hpTheme', 'c'); const hs = box.querySelector('[data-hpr="hue"]').value, ss = box.querySelector('[data-hpr="sat"]').value; W('hpHue', Number(hs)); W('hpSat', Number(ss)); applyRetro();
            document.querySelectorAll('.ss-hompy').forEach(x => { x.style.setProperty('--hp-h', hs); x.style.setProperty('--hp-s', ss); }); box.querySelectorAll('.ss-hp-sw').forEach(x => x.classList.toggle('on', x.classList.contains('mine'))); const m = box.querySelector('.ss-hp-sw.mine'); if (m) m.style.background = `hsl(${hs} ${Math.round(62 * ss)}% 60%)`;
        });
        box.addEventListener('change', (e) => { if (e.target.closest?.('[data-hpr], [data-hpc]')) after(); });
        const pick = await choosePopup(box, '닫기'); if (!pick) return;
        const [k, v] = pick.split(':');
        if (k === 'theme') W('hpTheme', Number(v));
        if (k === 'dark') W('hpDark', v); if (k === 'font') W('hpFont', v); if (k === 'fs') { W('hpFs', v); W('hpFsPx', 0); }
        if (k === 'skin') { W('hpSkin', v); W('hpFsPx', 0); } if (k === 'pat') W('hpPattern', v); if (k === 'navtop') W('hpNavTop', v === '1'); if (k === 'colreset') { W('hpInk', ''); W('hpBg', ''); W('hpPaper', ''); }
        if (k === 'corner') W('hpCorner', Number(v)); if (k === 'gap') W('hpGap', Number(v)); if (k === 'motion') W('hpMotion', v === '1');
        if (k === 'win') saveLayout({ ...L, off: L.off.includes(v) ? L.off.filter(x => x !== v) : [...L.off, v] });
        if (k === 'main') saveLayout({ ...L, main: v }); if (k === 'lw' || k === 'rw') saveLayout({ ...L, [k]: Number(v) });
        if (k === 'reset') W('hpLayout', {});
        if (k === 'minor') { const m = hpMinor(); W('hpMinor', m.includes(v) ? m.filter(x => x !== v) : [...m, v]); }
        if (k === 'hudskin') set.hpSkinHud = set.hpSkinHud === false;
        if (k === 'edit') editWins = !editWins;
        if (k === 'cover' && v === 'del') delete set.hpCover;
        if (k === 'cover' && v === 'add') { pickImage(1400, 0.8, (src) => { set.hpCover = src; after(); }); return; }
        const meta = (() => { try { return getMeta(); } catch { return null; } })();
        if (k === 'unbind' && meta) delete meta.hpSet;
        if (k === 'setsave') { const n = await askInput('꾸밈 세트 이름', '지금 꾸민 모양(색 · 글꼴 · 창 자리 등)을 이 이름으로 저장해요. 머리 그림과 내가 올린 프로필 그림은 들어가지 않아요.', ''); const name = short((n ?? '').trim(), 20); if (name) set.hpSets = [...sets.filter(x => x.name !== name), { name, data: cleanSet(snapshot()) }].slice(-20); }
        if (k === 'setimport') { const c = await askInput('꾸밈 코드 붙여넣기', 'MBH1: 로 시작하는 코드를 붙여 넣어요.', ''); if (c) { const got = fromCode(c); if (got) { set.hpSets = [...sets.filter(x => x.name !== got.name), got].slice(-20); toastr.success(`「${got.name}」 세트를 가져왔어요. 「적용」을 누르면 바뀌어요.`, TITLE); } else toastr.error('코드를 읽지 못했어요. 처음부터 끝까지 다 복사했는지 봐 주세요.', TITLE); } }
        const one = sets[Number(v)];
        if (k === 'apply' && one) { if (meta) delete meta.hpSet; Object.assign(set, JSON.parse(JSON.stringify(one.data))); }
        if (k === 'bind' && one && meta) { if (meta.hpSet === one.name) delete meta.hpSet; else meta.hpSet = one.name; }
        if (k === 'setdel' && one) { set.hpSets = sets.filter(x => x !== one); if (meta?.hpSet === one.name) delete meta.hpSet; }
        if (k === 'code' && one) { const code = toCode(one.name, one.data); try { await navigator.clipboard.writeText(code); toastr.success('코드를 복사했어요. 붙여 넣어 보내면 돼요.', TITLE); } catch { await askInput('꾸밈 코드', '아래 글을 전부 복사해서 보내요.', code); } }
        after();
        if (k === 'edit') return; // 창을 옮기러 가게 닫는다
    }
}
// 오늘의 기분: 지금 상태로 정한다 (토큰 0)
function mood(s, meta, nNew) {
    if (meta.paused) return ['blanket', '쉬는 중'];
    const bars = s.data.stats?.bars ?? [], hp = bars.find(b => /체력|hp|health|생명/i.test(b.name)) ?? bars[0];
    if (hp && hp.max > 0 && hp.cur / hp.max < 0.3) return ['sad', '기운 없음'];
    const roll = (s.data.dice?.log ?? []).at(-1);
    if (roll && Date.now() - (roll.t ?? 0) < 90000) { if (roll.cls === 'crit') return ['proud', '대성공!']; if (roll.cls === 'fumble') return ['sad', '대실패…']; if (roll.cls === 'fail') return ['sulk', '아깝다']; if (roll.cls === 'ok') return ['focus', '성공']; }
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
    // 탭이 바뀌었을 때 · 기분이 바뀌었을 때만 작은 움직임
    try { const st = el._ss, key = `${st?.group}/${st?.tab}`; if (el._hpTab !== undefined && el._hpTab !== key) body?.classList.add('ss-hp-swap'); el._hpTab = key; const face = root.querySelector('.ss-hp-photo img'), fk = face?.getAttribute('src'); if (el._hpFace !== undefined && fk && el._hpFace !== fk) face.parentElement.classList.add('pop'); el._hpFace = fk; } catch { /* 꾸밈일 뿐 */ }
    if (matchMedia('(max-width: 640px)').matches) return;
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
    try { window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyRetro()); const C = ctx(); C.eventSource?.on?.(C.event_types?.CHAT_CHANGED ?? C.eventTypes?.CHAT_CHANGED, () => setTimeout(applyRetro, 300)); } catch (e) { ssErr(e); } // 채팅마다 다른 꾸밈 세트
    let rt = null; const refit = () => { clearTimeout(rt); rt = setTimeout(() => document.querySelectorAll('.ss-hompy').forEach(r => fitHompy(r.closest('.ss-panel'))), 120); };
    window.addEventListener('resize', refit);
    document.addEventListener('load', (e) => { if (e.target?.tagName === 'IMG' && e.target.closest?.('.ss-hompy')) refit(); }, true);
    document.addEventListener('click', async (e) => {
        const b = e.target.closest?.('.ss-hompy [data-hp]'); if (!b) return;
        e.preventDefault(); e.stopPropagation();
        const el = b.closest('.ss-panel');
        if (b.dataset.hp === 'close') { el?.closest('dialog')?.querySelector('.popup-button-ok')?.click(); return; }
        if (b.dataset.hp === 'mv') { const [key, how] = String(b.dataset.arg).split(':'); moveWin(key, how, [...(b.closest('.ss-hp-col')?.querySelectorAll('[data-win]') ?? [])].map(x => x.dataset.win)); if (el?.isConnected) app.renderPanel?.(el); return; }
        if (b.dataset.hp === 'fold' && el?._ss) { const o = el._ss.hpOpen ?? (el._ss.hpOpen = []), i = o.indexOf(b.dataset.arg); if (i >= 0) o.splice(i, 1); else o.push(b.dataset.arg); app.renderPanel?.(el); return; } // 「모음」 칸 펼치기 · 접기
        if (b.dataset.hp === 'solo' && el?._ss) { Object.assign(el._ss, { tab: b.dataset.arg, hpSolo: b.dataset.arg, mode: 'view', ui: {} }); app.renderPanel?.(el); return; } // 이 칸만 크게
        if (b.dataset.hp === 'all' && el?._ss) { el._ss.hpSolo = null; el._ss.mode = 'view'; app.renderPanel?.(el); return; } // 묶음 전체로
        if (b.dataset.hp === 'skinpick') { const v = b.dataset.arg; if (SKINS[v]) settings().hpSkin = v; else settings().hpSkin = settings().hpSkin ?? 'clean'; saveSettings(); applyRetro(); app.rerenderPanels?.(true); app.renderHud?.(); return; } // 처음 한 번: 모양 고르기
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
    const mine = String(D().hpFace ?? '').startsWith('my:') && !!settings().hpFaces?.[Number(String(D().hpFace).slice(3))];
    const home = !!homeGroup, photo = photoHTML(meta), hasPhoto = !!meta.hpPhoto?.src; // 홈 묶음에서는 사진이 가운데 창에 크게 → 옆의 사진 창은 안 띄움
    // 창 내용 (없으면 빈 글 → 창이 안 뜸)
    const BODY = {
        profile: () => `<div class="ss-hp-prof"><div class="ss-hp-photo ${mine ? 'mine' : ''}" data-hp="face" role="button" title="눌러서 프로필 그림 바꾸기"><img src="${esc(faceSrc(con))}" alt=""></div>
            <div class="ss-hp-prof-t"><b class="ss-hp-name">${esc(c.title || TITLE)}</b><span class="ss-hp-today"><i></i>${esc(feel)}</span></div></div>
            <div class="ss-hp-badges"><span><b>${fmtNum(s.turn ?? 0)}</b>턴</span><span><b>${fmtNum(total)}</b>메시지</span>${(s.days ?? []).length ? `<span><b>${(s.days ?? []).length + 1}</b>일째</span>` : ''}</div>`,
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
    const cover = settings().hpCover;
    return `<div class="${rootCls} ss-hompy ss-hp-k-${skinOf()} ${skinOf() === 'dot' ? `ss-hp-dot ss-hp-p-${patOf()}` : ''} ${home ? 'ss-hp-athome' : ''} ${enter ? 'ss-hp-enter' : ''}" style="--hp-h:${hue};--hp-s:${sat};--hp-fs:${fsPx()}px">
        <div class="ss-hp-url ss-hp-top ${cover ? 'has-cover' : ''}"${cover ? ` style="background-image:linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.45)), url('${esc(cover)}')"` : ''}><i class="ss-hp-dots"></i><i class="ss-hp-dots"></i><i class="ss-hp-dots"></i><span class="ss-hp-nav" aria-hidden="true">‹ › ⟳</span><span class="ss-hp-addr"><small>meatball.home/</small><b>${esc(short(c.title || TITLE, 30))}</b></span>${headHTML}<button class="ss-hp-x ss-hp-deco-m" data-hp="deco" title="꾸미기"><i class="fa-solid fa-palette"></i></button><button class="ss-hp-x" data-hp="close" title="닫기"><i class="fa-solid fa-xmark"></i></button><em></em></div>
        <div class="ss-hp-marks"><div class="ss-hp-index">${groupsHTML}</div><span class="ss-hp-count">TURN <b>${s.turn ?? 0}</b> · TOTAL <b>${total}</b></span>${editWins ? '<button class="ss-hp-deco-b on" data-hp="editdone">✓ 창 옮기기 끝</button>' : ''}<button class="ss-hp-deco-b" data-hp="deco" title="색 · 글씨 크기 · 창 자리 · 보일 창"><i class="fa-solid fa-palette"></i> 꾸미기</button></div>
        ${settings().hpSkin === undefined ? `<div class="ss-hp-choose"><b>어떤 모양으로 볼까요?</b><small>나중에 「꾸미기」에서 언제든 바꿀 수 있어요.</small>
            <button data-hp="skinpick" data-arg="clean" class="${skinOf() === 'clean' ? 'on' : ''}"><span class="ss-hp-pv clean"><i></i><i></i><i></i></span>깔끔</button>
            <button data-hp="skinpick" data-arg="dot" class="${skinOf() === 'dot' ? 'on' : ''}"><span class="ss-hp-pv dot"><i></i><i></i><i></i></span>도트</button>
            <button data-hp="skinpick" data-arg="" class="x" title="지금 모양 그대로">✕</button></div>` : ''}
        ${(() => {
            const lcol = L ? `<aside class="ss-hp-col ss-hp-left"><div class="ss-hp-col-in ss-hp-left-in">${L}</div></aside>` : '', rcol = R ? `<aside class="ss-hp-col ss-hp-rcol"><div class="ss-hp-col-in">${R}</div></aside>` : '';
            const main = `<section class="ss-hp-win main"><div class="ss-hp-wt"><b>${esc(c.title || TITLE)}</b><i class="ss-hp-hearts">♡♡♡</i></div><div class="ss-hp-right">${pauseHTML}${mainBody}</div></section>`;
            const order = LY.main === 'l' ? [['m', main], ['l', lcol], ['r', rcol]] : LY.main === 'r' ? [['l', lcol], ['r', rcol], ['m', main]] : [['l', lcol], ['m', main], ['r', rcol]];
            const cols = order.filter(([, h]) => h).map(([k]) => (k === 'm' ? 'minmax(0, 1fr)' : COLW[k === 'l' ? LY.lw : LY.rw])).join(' ');
            return `<div class="ss-hp-book ${editWins ? 'ss-hp-editing' : ''}" style="grid-template-columns:${cols}">${order.map(([, h]) => h).join('')}</div>`;
        })()}
    </div>`;
}
