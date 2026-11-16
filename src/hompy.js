// 📒 미니홈피 화면 (v2.8): 상태창을 전체화면으로 열면 수첩 모양의 「홈피」로 보여 준다 (설정 hompyFull · 기본 켬)
// 안쪽(오른쪽 쪽)은 평소 상태창 그대로 — 틀만 씌운다: 주소창 · 수첩 표지 · 왼쪽 프로필 쪽 · 링 · 오른쪽 색인 탭
// 계산은 없음(화면만) · 그림은 img/meatcon/ 의 미트볼콘 (폴더 이름을 con으로 하면 윈도우에서 못 만든다 — 예약된 이름)
import { app, esc, short, fmtNum, modOn, relAxes, ctx, TITLE, dateShort, getMeta, saveMeta, ssErr, settings, saveSettings, mascotUrl } from './core.js';
import { avatar, askInput, choosePopup } from './kit.js';
import { shrinkImage, MINI, miniWidgets } from './tiles.js';

// 🎨 꾸밈 값: 보통은 설정(모든 채팅 공통). 이 채팅에 꾸밈 세트를 묶어 두었으면(meta.hpSet = 세트 이름) 그 세트 값이 먼저다 — 고쳐도 그 세트가 바뀐다
const DECO_KEYS = ['hpLite', 'hpPet', 'hpParts', 'hpTitles', 'hpGroupNames', 'hpProf', 'hpCounts', 'hpCardAlpha', 'hpFree', 'hpFreeOn', 'hpUserWins', 'hpSkin', 'hpPattern', 'hpFsPx', 'hpInk', 'hpBg', 'hpPaper', 'hpNavTop', 'hpTheme', 'hpHue', 'hpSat', 'hpFs', 'hpFont', 'hpCorner', 'hpGap', 'hpDark', 'hpMotion', 'hpLayout', 'hpMinor', 'hpFace', 'hpWall'];
const boundSet = () => { try { const n = getMeta()?.hpSet; return n ? (settings().hpSets ?? []).find(x => x.name === n) ?? null : null; } catch { return null; } };
const D = () => { const b = boundSet(); return b ? { ...settings(), ...b.data } : settings(); };
const W = (k, v) => { const b = boundSet(); (b ? b.data : settings())[k] = v; };
const snapshot = () => { const d = D(), o = {}; for (const k of DECO_KEYS) if (d[k] !== undefined) o[k] = JSON.parse(JSON.stringify(d[k])); return o; };
const NESTED = ['hpParts', 'hpTitles', 'hpGroupNames', 'hpProf', 'hpCounts', 'hpFree', 'hpUserWins'];
const plain = (v, depth = 0) => { if (v === null || ['number', 'boolean'].includes(typeof v)) return v; if (typeof v === 'string') return v.slice(0, 300); if (depth > 3 || typeof v !== 'object') return undefined; if (Array.isArray(v)) return v.slice(0, 12).map(x => plain(x, depth + 1)).filter(x => x !== undefined); const o = {}; for (const k of Object.keys(v).slice(0, 40)) { if (/^(__proto__|constructor|prototype)$/.test(k)) continue; const x = plain(v[k], depth + 1); if (x !== undefined) o[String(k).slice(0, 30)] = x; } return o; };
const cleanSet = (o) => { const r = {}; if (!o || typeof o !== 'object') return r; for (const k of DECO_KEYS) { const v = o[k]; if (v === undefined || v === null) continue; if (k === 'hpLayout') { if (typeof v === 'object' && !Array.isArray(v)) r[k] = { l: v.l, r: v.r, off: v.off, main: v.main, lw: v.lw, rw: v.rw }; } else if (k === 'hpMinor') { if (Array.isArray(v)) r[k] = v.filter(x => typeof x === 'string').slice(0, 12); } else if (NESTED.includes(k)) { const x = plain(v); if (x && typeof x === 'object' && JSON.stringify(x).length <= 6000) r[k] = x; } else if (['string', 'number', 'boolean'].includes(typeof v) && String(v).length <= 24) r[k] = v; } if (String(r.hpFace ?? '').startsWith('my:')) delete r.hpFace; if (r.hpFont === 'u') delete r.hpFont; return r; };
export const toCode = (name, data) => 'MBH1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ n: name, d: cleanSet(data) }))));
export const fromCode = (code) => { try { const j = JSON.parse(decodeURIComponent(escape(atob(String(code).trim().replace(/^MBH1:/, ''))))); const d = cleanSet(j.d); return Object.keys(d).length ? { name: short(String(j.n || '가져온 꾸밈'), 20), data: d } : null; } catch { return null; } };
export const conUrl = (n) => new URL(`../img/meatcon/${n}.webp`, import.meta.url).href;
export const CONS = ['hi', 'proud', 'heart', 'pray', 'focus', 'groom', 'blank', 'roll', 'box', 'blanket', 'tongue', 'sulk', 'sad', 'gasp'];
// 🐱 콘팩 (v2.8 · 선택): 확장에는 기본 14개만 들어 있고, 나머지 60개는 「콘팩 받기」를 눌렀을 때만 깃허브(conpack 브랜치 · jsDelivr)에서 가져온다.
//   주소에 커밋 번호를 박아 둬서 한 번 받으면 브라우저가 오래 보관한다 (팩을 바꾸면 이 번호도 바꾼다).
const PACK_BASE = 'https://cdn.jsdelivr.net/gh/dfzfs/meatballstats@f4b772615c992d1a7f3be46d798c19c09e20094c/';
export const PACK = ["오열", "울먹부들", "엎드려훌쩍", "시무룩", "빵터짐", "깔깔", "킹받음", "분노", "흥칫", "째려봄", "곁눈질", "의기양양", "충격", "비명", "헉", "동공지진", "뒤돌아흥", "부끄", "감동", "제발", "두손모아", "하트", "안녕", "신남", "파라파라", "축하", "담요눈치", "박스", "꿀잠", "수면모자", "냠냠", "커피수혈", "녹아내림", "질주", "메롱", "키보드점령", "롱캣", "하악", "식빵", "뒹굴", "멍", "컵밀기", "발핥기", "냥냥펀치", "휙", "멀뚱", "그루밍", "날름", "식빵 2", "뒹굴 2", "열일", "미안", "째려봄 2", "삐짐", "납작 2", "궁금", "헉 2", "울먹 2", "집중", "축하 2"].map((n, i) => [String(i + 1).padStart(2, '0'), n]);
export const packUrl = (id) => `${PACK_BASE}${id}.webp`;
export const packOn = () => settings().conPack === true;
const packHas = (id) => PACK.some(([k]) => k === id);
// 받기: 60장을 차례로 미리 불러 브라우저에 담아 둔다 (진행은 알림으로) — 실패한 그림은 쓸 때 다시 받는다
async function packDownload() {
    const set = settings(); set.conPack = true; saveSettings(); if (globalThis.__SS_TEST__) return PACK.length;
    let ok = 0; const note = toastr.info(`콘팩 받는 중… 0 / ${PACK.length}`, TITLE, { timeOut: 0, extendedTimeOut: 0 });
    for (let i = 0; i < PACK.length; i += 6) { await Promise.all(PACK.slice(i, i + 6).map(([id]) => new Promise((res) => { const im = new Image(); im.onload = () => { ok++; res(); }; im.onerror = () => res(); im.src = packUrl(id); }))); try { note?.find?.('.toast-message')?.text?.(`콘팩 받는 중… ${Math.min(i + 6, PACK.length)} / ${PACK.length}`); } catch { /* */ } }
    try { toastr.clear(note); } catch { /* */ }
    if (ok) toastr.success(`콘팩 ${ok}개를 받았어요.`, TITLE); else { set.conPack = false; saveSettings(); toastr.error('콘팩을 받지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.', TITLE); }
    return ok;
}
// 프로필 그림: 설정 hpFace — 'pack:번호'(콘팩 · 받았을 때만) · 'none'(비워 둠 · 기본 — 눌러서 자유롭게 넣는다) · 'auto'(기분 따라 미트볼) · 'con:이름'(기본 이모티콘) · 'my:번호'(내가 올린 그림 · settings().hpFaces · 최대 12장 · 모든 채팅 공통)
function faceSrc(autoCon) {
    const f = String(D().hpFace ?? 'none'); if (f === 'none') return '';
    if (f.startsWith('con:') && CONS.includes(f.slice(4))) return conUrl(f.slice(4));
    if (f.startsWith('my:')) { const src = settings().hpFaces?.[Number(f.slice(3))]; if (src) return src; }
    if (f.startsWith('pack:')) return packOn() && packHas(f.slice(5)) ? packUrl(f.slice(5)) : '';
    const own = settings().hpMoodFaces?.[autoCon]; if (own) return own; // 기분별 내 그림
    return conUrl(autoCon);
}
async function pickFace(redraw) {
    const set = settings(), cur = String(D().hpFace ?? 'none'), mine = set.hpFaces ?? [];
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-hp-pick';
    const cell = (v, inner, title = '') => `<button class="ss-hp-face ${cur === v ? 'on' : ''}" data-choice="${v}" title="${esc(title)}">${inner}</button>`;
    box.innerHTML = `<h3>프로필 그림 고르기</h3><p class="ss-hint">기본은 비어 있어요 — 내 그림을 올리거나 미트볼을 골라요. 「기분 따라 미트볼」은 지금 상태에 맞춰 표정이 바뀌어요. 내 그림은 12장까지 올릴 수 있고 모든 채팅에서 같이 써요.</p>
        <div class="ss-hp-faces">${cell('none', '<span>비워<br>두기</span>', '그림 없이')}${cell('auto', '<span>기분 따라<br>미트볼</span>', '상태에 따라 미트볼 표정이 바뀌어요')}${CONS.map(n => cell(`con:${n}`, `<img src="${conUrl(n)}" alt="">`)).join('')}</div>
        <h4>콘팩 <small>선택 · 60개 · 약 4.7MB</small></h4>${packOn()
            ? `<div class="ss-hp-faces pack">${PACK.map(([id, n]) => cell(`pack:${id}`, `<img src="${packUrl(id)}" alt="${esc(n)}" loading="lazy">`, n)).join('')}</div><p class="ss-hint">${cell('packoff', '<span>콘팩<br>빼기</span>', '콘팩 그림을 목록에서 빼요 (다시 받을 수 있어요)')}</p>`
            : `<p class="ss-hint">기본 그림 14개는 이미 들어 있어요. 더 많은 미트볼콘은 원할 때만 받아요 — 받을 때 한 번 인터넷(깃허브)에 접속해요.</p><div class="ss-hp-faces">${cell('packget', '<span><i class="fa-solid fa-download"></i><br>콘팩 받기</span>', '미트볼콘 60개를 받아요 (선택)')}</div>`}
        <h4>내 그림</h4><div class="ss-hp-faces">${mine.map((src, i) => `<span class="ss-hp-mine">${cell(`my:${i}`, `<img src="${esc(src)}" alt="">`)}<button class="ss-ib" data-choice="del:${i}" title="이 그림 지우기"><i class="fa-solid fa-xmark"></i></button></span>`).join('')}${mine.length < 12 ? cell('upload', '<span><i class="fa-solid fa-plus"></i><br>올리기</span>', '내 그림 올리기') : ''}</div>`;
    const pick = await choosePopup(box, '닫기'); if (!pick) return;
    if (pick.startsWith('del:')) { const i = Number(pick.slice(4)); set.hpFaces = mine.filter((_, k) => k !== i); const c = cur.startsWith('my:') ? Number(cur.slice(3)) : -1; W('hpFace', c === i ? 'none' : c > i ? `my:${c - 1}` : cur); saveSettings(); redraw(); return pickFace(redraw); }
    if (pick === 'packget') { await packDownload(); return pickFace(redraw); }
    if (pick === 'packoff') { set.conPack = false; if (cur.startsWith('pack:')) W('hpFace', 'none'); saveSettings(); redraw(); return pickFace(redraw); }
    if (pick === 'upload') {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async () => { try { const f = inp.files?.[0]; if (!f) return; set.hpFaces = [...(set.hpFaces ?? []), await shrinkImage(f, 320, 0.85, FACE_CAP)].slice(0, 12); W('hpFace', `my:${set.hpFaces.length - 1}`); saveSettings(); redraw(); } catch (err) { ssErr(err); toastr.error('그림을 넣지 못했어요. 다른 그림으로 해 보세요.', TITLE); } };
        inp.click(); return;
    }
    W('hpFace', pick); saveSettings(); redraw();
}
// 🎨 꾸미기 (모든 채팅 공통): 포인트 색 · 글씨 크기 · 창 자리 · 보일 창 (깔끔한 블로그 모양 — 무늬 · 도트 글꼴은 뺐다)
export const THEMES = [['분홍', 340, 1], ['회색', 260, 0.08], ['하늘', 215, 1], ['민트', 150, 0.8], ['빨강', 2, 1], ['살구', 22, 1], ['노랑', 46, 1], ['보라', 268, 1]];
const themeOf = () => { const d = D(); return d.hpTheme === 'c' ? ['직접', Math.max(0, Math.min(360, Number(d.hpHue) || 0)), Math.max(0, Math.min(1.2, Number(d.hpSat ?? 1)))] : THEMES[Number(d.hpTheme) || 0] ?? THEMES[0]; };
const FONTS = { g: '기본', s: '명조', r: '둥근 글꼴', m: '고정폭', u: '내 글꼴' }, CORNERS = ['각지게', '보통', '둥글게'], GAPS = ['촘촘', '보통', '넉넉'], DARKS = { light: '밝게', dark: '어둡게', auto: '기기 따라' };
const pick3 = (v) => ([0, 1, 2].includes(Number(v)) && v !== null && v !== undefined && v !== '' ? Number(v) : 1);
const SKIN_DEF = { phone: ['g', 'light'], clean: ['g', 'light'], dot: ['g', 'light'] }; // 모양을 고르면 따라오는 글꼴 · 밝기
// 🖼 배경화면 (v2.8 · 아이폰 · 갤럭시의 배경화면 고르기처럼): 그림 파일 없이 색 번짐만으로 — 고르면 창이 살짝 비치는 유리가 된다 (깔끔 · 폰 모양)
export const WALLS = { dawn: ['새벽', 0], ocean: ['바다', 0], mint: ['민트', 0], peach: ['복숭아', 0], lilac: ['라일락', 0], sand: ['모래', 0], night: ['밤하늘', 1], forest: ['숲', 1] };
export const wallOf = () => (WALLS[D().hpWall] && ['clean', 'phone'].includes(skinOf()) && !settings().hpBgImg ? D().hpWall : '');
export const SKINS = { clean: '깔끔', dot: '도트', phone: '폰' }, PATTERNS = { grid: '모눈', dot: '물방울', stripe: '줄무늬', none: '없음' };
export const skinOf = () => (SKINS[D().hpSkin] ? D().hpSkin : 'clean'); // 고르지 않았으면 깔끔 (처음 열 때 고르는 줄이 뜬다)
const patOf = () => (PATTERNS[D().hpPattern] ? D().hpPattern : 'grid');
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v ?? '')) ? String(v) : '');
const darkOn = () => { const v = D().hpDark; return v === 'dark' || v === 'auto' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches; };
// 🪟 HUD · 미니창 · 보통 상태창에도 같은 색 · 테두리 (설정 hpSkinHud · 기본 끔): body에 색 값과 표시를 걸어 둔다
// 지금 글꼴: 도트 모양은 기본이 도트 글꼴(d)이지만, 직접 고르면(hpFontPick) 그 글꼴로 — 예전엔 도트 모양에서 글꼴을 못 바꿨다
const fontKey = () => { const d = D(), dot = skinOf() === 'dot'; return d.hpFont === 'u' && settings().hpFontFile ? 'u' : dot && !(d.hpFontPick === true && FONTS[d.hpFont]) ? 'd' : FONTS[d.hpFont] && d.hpFont !== 'u' ? d.hpFont : 'g'; };
const fontOpts = () => [...(skinOf() === 'dot' ? [['d', '도트']] : []), ...Object.entries(FONTS).filter(([k]) => k !== 'u' || settings().hpFontFile)];
// ⚡ 글꼴 목록 줄이기: CSS의 글꼴 목록은 「있으면 쓰라」는 후보를 8~11개 늘어놓은 것인데, 브라우저는 글씨 크기 · 굵기가 새로 나올 때마다 앞에서부터 하나씩 「이 기기에 있나」를 찾아본다.
//   없는 글꼴이 앞에 일곱 개 있으면 크기 · 굵기 하나에 여덟 번 — 상태창을 처음 열 때 화면 계산 시간의 대부분이 이 찾기였다 (재 보니 158번).
//   → 이 기기에 실제로 있는 것만 남긴 목록을 한 번 만들어(한가할 때 · 기기에 기억) 덮어쓴다. 보이는 글꼴은 그대로다 — 어차피 없는 글꼴은 안 쓰였으니까.
const FONT_STACKS = {
    g: ["'IBM Plex Sans KR'", "'Pretendard Variable'", 'Pretendard', '-apple-system', 'BlinkMacSystemFont', "'Apple SD Gothic Neo'", "'Malgun Gothic'", "'Noto Sans KR'", 'sans-serif'],
    s: ["'Noto Serif KR'", "'Nanum Myeongjo'", "'AppleMyungjo'", "'Batang'", 'Georgia', 'serif'],
    r: ["'NanumSquareRound'", "'Nanum Gothic Round'", "'Jua'", "'Cafe24 Ssurround'", "'Arial Rounded MT Bold'", "'Hiragino Maru Gothic ProN'", "'Pretendard Variable'", 'Pretendard', "'Apple SD Gothic Neo'", "'Malgun Gothic'", 'sans-serif'],
    m: ["'JetBrains Mono'", "'D2Coding'", "'Cascadia Mono'", "'Nanum Gothic Coding'", 'Consolas', "'Malgun Gothic'", 'monospace'],
};
const FONT_KEY = 'ss_hp_fontstacks_v1', GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'system-ui']);
const writeFontCss = (stacks) => { let el = document.getElementById('ss-hp-fonts'); if (!el) { el = document.createElement('style'); el.id = 'ss-hp-fonts'; document.head.appendChild(el); } const css = Object.entries(stacks).filter(([k, v]) => FONT_STACKS[k] && typeof v === 'string' && /^[\w\s'",-]+$/.test(v)).map(([k, v]) => `body.ss-hp-f-${k}.ss-hp-f-${k}{--hp-font:${v}}`).join('\n'); if (el.textContent !== css) el.textContent = css; };
function detectFonts() {
    const cv = document.createElement('canvas').getContext('2d'); if (!cv) return null;
    const text = 'mmmmmmmmmmlli 가나다라마바사 0123', w = (f) => { cv.font = `72px ${f}`; return cv.measureText(text).width; };
    const base = { monospace: w('monospace'), serif: w('serif') }, apple = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || ''), seen = new Map();
    const has = (f) => { if (GENERIC.has(f)) return true; if (f === '-apple-system' || f === 'BlinkMacSystemFont') return apple; if (!seen.has(f)) seen.set(f, w(`${f}, monospace`) !== base.monospace || w(`${f}, serif`) !== base.serif); return seen.get(f); };
    const out = {}; for (const [k, list] of Object.entries(FONT_STACKS)) { const keep = list.filter(has); out[k] = (keep.some(f => !GENERIC.has(f)) ? keep : list.filter(f => GENERIC.has(f))).join(', '); }
    return out;
}
export function trimFonts(force = false) {
    try {
        const sig = `${navigator.userAgent}|${Object.values(FONT_STACKS).map(x => x.length).join(',')}`;
        let saved = null; try { saved = JSON.parse(localStorage.getItem(FONT_KEY) || 'null'); } catch { /* 저장소를 못 쓰는 환경 */ }
        if (!force && saved?.sig === sig && saved.stacks && Date.now() - (saved.t ?? 0) < 7 * 864e5) { writeFontCss(saved.stacks); return saved.stacks; } // 일주일에 한 번은 다시 본다 (그 사이 글꼴을 새로 깔았을 수 있으니)
        const stacks = detectFonts(); if (!stacks) return null;
        writeFontCss(stacks); try { localStorage.setItem(FONT_KEY, JSON.stringify({ sig, stacks, t: Date.now() })); } catch { /* 저장 못 해도 이번엔 적용됨 */ }
        return stacks;
    } catch (e) { ssErr(e); return null; }
}
app.applyRetro = () => applyRetro(); // 확장 설정에서 모양 스위치를 바꿨을 때
export function applyRetro() {
    const b = document.body; if (!b) return; const d = D(), [, h, s] = themeOf(), on = settings().hpSkinHud !== false, dot = skinOf() === 'dot';
    b.classList.toggle('ss-retro', on); for (const k of Object.keys(SKINS)) b.classList.toggle(`ss-skin-${k}`, skinOf() === k); b.classList.toggle('ss-hp-dark', darkOn()); b.classList.toggle('ss-hp-still', d.hpMotion === false); b.classList.toggle('ss-hp-navtop', d.hpNavTop === true); for (const k of Object.keys(WALLS)) b.classList.toggle(`ss-hp-wall-${k}`, wallOf() === k); b.classList.toggle('ss-hp-wall', !!wallOf());
    for (const [p, v, all] of [['ss-hp-r-', pick3(d.hpCorner), [0, 1, 2]], ['ss-hp-g-', pick3(d.hpGap), [0, 1, 2]], ['ss-hp-f-', fontKey(), [...Object.keys(FONTS), 'd']]]) for (const x of all) b.classList.toggle(p + x, x === v);
    b.style.setProperty('--hp-h', String(h)); b.style.setProperty('--hp-s', String(s));
    b.style.setProperty('--hp-fs', `${fsUse()}px`); // 다른 창(도우미 등)의 글씨 크기도 같이
    // 팝업 알림(body 바로 아래에 뜸)도 지금 모양을 따르게: 스킨 색을 한 번 읽어 body에 --tp-○ 로 넣는다 (스킨 · 밝기 · 색을 바꿀 때마다)
    if (!booting) try { let pr = document.getElementById('ss-tp-probe'); if (!pr) { pr = document.createElement('div'); pr.id = 'ss-tp-probe'; pr.className = 'ss-root ss-rt'; pr.style.display = 'none'; pr.setAttribute('aria-hidden', 'true'); document.body.appendChild(pr); }
        const cs = getComputedStyle(pr); for (const k of ['paper', 'ink', 'dim', 'ol', 'acc', 'soft', 'strip', 'r', 'font']) { const v = cs.getPropertyValue(`--hp-${k}`).trim(); if (v) b.style.setProperty(`--tp-${k}`, v); else b.style.removeProperty(`--tp-${k}`); } } catch { /* 꾸밈일 뿐 */ }
    // 직접 고른 글자 · 바탕 · 카드 색 (비우면 모양의 기본색)
    const ink = hex(d.hpInk), set = (k, v) => (v ? b.style.setProperty(k, v) : b.style.removeProperty(k));
    try { writeUserCss(); } catch (e) { ssErr(e); }
    set('--hp-ink-u', ink); set('--hp-dim-u', ink ? `color-mix(in srgb, ${ink} 58%, transparent)` : ''); set('--hp-bg-u', hex(d.hpBg)); set('--hp-paper-u', hex(d.hpPaper));
}
// 🧩 부분마다 따로 꾸미기: hpParts = { 부분: { ink · bg · bd(색) · bw(테두리 굵기 px) · r(둥글기 px) · fs(글씨 배율) } } — 값은 여기서 한 번 더 걸러 CSS로 만든다
export const PARTS = {
    head: ['머리줄', '.ss-hp-url', '.ss-hp-url, .ss-hp-url .ss-hp-addr b, .ss-hp-url .ss-ib'],
    nav: ['메뉴', '.ss-hp-marks', '.ss-hp-marks .ss-groups > button'],
    wt: ['창 제목', '.ss-hp-wt', '.ss-hp-wt b'],
    win: ['창', '.ss-hp-win', '.ss-hp-win, .ss-hp-win .ss-body'],
    card: ['카드', '.ss-body :is(.ss-card, .ss-mini-w, .ss-item, .ss-rtile, .ss-attr, .ss-callout, .ss-st-f, .ss-st-card, .ss-quest, .ss-article, .ss-goss, .ss-post)', null],
    btn: ['단추', ':is(.ss-body, .ss-hp-marks) :is(.ss-btn, .ss-pill, .ss-chip, .ss-hp-deco-b)', null],
};
const PART_PICK = [['btn', '.ss-btn, .ss-pill, .ss-chip, .ss-hp-deco-b'], ['card', '.ss-body :is(.ss-card, .ss-mini-w, .ss-item, .ss-rtile, .ss-attr, .ss-callout, .ss-st-f, .ss-st-card, .ss-quest, .ss-article, .ss-goss, .ss-post)'], ['wt', '.ss-hp-wt'], ['head', '.ss-hp-url'], ['nav', '.ss-hp-marks'], ['win', '.ss-hp-win']];
const numIn = (v, lo, hi) => { const n = Number(v); return v !== '' && v !== null && v !== undefined && Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
export function userCss() {
    const d = D(), set = settings(), R = '.ss-root.ss-hompy', out = [];
    for (const [k, [, box, text]] of Object.entries(PARTS)) {
        const p = d.hpParts?.[k]; if (!p || typeof p !== 'object') continue;
        const ink = hex(p.ink), bg = hex(p.bg), bd = hex(p.bd), bw = numIn(p.bw, 0, 4), r = numIn(p.r, 0, 28), fs = numIn(p.fs, 0.7, 1.6), b = [];
        if (bg) b.push(`background-color:${bg}!important;background-image:none!important`); if (bd) b.push(`border-color:${bd}!important`); if (bw !== null) b.push(`border-width:${bw}px!important;border-style:solid!important`);
        if (r !== null) b.push(`border-radius:${r}px!important`); if (fs !== null) b.push(`font-size:${fs}em!important`); if (ink && !text) b.push(`color:${ink}!important`);
        if (b.length) out.push(`${box.split(', ').map(x => `${R} ${x}`).join(', ')}{${b.join(';')}}`);
        if (ink && text) out.push(`${text.split(', ').map(x => `${R} ${x}`).join(', ')}{color:${ink}!important}`);
    }
    const al = numIn(d.hpCardAlpha, 0.3, 0.99); if (al !== null) out.push(`${R} .ss-hp-win{background-color:color-mix(in srgb, var(--hp-paper) ${Math.round(al * 100)}%, transparent)!important;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}`);
    const img = String(set.hpBgImg ?? ''); if (/^data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+$/.test(img)) out.push(`${R}{background-image:url("${img}")!important;background-size:${set.hpBgTile ? '220px auto' : 'cover'}!important;background-position:center!important;background-repeat:${set.hpBgTile ? 'repeat' : 'no-repeat'}!important}`);
    const ff = set.hpFontFile; if (ff && /^data:(font|application)\/[a-z0-9+.-]+;base64,[A-Za-z0-9+/=]+$/.test(String(ff))) out.push(`@font-face{font-family:'MeatballUser';src:url("${ff}");font-display:swap}body.ss-hp-f-u{--hp-font:'MeatballUser','Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif}`);
    const css = String(set.hpCss ?? '').replace(/<\/?style/gi, '').replace(/@import[^;]*;?/gi, '').slice(0, 20000); if (css.trim()) out.push(`/* 내 CSS */\n${css}`);
    return out.join('\n');
}
function writeUserCss() { let el = document.getElementById('ss-hp-user'); if (!el) { el = document.createElement('style'); el.id = 'ss-hp-user'; document.head.appendChild(el); } const css = userCss(); if (el.textContent !== css) el.textContent = css; }
// 내가 만드는 창: hpUserWins = [{ id: 'u1', type: 'note' | 'stat', title, text, stat }] (최대 8개) — 창 열쇠는 id
const userWins = () => (Array.isArray(D().hpUserWins) ? D().hpUserWins.filter(w => w && /^u\d+$/.test(String(w.id)) && ['note', 'stat'].includes(w.type)).slice(0, 8) : []);
const winName = (k) => WINS[k] ?? userWins().find(w => w.id === k)?.title ?? '';
// 창 하나하나의 자리: settings().hpLayout = { l: [왼쪽 줄 순서], r: [오른쪽 줄 순서], off: [숨긴 창], main: 'c'|'l'|'r'(가운데 창 위치), lw · rw: 0~2(줄 폭) }
export const WINS = { profile: '프로필', intro: '소개', stats: '상태', friends: '일촌', quest: '퀘스트', news: '뉴스', contact: '연락', mind: '속마음', cond: '상태 이상', fate: '저주 · 빚', music: 'BGM', custom: '내 탭', photo: '사진' };
const FS = { s: 12.5, m: 14, l: 16 }; // v2.8: 전체적으로 한 단계씩 크게 (예전 11.5 · 13 · 14.5) // 글씨 크기(px) — 고르지 않았으면 화면 배율이 큰 기기(노트북 150%↑)는 작게
const FS_DOT = { s: 10, m: 11.5, l: 13 };
const fsPx = () => { const n = Number(D().hpFsPx); return n >= 8 && n <= 24 ? n : (skinOf() === 'dot' ? FS_DOT : FS)[fsOf()]; }; // 직접 정한 크기가 먼저
// 브라우저의 「최소 글꼴 크기」(크롬 설정 → 글꼴): 이보다 작은 글씨는 브라우저가 강제로 키운다 → 슬라이더를 줄여도 글씨가 그대로고 칸만 작아져 넘친다.
//   → 재 보고, 칸 크기의 기준(--hp-fs)을 그 크기 밑으로는 안 내리고, 글씨 설정에 이유를 알려 준다.
let minFontC = null, booting = false; // booting: 시작할 때는 재지 않는다 (재면 화면 배치를 한 번 더 계산해 로딩이 늦어짐) — 잠깐 뒤 한가할 때 잰다
const minFont = () => { if (minFontC != null) return minFontC; if (booting) return 0; try { const sp = document.createElement('span'); sp.style.cssText = 'position:absolute;left:-99px;top:-99px;visibility:hidden;font:1px/1 sans-serif;white-space:nowrap'; sp.textContent = '가'; document.body.appendChild(sp); const hh = sp.getBoundingClientRect().height; sp.remove(); minFontC = hh > 2 ? Math.min(24, Math.round(hh)) : 0; } catch { minFontC = 0; } return minFontC; };
const fsUse = (v) => Math.max(Number(v) || fsPx(), minFont());
const minFontNote = () => (minFont() >= 9 ? `<small class="ss-hint ss-hp-minfont"><i class="fa-solid fa-circle-info"></i> 이 브라우저는 「최소 글꼴 크기」가 <b>${minFont()}px</b>로 정해져 있어서, 그보다 작은 글씨는 브라우저가 강제로 키워요. 더 줄이려면 브라우저 설정 → 모양 → 글꼴 맞춤설정 → 「최소 글꼴 크기」를 낮춰 주세요.</small>` : '');
const fsOf = () => (FS[D().hpFs] ? D().hpFs : 'm'); // 고르지 않았으면 보통 (예전엔 화면 배율이 큰 기기에서 「작게」가 기본이라 글씨가 너무 작았음)
const COLW = ['170px', 'clamp(230px, 21%, 320px)', 'clamp(280px, 27%, 400px)']; // v2.8: 옆 줄을 넓게 (글씨를 키운 만큼)
let editWins = false; // 창 옮기기 중 (창마다 ▲▼⇄✕ 단추)
// 처음엔 꼭 필요한 창만 (프로필 · 상태 · 일촌 · 퀘스트 · 연락) — 한눈에 들어오게. 나머지는 꾸미기 › 창 › 「창 더하기」로 꺼내요 (홈의 「기능 한눈에」에서 값은 다 보임)
const DEF_OFF = ['intro', 'news', 'mind', 'cond', 'fate', 'music', 'custom'];
export function hpLayout() {
    const d = D().hpLayout ?? {}, all = [...Object.keys(WINS), ...userWins().map(w => w.id)], ok = (x) => (Array.isArray(x) ? x.filter(k => all.includes(k)) : null);
    const l = ok(d.l) ?? ['profile', 'intro', 'stats'], r0 = (ok(d.r) ?? []).filter(k => !l.includes(k));
    return { l: [...new Set(l)], r: [...new Set([...r0, ...all.filter(k => !l.includes(k) && !r0.includes(k))])], off: ok(d.off) ?? DEF_OFF, main: ['l', 'c', 'r'].includes(d.main) ? d.main : 'c', lw: [0, 1, 2].includes(d.lw) ? d.lw : 1, rw: [0, 1, 2].includes(d.rw) ? d.rw : 1 };
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
const devCls = () => (innerWidth > 1100 ? 'wide' : 'tab');
const freeOn = () => D().hpFreeOn === true && innerWidth > 640; // 폰은 늘 한 줄
const freePos = (key, def) => { const p = D().hpFree?.[devCls()]?.[key], n = (v, lo, hi, d) => numIn(v, lo, hi) ?? d; return p && typeof p === 'object' ? { x: n(p.x, 0, 95, def.x), y: n(p.y, 0, 300, def.y), w: n(p.w, 8, 100, def.w), h: n(p.h, 6, 200, def.h) } : def; };
const posStyle = (p) => ` style="--x:${p.x};--y:${p.y};--w:${p.w};--h:${p.h}"`;
// 창 제목 옆 「열기 ›」: 이 창이 어느 탭의 요약인지 · 어디로 가면 더 볼 수 있는지 바로 보이게 (그 기능이 켜져 있을 때만)
const WIN_TAB = { profile: 'profile', stats: 'stats', friends: 'rel', quest: 'quest', news: 'news', contact: 'contact', mind: 'rel', cond: 'stats', fate: 'fate', music: 'music', custom: 'custom' };
const goBtn = (key) => { const t = WIN_TAB[key]; let on = false; try { on = !!t && modOn(t, getMeta()); } catch { /* */ } return on ? `<button class="ss-hp-go" data-act="tab" data-arg="${t}" title="이 창의 탭 열기">열기 ›</button>` : ''; };
const win = (key, title, body, cls = '', pos = null) => (body ? `<section class="ss-hp-win ${cls}" data-win="${key}"${pos ? posStyle(pos) : ''}><div class="ss-hp-wt"><b>${title}</b>${editWins ? '' : `${goBtn(key)}<i class="ss-hp-hearts">♡♡♡</i>`}${editWins ? `<span class="ss-hp-wtools">${pos ? '' : `<button data-hp="mv" data-arg="${key}:up" title="위로">▲</button><button data-hp="mv" data-arg="${key}:down" title="아래로">▼</button><button data-hp="mv" data-arg="${key}:side" title="반대쪽 줄로">⇄</button>`}<button class="minus" data-hp="mv" data-arg="${key}:off" title="숨기기 (꾸미기 › 창에서 다시 더해요)">−</button></span>` : ''}</div><div class="ss-hp-wb">${body}</div>${pos && editWins ? '<i class="ss-hp-rs" title="당겨서 크기 바꾸기"></i>' : ''}</section>` : '');
// 그림은 설정 파일에 글자로 들어간다 → 한 장의 크기를 묶어 두고(넘으면 화질 · 크기를 낮춰 다시), 다 합쳐 무거워지면 한 번 알려 준다
const IMG_CAP = 380000, FACE_CAP = 70000, HEAVY = 3000000;
export const decoBytes = () => { const st = settings(), len = (v) => (typeof v === 'string' ? v.length : 0); return len(st.hpCover) + len(st.hpBgImg) + len(st.hpFontFile) + (st.hpFaces ?? []).reduce((n, v) => n + len(v), 0) + Object.values(st.hpMoodFaces ?? {}).reduce((n, v) => n + len(v), 0); };
let heavyTold = false;
const heavyNote = () => { try { if (!heavyTold && decoBytes() > HEAVY) { heavyTold = true; toastr.info('꾸미기에 넣은 그림 · 글꼴이 꽤 커요. 저장이 느려지면 꾸미기에서 안 쓰는 것을 지워 주세요.', TITLE); } } catch { /* */ } };
const pickImage = (max, q, done, cap = 0) => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = async () => { try { const f = inp.files?.[0]; if (f) done(await shrinkImage(f, max, q, cap)); } catch (err) { ssErr(err); toastr.error('그림을 넣지 못했어요. 다른 그림으로 해 보세요.', TITLE); } }; inp.click(); };
// 🎛 꾸미기 모드 (아이폰 홈 화면 편집 · 갤럭시 테마처럼): 화면은 그대로 두고 아래 판에서 고르면 바로 바뀐다 — 「완료」로 저장 · 「취소」로 들어오기 전으로
//   창은 살짝 흔들리고 −(숨기기) 단추가 붙는다 · 바꿀 곳(머리줄 · 창 제목 · 창 · 카드 · 단추)을 누르면 그 부분 꾸미기 · 사진에서 색 뽑기(머리 그림 · 바탕 그림)
let ED = null; // { tab, part, snap, pal }
const edSnap = () => { const g = {}, st = settings(); for (const k of DECO_KEYS) g[k] = clone(st[k]); const b = boundSet(); return { g, b: b ? { name: b.name, data: clone(b.data) } : null, bind: (() => { try { return getMeta()?.hpSet ?? null; } catch { return null; } })() }; };
const edRestore = (s) => { if (!s) return; const st = settings(); for (const k of DECO_KEYS) { if (s.g[k] === null) delete st[k]; else st[k] = s.g[k]; } if (s.b) { const b = (st.hpSets ?? []).find(x => x.name === s.b.name); if (b) b.data = s.b.data; } try { const m = getMeta(); if (m) { if (s.bind) m.hpSet = s.bind; else delete m.hpSet; } } catch { /* 채팅 없음 */ } };
function startEdit() { if (ED) return; ED = { tab: 'look', part: null, snap: edSnap(), pal: null }; editWins = true; picking = false; const img = settings().hpBgImg || settings().hpCover; if (img) paletteFrom(img).then(p => { if (ED) { ED.pal = p; app.rerenderPanels?.(true); } }).catch(() => {}); }
function endEdit(save) { if (!ED) return; if (!save) edRestore(ED.snap); ED = null; editWins = false; undoSnap = null; saveSettings(); try { saveMeta(); } catch { /* 채팅 없음 */ } applyRetro(); app.rerenderPanels?.(true); app.renderHud?.(); }
export const _edit = { start: () => startEdit(), end: (save) => endEdit(save), on: () => !!ED }; // 시험용
// 사진에서 어울리는 색 뽑기: 작게 줄여 색상별로 모으고, 많이 쓰인 또렷한 색 넷 (갤럭시의 배경화면 색상 팔레트처럼)
export function paletteFrom(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => { try {
        const n = 32, cv = document.createElement('canvas'); cv.width = cv.height = n; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0, n, n); const px = cx.getImageData(0, 0, n, n).data, bins = new Array(24).fill(0).map(() => ({ w: 0, s: 0 }));
        for (let i = 0; i < px.length; i += 4) { const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dl = mx - mn; if (dl < 0.08 || l < 0.12 || l > 0.92) continue;
            const s = dl / (1 - Math.abs(2 * l - 1)), h = (mx === r ? ((g - b) / dl + 6) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4) * 60, bi = Math.floor(h / 15) % 24; bins[bi].w += s; bins[bi].s += s * s; }
        const out = bins.map((x, i) => ({ h: i * 15 + 7, w: x.w, s: x.w ? x.s / x.w : 0 })).filter(x => x.w > 2).sort((x, y) => y.w - x.w).slice(0, 4).map(x => [Math.round(x.h), Math.max(0.35, Math.min(1.1, Math.round(x.s * 20) / 20))]);
        res(out); } catch (e) { rej(e); } }; im.onerror = rej; im.src = src; });
}
// 되돌리기(한 번): 꾸밈을 바꾸기 직전 값을 잡아 둔다
let undoSnap = null, decoFull = false, picking = false;
const clone = (x) => JSON.parse(JSON.stringify(x ?? null));
export const _decoMode = (full) => { decoFull = !!full; }; // 시험용: 꾸미기를 「자세히」로 열기
const takeSnap = () => { const g = {}, st = settings(); for (const k of DECO_KEYS) g[k] = clone(st[k]); const b = boundSet(); undoSnap = { g, b: b ? { name: b.name, data: clone(b.data) } : null }; };
const undo = () => { if (!undoSnap) return false; const st = settings(); for (const k of DECO_KEYS) { if (undoSnap.g[k] === null) delete st[k]; else st[k] = undoSnap.g[k]; } if (undoSnap.b) { const b = (st.hpSets ?? []).find(x => x.name === undoSnap.b.name); if (b) b.data = undoSnap.b.data; } undoSnap = null; return true; };
const MOODS = [['hi', '보통'], ['heart', '두근두근'], ['proud', '대성공'], ['focus', '성공'], ['sulk', '아쉬움'], ['sad', '슬픔'], ['gasp', '놀람'], ['tongue', '삐딱'], ['blanket', '쉬는 중']];
const pickFile = (accept, maxBytes, done) => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.onchange = () => { const f = inp.files?.[0]; if (!f) return; if (f.size > maxBytes) { toastr.error(`파일이 너무 커요 (${Math.round(maxBytes / 1024 / 1024 * 10) / 10}MB까지).`, TITLE); return; } const fr = new FileReader(); fr.onload = () => done(String(fr.result), f); fr.onerror = () => toastr.error('파일을 읽지 못했어요.', TITLE); fr.readAsDataURL(f); }; inp.click(); };
const afterDeco = (redraw) => { saveSettings(); try { saveMeta(); } catch { /* 채팅 없음 */ } applyRetro(); redraw(); app.rerenderPanels?.(true); app.renderHud?.(); };
// 한 부분(머리줄 · 메뉴 · 창 제목 · 창 · 카드 · 단추)의 색 · 테두리 · 둥글기 · 글씨 크기
async function openPart(part, redraw) {
    if (!PARTS[part]) return;
    const setP = (k, v) => { const P = clone(D().hpParts) ?? {}; P[part] = { ...(P[part] ?? {}) }; if (v === null) delete P[part][k]; else P[part][k] = v; if (!Object.keys(P[part]).length) delete P[part]; W('hpParts', P); };
    for (;;) {
        const p = D().hpParts?.[part] ?? {}, box = document.createElement('div'); box.className = 'ss-root ss-scope ss-hp-pick';
        const col = (k, n) => `<div class="ss-hp-row"><span>${n}</span><div><label class="ss-hp-color"><input type="color" data-pc="${k}" value="${hex(p[k]) || '#888888'}"><small>${hex(p[k]) ? hex(p[k]) : '기본'}</small></label>${hex(p[k]) ? `<button class="ss-btn sm ghost" data-choice="clr:${k}">기본으로</button>` : ''}</div></div>`;
        const rng = (k, n, lo, hi, step, def, unit) => `<div class="ss-hp-row"><span>${n}</span><div><label class="ss-hp-range"><input type="range" min="${lo}" max="${hi}" step="${step}" value="${numIn(p[k], lo, hi) ?? def}" data-pr="${k}"><small data-pv="${k}">${numIn(p[k], lo, hi) !== null ? p[k] + unit : '기본'}</small></label>${numIn(p[k], lo, hi) !== null ? `<button class="ss-btn sm ghost" data-choice="clr:${k}">기본으로</button>` : ''}</div></div>`;
        box.innerHTML = `<h3>「${PARTS[part][0]}」 꾸미기</h3><p class="ss-hint">바꾸는 대로 뒤 화면에 바로 보여요. 비워 둔 것은 고른 모양(깔끔 · 도트)의 기본을 따라요.</p>
            ${col('ink', '글자 색')}${col('bg', '바탕 색')}${col('bd', '테두리 색')}${rng('bw', '테두리 굵기', 0, 4, 0.5, 1, 'px')}${rng('r', '둥글기', 0, 28, 1, 12, 'px')}${rng('fs', '글씨 크기', 0.7, 1.6, 0.05, 1, '배')}
            <div class="ss-row-btns"><button class="ss-btn sm ghost" data-choice="reset:1">이 부분 전부 기본으로</button><button class="ss-btn sm ghost" data-choice="other:1">다른 부분 고르기</button></div>`;
        let snapped = false; const snapOnce = () => { if (!snapped) { takeSnap(); snapped = true; } };
        box.addEventListener('input', (e) => { const c = e.target.closest?.('[data-pc]'), r = e.target.closest?.('[data-pr]'); if (c) { snapOnce(); setP(c.dataset.pc, c.value); c.nextElementSibling.textContent = c.value; } if (r) { snapOnce(); setP(r.dataset.pr, Number(r.value)); const o = box.querySelector(`[data-pv="${r.dataset.pr}"]`); if (o) o.textContent = r.value; } if (c || r) applyRetro(); });
        box.addEventListener('change', (e) => { if (e.target.closest?.('[data-pc], [data-pr]')) saveSettings(); });
        const pick = await choosePopup(box, '닫기'); if (!pick) { saveSettings(); return; }
        const [k, v] = pick.split(':');
        if (k === 'other') { saveSettings(); return openDeco(redraw, 'parts'); }
        takeSnap(); if (k === 'clr') setP(v, null); if (k === 'reset') { const P = clone(D().hpParts) ?? {}; delete P[part]; W('hpParts', P); }
        afterDeco(redraw);
    }
}
async function openDeco(redraw, focus = '') {
    if (focus === 'parts') decoFull = true;
    const after = () => afterDeco(redraw);
    for (;;) {
        const set = settings(), d = D(), L = hpLayout(), [, hue, sat] = themeOf(), custom = d.hpTheme === 'c', ti = custom ? -1 : Number(d.hpTheme) || 0, sets = set.hpSets ?? [], bound = boundSet(), dot = skinOf() === 'dot';
        const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-hp-pick';
        const seg = (k, cur, opts) => `<span class="ss-hp-seg">${opts.map(([v, n]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-choice="${k}:${v}">${n}</button>`).join('')}</span>`;
        const row = (label, html) => `<div class="ss-hp-row"><span>${label}</span><div>${html}</div></div>`;
        const chips = (list) => `<div class="ss-hp-chips">${list.map(([c, n, on]) => `<button class="${on ? 'on' : ''}" data-choice="${c}">${n}</button>`).join('')}</div>`;
        const fold = (id, title, html) => `<details class="ss-hp-fold" ${focus === id ? 'open' : ''}><summary>${title}</summary>${html}</details>`;
        const prof = d.hpProf ?? {}, cnt = d.hpCounts ?? {}, uw = userWins(), titles = d.hpTitles ?? {}, gn = d.hpGroupNames ?? {}, mf = set.hpMoodFaces ?? {};
        const groups = [...(document.querySelector('.ss-hompy .ss-groups')?.querySelectorAll('button[data-arg]') ?? [])].map(b => [b.dataset.arg, b.dataset.n0 || b.textContent.trim()]);
        const colorRows = `${row('포인트 색', `<div class="ss-hp-faces sw">${THEMES.map(([n, h, s], i) => `<button class="ss-hp-sw ${ti === i ? 'on' : ''}" data-choice="theme:${i}" title="${n}" style="background:hsl(${h} ${Math.round(62 * s)}% 60%)"></button>`).join('')}<span class="ss-hp-sw mine ${custom ? 'on' : ''}" title="직접 고른 색" style="background:hsl(${hue} ${Math.round(62 * sat)}% 60%)"></span></div>`)}
            ${row('밝기', seg('dark', DARKS[d.hpDark] ? d.hpDark : 'light', Object.entries(DARKS)))}`;
        const sizeRow = row('글씨 크기', seg('fs', Number(d.hpFsPx) ? '' : fsOf(), [['s', '작게'], ['m', '보통'], ['l', '크게']]) + (decoFull ? `<label class="ss-hp-range"><input type="range" min="8" max="22" step="0.5" value="${fsPx()}" data-hpr="fs"><small data-fsv>${fsPx()}px</small></label>${minFontNote()}` : ''));
        const head = `<div class="ss-hp-dhead"><h3>꾸미기</h3>${seg('mode', decoFull ? '1' : '0', [['0', '간단히'], ['1', '자세히']])}${undoSnap ? '<button class="ss-btn sm ghost" data-choice="undo:1"><i class="fa-solid fa-rotate-left"></i> 방금 것 되돌리기</button>' : ''}</div>
            ${bound ? `<p class="ss-hp-bound"><i class="fa-solid fa-link"></i> 이 채팅은 꾸밈 세트 <b>「${esc(bound.name)}」</b>를 써요 — 여기서 고치면 그 세트가 바뀌어요. <button class="ss-btn sm ghost" data-choice="unbind:1">풀기</button></p>` : ''}`;
        const pv = (p) => `<span class="ss-hp-pv ${p.hpSkin} ${p.hpDark === 'dark' ? 'dark' : ''}" style="--pv:hsl(${p.hpTheme === 'c' ? p.hpHue : (THEMES[p.hpTheme] ?? THEMES[0])[1]} ${Math.round(62 * (p.hpTheme === 'c' ? p.hpSat : 1))}% 58%)"><i></i><i></i><i></i></span>`;
        // 간단히: 「한 번에 고르기 · 분위기 세트 · 모양」 세 군데가 같은 걸 다르게 불러 헷갈렸다 → 순서대로 하나씩만: ① 모양 ② 밝기 · 색 ③ 글씨
        const simple = `<h4>① 모양 <small>전체 생김새를 골라요</small></h4><div class="ss-hp-presets">${Object.entries(SKINS).map(([k, n]) => `<button class="${skinOf() === k ? 'on' : ''}" data-choice="skin:${k}">${pv({ hpSkin: k, hpDark: skinOf() === k ? (d.hpDark ?? SKIN_DEF[k][1]) : SKIN_DEF[k][1], hpTheme: ti < 0 ? 0 : ti })}${n}</button>`).join('')}</div>
            <h4>② 밝기 · 색</h4>${colorRows}
            <h4>③ 글씨</h4>${sizeRow}`;
        const full = `${fold('look', '모양 · 색', `${row('모양', seg('skin', skinOf(), Object.entries(SKINS)))}${colorRows}
                ${row('직접 고르기', `<label class="ss-hp-range"><small>색상</small><input type="range" min="0" max="360" step="1" value="${hue}" data-hpr="hue" class="hue"></label><label class="ss-hp-range"><small>진하기</small><input type="range" min="0" max="1.2" step="0.05" value="${sat}" data-hpr="sat"></label>`)}
                ${row('글자 · 바탕 · 카드', ['Ink:글자', 'Bg:바탕', 'Paper:카드'].map(x => x.split(':')).map(([k, n]) => `<label class="ss-hp-color"><input type="color" data-hpc="hp${k}" value="${hex(d['hp' + k]) || (k === 'Ink' ? '#24262b' : '#ffffff')}"><small>${n}${hex(d['hp' + k]) ? ' ✓' : ''}</small></label>`).join('') + (hex(d.hpInk) || hex(d.hpBg) || hex(d.hpPaper) ? '<button class="ss-btn sm ghost" data-choice="colreset:1">기본색으로</button>' : ''))}
                ${dot ? row('바탕 무늬', seg('pat', patOf(), Object.entries(PATTERNS))) : ''}
                ${row('바탕 그림', `<button class="ss-btn sm" data-choice="bgimg:add"><i class="fa-solid fa-image"></i> ${set.hpBgImg ? '바꾸기' : '넣기'}</button>${set.hpBgImg ? `<button class="ss-btn sm ghost" data-choice="bgimg:del">빼기</button>${seg('bgtile', set.hpBgTile ? '1' : '0', [['0', '꽉 채움'], ['1', '바둑판']])}` : ''}`)}
                ${row('창 비침', `<label class="ss-hp-range"><input type="range" min="0.3" max="1" step="0.05" value="${numIn(d.hpCardAlpha, 0.3, 1) ?? 1}" data-hpr="alpha"><small data-alv>${Math.round((numIn(d.hpCardAlpha, 0.3, 1) ?? 1) * 100)}%</small></label><small class="ss-hint">바탕 그림이 창 뒤로 비쳐요.</small>`)}
                ${row('머리 그림', `<button class="ss-btn sm" data-choice="cover:add"><i class="fa-solid fa-image"></i> ${set.hpCover ? '바꾸기' : '넣기'}</button>${set.hpCover ? '<button class="ss-btn sm ghost" data-choice="cover:del">빼기</button>' : ''}<small class="ss-hint">맨 위 제목 뒤 얇은 띠.</small>`)}`)}
            ${fold('type', '글씨 · 칸', `${row('글꼴', seg('font', fontKey(), fontOpts()) + `<button class="ss-btn sm" data-choice="fontfile:add"><i class="fa-solid fa-font"></i> 글꼴 파일 ${set.hpFontFile ? '바꾸기' : '올리기'}</button>${set.hpFontFile ? '<button class="ss-btn sm ghost" data-choice="fontfile:del">빼기</button>' : ''}${dot ? '<small class="ss-hint">도트 모양은 도트 글꼴이 기본이에요.</small>' : ''}`)}
                ${sizeRow}${row('모서리', seg('corner', pick3(d.hpCorner), CORNERS.map((n, i) => [i, n])))}${row('여백', seg('gap', pick3(d.hpGap), GAPS.map((n, i) => [i, n])))}${row('움직임', seg('motion', d.hpMotion === false ? '0' : '1', [['1', '켬'], ['0', '끔']]))}${row('작은 미트볼', seg('pet', d.hpPet === false ? '0' : '1', [['1', '제목 옆에'], ['0', '끔']]) + '<small class="ss-hint">기분에 따라 표정이 바뀌어요.</small>')}`)}
            ${fold('parts', '부분마다 따로 꾸미기', `<p class="ss-hint">머리줄 · 메뉴 · 창 제목 · 창 · 카드 · 단추의 색 · 테두리 · 둥글기 · 글씨 크기를 하나씩 정해요.</p>
                <div class="ss-row-btns"><button class="ss-btn sm pri" data-choice="pick:1"><i class="fa-solid fa-arrow-pointer"></i> 화면에서 눌러 고르기</button></div>
                ${chips(Object.entries(PARTS).map(([k, [n]]) => [`part:${k}`, n + (d.hpParts?.[k] ? ' ✓' : ''), !!d.hpParts?.[k]]))}`)}
            ${fold('place', '창 자리 · 크기', `${row('놓는 방식', seg('free', d.hpFreeOn === true ? '1' : '0', [['0', '줄 맞춤'], ['1', '자유롭게']]) + '<small class="ss-hint">자유롭게: 창 제목을 끌어 옮기고 오른쪽 아래 모서리를 당겨 크기를 바꿔요 (폰은 늘 한 줄).</small>')}
                ${row('창 옮기기', `<button class="ss-btn sm" data-choice="edit:1"><i class="fa-solid fa-up-down-left-right"></i> ${editWins ? '끝내기' : '시작'}</button><button class="ss-btn sm ghost" data-choice="reset:1">처음으로</button>`)}
                ${d.hpFreeOn === true ? '' : row('가운데 창', seg('main', L.main, [['l', '왼쪽'], ['c', '가운데'], ['r', '오른쪽']])) + row('왼쪽 줄 폭', seg('lw', L.lw, [['0', '좁게'], ['1', '보통'], ['2', '넓게']])) + row('오른쪽 줄 폭', seg('rw', L.rw, [['0', '좁게'], ['1', '보통'], ['2', '넓게']]))}
                ${row('폰에서 메뉴', seg('navtop', d.hpNavTop === true ? '1' : '0', [['0', '아래'], ['1', '위']]))}`)}
            ${fold('content', '창 안의 내용', `${row('보일 창', chips([...Object.entries(WINS), ...uw.map(w => [w.id, w.title])].map(([k, n]) => [`win:${k}`, esc(n), !L.off.includes(k)])))}
                ${row('프로필 창', chips([['face', '그림'], ['name', '이름'], ['mood', '기분'], ['badges', '배지']].map(([k, n]) => [`prof:${k}`, n, prof[k] !== false])))}
                ${row('수치 막대', seg('bars', [3, 6, 12].includes(Number(cnt.bars)) ? cnt.bars : 6, [[3, '3개'], [6, '6개'], [12, '12개']]))}${row('일촌', seg('friends', [3, 6, 10].includes(Number(cnt.friends)) ? cnt.friends : 6, [[3, '3명'], [6, '6명'], [10, '10명']]))}
                ${row('창 제목 바꾸기', chips([...Object.entries(WINS), ...uw.map(w => [w.id, w.title])].map(([k, n]) => [`title:${k}`, esc(titles[k] || n) + (titles[k] ? ' ✎' : ''), !!titles[k]])))}
                ${groups.length ? row('메뉴 이름 바꾸기', chips(groups.map(([g, n]) => [`gname:${esc(g)}`, esc(gn[g] || n) + (gn[g] ? ' ✎' : ''), !!gn[g]]))) : ''}
                ${row('내가 만든 창', `${uw.map(w => `<span class="ss-hp-uw"><b>${esc(w.title)}</b><small>${w.type === 'note' ? '메모' : '수치'}</small><button class="ss-ib" data-choice="uwedit:${w.id}" title="고치기"><i class="fa-solid fa-pen"></i></button><button class="ss-ib" data-choice="uwdel:${w.id}" title="지우기"><i class="fa-solid fa-trash-can"></i></button></span>`).join('')}${uw.length < 8 ? '<button class="ss-btn sm" data-choice="uwadd:note"><i class="fa-solid fa-plus"></i> 메모 창</button><button class="ss-btn sm" data-choice="uwadd:stat"><i class="fa-solid fa-plus"></i> 수치 창</button>' : ''}`)}
                ${row('「모음」에 넣을 탭', chips(Object.entries(MINOR_ALL).map(([k, n]) => [`minor:${k}`, n, hpMinor().includes(k)])))}`)}
            ${fold('face', '기분별 내 그림', `<p class="ss-hint">제목 옆 작은 미트볼(과 프로필 그림을 「기분 따라 미트볼」로 두었을 때)이 기분마다 내 그림으로 나와요. 칸을 눌러 올려요.</p>
                <div class="ss-hp-faces">${MOODS.map(([c, n]) => `<span class="ss-hp-mine"><button class="ss-hp-face ${mf[c] ? 'on' : ''}" data-choice="mface:${c}" title="${n}"><img src="${esc(mf[c] || conUrl(c))}" alt=""><em>${n}</em></button>${mf[c] ? `<button class="ss-ib" data-choice="mfdel:${c}" title="미트볼로 되돌리기"><i class="fa-solid fa-xmark"></i></button>` : ''}</span>`).join('')}</div>`)}
            ${fold('sets', '꾸밈 세트', `<div class="ss-hp-sets">${sets.map((x, i) => `<div class="ss-hp-set ${bound?.name === x.name ? 'on' : ''}"><i style="background:hsl(${x.data.hpTheme === 'c' ? Number(x.data.hpHue) || 0 : (THEMES[Number(x.data.hpTheme) || 0] ?? THEMES[0])[1]} 62% 60%)"></i><b>${esc(x.name)}</b><span><button class="ss-btn sm" data-choice="apply:${i}" title="모든 채팅에 적용">적용</button><button class="ss-btn sm ${bound?.name === x.name ? 'pri' : 'ghost'}" data-choice="bind:${i}" title="이 채팅에서만 이 세트를 써요">${bound?.name === x.name ? '✓ 이 채팅' : '이 채팅만'}</button><button class="ss-btn sm ghost" data-choice="code:${i}" title="코드 복사 — 다른 사람에게 보내요">코드</button><button class="ss-ib" data-choice="setdel:${i}" title="지우기"><i class="fa-solid fa-trash-can"></i></button></span></div>`).join('') || '<p class="ss-hint">저장한 세트가 없어요.</p>'}</div>
                <div class="ss-row-btns"><button class="ss-btn sm" data-choice="setsave:1"><i class="fa-solid fa-floppy-disk"></i> 지금 꾸밈 저장</button><button class="ss-btn sm ghost" data-choice="setimport:1"><i class="fa-solid fa-paste"></i> 코드로 가져오기</button></div>`)}
            ${fold('more', '그 밖에', `${row('다른 창들', chips([['hudskin:1', 'HUD · 미니창 · 보통 상태창도 같은 모양', set.hpSkinHud !== false]]))}
                ${row('내 CSS', `<textarea class="ss-in ss-hp-css" data-hpcss rows="5" spellcheck="false" placeholder="/* 아는 분만 — 예: */&#10;.ss-hompy .ss-hp-win { border-style: dashed; }">${esc(set.hpCss ?? '')}</textarea><small class="ss-hint">칸 밖을 누르면 적용돼요. 내 CSS는 꾸밈 세트 · 코드에 들어가지 않아요. 이름표: .ss-hompy(전체) · .ss-hp-url(머리줄) · .ss-hp-marks(메뉴) · .ss-hp-win(창) · .ss-hp-wt(창 제목) · .ss-hp-wb(창 안) · [data-win="profile"](창 하나)</small>`)}
                <div class="ss-row-btns"><button class="ss-btn sm ghost" data-choice="allreset:1"><i class="fa-solid fa-broom"></i> 꾸밈 전부 기본으로</button></div>`)}`;
        box.innerHTML = head + (decoFull ? full : simple);
        let snapped = false; const snapOnce = () => { if (!snapped) { takeSnap(); snapped = true; } };
        box.addEventListener('input', (e) => {
            const c = e.target.closest?.('[data-hpc]'); if (c) { snapOnce(); W(c.dataset.hpc, c.value); applyRetro(); return; }
            const r = e.target.closest?.('[data-hpr]'); if (!r) return; snapOnce();
            if (r.dataset.hpr === 'fs') { W('hpFsPx', Number(r.value)); applyRetro(); document.querySelectorAll('.ss-hompy').forEach(x => x.style.setProperty('--hp-fs', `${fsUse(r.value)}px`)); const o = box.querySelector('[data-fsv]'); if (o) o.textContent = `${r.value}px`; return; }
            if (r.dataset.hpr === 'alpha') { W('hpCardAlpha', Number(r.value) >= 1 ? 0 : Number(r.value)); applyRetro(); const o = box.querySelector('[data-alv]'); if (o) o.textContent = `${Math.round(r.value * 100)}%`; return; }
            W('hpTheme', 'c'); const hs = box.querySelector('[data-hpr="hue"]').value, ss = box.querySelector('[data-hpr="sat"]').value; W('hpHue', Number(hs)); W('hpSat', Number(ss)); applyRetro();
            document.querySelectorAll('.ss-hompy').forEach(x => { x.style.setProperty('--hp-h', hs); x.style.setProperty('--hp-s', ss); }); box.querySelectorAll('.ss-hp-sw').forEach(x => x.classList.toggle('on', x.classList.contains('mine'))); const m = box.querySelector('.ss-hp-sw.mine'); if (m) m.style.background = `hsl(${hs} ${Math.round(62 * ss)}% 60%)`;
        });
        box.addEventListener('change', (e) => { if (e.target.closest?.('[data-hpr], [data-hpc]')) after(); const t = e.target.closest?.('[data-hpcss]'); if (t) { set.hpCss = String(t.value).slice(0, 20000); after(); } });
        const pick = await choosePopup(box, '닫기'); if (!pick) return;
        const ci = pick.indexOf(':'), k = pick.slice(0, ci), v = pick.slice(ci + 1);
        focus = { skin: 'look', theme: 'look', dark: 'look', pat: 'look', colreset: 'look', bgimg: 'look', bgtile: 'look', cover: 'look', font: 'type', fontfile: 'type', fs: 'type', corner: 'type', gap: 'type', motion: 'type', pet: 'type', part: 'parts', free: 'place', main: 'place', lw: 'place', rw: 'place', reset: 'place', navtop: 'place', win: 'content', prof: 'content', bars: 'content', friends: 'content', title: 'content', gname: 'content', uwadd: 'content', uwedit: 'content', uwdel: 'content', minor: 'content', mface: 'face', mfdel: 'face', apply: 'sets', bind: 'sets', code: 'sets', setdel: 'sets', setsave: 'sets', setimport: 'sets', unbind: 'sets', hudskin: 'more', suggest: 'more', allreset: 'more' }[k] ?? focus;
        if (k === 'mode') { decoFull = v === '1'; continue; }
        if (k === 'undo') { undo(); after(); continue; }
        if (k === 'pick') { startEdit(); ED.tab = 'parts'; redraw(); return; }
        if (k === 'part') return openPart(v, redraw);
        const res = await decoAct(k, v, redraw);
        if (res === 'close' || k === 'edit' || k === 'free' && v === '1') return; // 파일 고르기 · 창 옮기기는 창을 닫고
    }
}
// 꾸미기에서 고른 것 하나를 적용한다 (꾸미기 창 · 꾸미기 모드의 아래 판이 같이 쓴다) — 'close' = 파일을 고르는 중이라 창을 닫아야 함
async function decoAct(k, v, redraw) {
    const set = settings(), d = D(), L = hpLayout(), sets = set.hpSets ?? [], prof = d.hpProf ?? {}, cnt = d.hpCounts ?? {}, uw = userWins(), titles = d.hpTitles ?? {}, gn = d.hpGroupNames ?? {}, mf = set.hpMoodFaces ?? {};
    const after = () => afterDeco(redraw);
    const meta = (() => { try { return getMeta(); } catch { return null; } })();
    if (!['code', 'setsave', 'setimport', 'cover', 'bgimg', 'fontfile', 'mface'].includes(k)) takeSnap();
    if (k === 'allreset') { for (const x of DECO_KEYS) { const b = boundSet(); if (b) delete b.data[x]; else delete set[x]; } set.hpSkin = set.hpSkin ?? 'clean'; }
    if (k === 'theme') W('hpTheme', Number(v));
    if (k === 'dark') W('hpDark', v); if (k === 'font') { if (v === 'd') W('hpFontPick', false); else { W('hpFont', v); W('hpFontPick', true); } } if (k === 'fs') { W('hpFs', v); W('hpFsPx', 0); }
    if (k === 'wall') { W('hpWall', WALLS[v] ? v : ''); delete set.hpBgImg; if (WALLS[v]) W('hpDark', WALLS[v][1] ? 'dark' : 'light'); }
    if (k === 'skin' && SKINS[v]) { W('hpSkin', v); W('hpFsPx', 0); W('hpFontPick', false); W('hpFont', SKIN_DEF[v][0]); W('hpDark', SKIN_DEF[v][1]); } if (k === 'pat') W('hpPattern', v); if (k === 'navtop') W('hpNavTop', v === '1'); if (k === 'colreset') { W('hpInk', ''); W('hpBg', ''); W('hpPaper', ''); }
    if (k === 'corner') W('hpCorner', Number(v)); if (k === 'gap') W('hpGap', Number(v)); if (k === 'motion') W('hpMotion', v === '1'); if (k === 'pet') W('hpPet', v === '1');
    if (k === 'lite') set.hpLite = v === '1';
    if (k === 'win') saveLayout({ ...L, off: L.off.includes(v) ? L.off.filter(x => x !== v) : [...L.off, v] });
    if (k === 'main') saveLayout({ ...L, main: v }); if (k === 'lw' || k === 'rw') saveLayout({ ...L, [k]: Number(v) });
    if (k === 'reset') { W('hpLayout', {}); W('hpFree', {}); }
    if (k === 'free') { W('hpFreeOn', v === '1'); if (v === '1') editWins = true; }
    if (k === 'minor') { const m = hpMinor(); W('hpMinor', m.includes(v) ? m.filter(x => x !== v) : [...m, v]); }
    if (k === 'prof') W('hpProf', { ...prof, [v]: prof[v] === false });
    if (k === 'bars' || k === 'friends') W('hpCounts', { ...cnt, [k]: Number(v) });
    if (k === 'title') { const n = await askInput('창 제목', '비워 두면 원래 이름으로 돌아가요.', titles[v] ?? ''); if (n !== null) { const t = { ...titles }; if (n.trim()) t[v] = short(n.trim(), 20); else delete t[v]; W('hpTitles', t); } }
    if (k === 'gname') { const n = await askInput('메뉴 이름', '비워 두면 원래 이름으로 돌아가요.', gn[v] ?? ''); if (n !== null) { const t = { ...gn }; if (n.trim()) t[v] = short(n.trim(), 8); else delete t[v]; W('hpGroupNames', t); } }
    if (k === 'uwadd' || k === 'uwedit') {
        const cur = uw.find(w => w.id === v), type = cur?.type ?? v, bars = (app.current?.state?.data?.stats?.bars ?? []).map(b => b.name);
        const title = await askInput(type === 'note' ? '메모 창 제목' : '수치 창 제목', '', cur?.title ?? (type === 'note' ? '메모' : '수치'));
        if (title !== null && title.trim()) {
            const body = await askInput(type === 'note' ? '메모 내용' : '어떤 수치를 크게 보일까요?', type === 'note' ? '창에 그대로 보여요.' : `수치 이름을 그대로 적어요${bars.length ? ` — 지금 있는 것: ${bars.join(', ')}` : ''}`, cur ? (type === 'note' ? cur.text : cur.stat) ?? '' : type === 'stat' ? bars[0] ?? '' : '');
            if (body !== null) { const item = { id: cur?.id ?? `u${Math.max(0, ...uw.map(w => Number(w.id.slice(1)))) + 1}`, type, title: short(title.trim(), 20), ...(type === 'note' ? { text: body.slice(0, 280) } : { stat: short(body.trim(), 30) }) }; W('hpUserWins', cur ? uw.map(w => (w.id === cur.id ? item : w)) : [...uw, item]); }
        }
    }
    if (k === 'uwdel') W('hpUserWins', uw.filter(w => w.id !== v));
    if (k === 'hudskin') set.hpSkinHud = set.hpSkinHud === false;
    if (k === 'edit') editWins = ED ? true : !editWins;
    if (k === 'cover' && v === 'del') delete set.hpCover; if (k === 'bgimg' && v === 'del') delete set.hpBgImg; if (k === 'bgtile') set.hpBgTile = v === '1'; if (k === 'fontfile' && v === 'del') { delete set.hpFontFile; if (D().hpFont === 'u') W('hpFont', 'g'); } if (k === 'mfdel') { const m = { ...mf }; delete m[v]; set.hpMoodFaces = m; }
    if (k === 'cover' && v === 'add') { pickImage(1400, 0.8, (src) => { set.hpCover = src; after(); heavyNote(); }, IMG_CAP); return 'close'; }
    if (k === 'bgimg' && v === 'add') { pickImage(1600, 0.8, (src) => { set.hpBgImg = src; after(); heavyNote(); }, IMG_CAP); return 'close'; }
    if (k === 'mface') { pickImage(320, 0.85, (src) => { set.hpMoodFaces = { ...(set.hpMoodFaces ?? {}), [v]: src }; after(); }, FACE_CAP); return 'close'; }
    if (k === 'fontfile' && v === 'add') { pickFile('.woff2,.woff,.ttf,.otf', 1.5 * 1024 * 1024, (src) => { set.hpFontFile = src.replace(/^data:[^;]*;/, 'data:font/woff2;'); W('hpFont', 'u'); after(); heavyNote(); }); return 'close'; }
    if (k === 'unbind' && meta) delete meta.hpSet;
    if (k === 'setsave') { const n = await askInput('꾸밈 세트 이름', '지금 꾸민 모양(색 · 글꼴 · 창 자리 · 부분별 꾸밈 등)을 이 이름으로 저장해요. 올린 그림 · 글꼴 파일 · 내 CSS는 들어가지 않아요.', ''); const name = short((n ?? '').trim(), 20); if (name) set.hpSets = [...sets.filter(x => x.name !== name), { name, data: cleanSet(snapshot()) }].slice(-20); }
    if (k === 'setimport') { const c = await askInput('꾸밈 코드 붙여넣기', 'MBH1: 로 시작하는 코드를 붙여 넣어요.', ''); if (c) { const got = fromCode(c); if (got) { set.hpSets = [...sets.filter(x => x.name !== got.name), got].slice(-20); toastr.success(`「${got.name}」 세트를 가져왔어요. 「적용」을 누르면 바뀌어요.`, TITLE); } else toastr.error('코드를 읽지 못했어요. 처음부터 끝까지 다 복사했는지 봐 주세요.', TITLE); } }
    const one = sets[Number(v)];
    if (k === 'apply' && one) { if (meta) delete meta.hpSet; for (const x of DECO_KEYS) delete set[x]; Object.assign(set, clone(one.data)); set.hpSkin = set.hpSkin ?? 'clean'; }
    if (k === 'bind' && one && meta) { if (meta.hpSet === one.name) delete meta.hpSet; else meta.hpSet = one.name; }
    if (k === 'setdel' && one) { set.hpSets = sets.filter(x => x !== one); if (meta?.hpSet === one.name) delete meta.hpSet; }
    if (k === 'code' && one) { const code = toCode(one.name, one.data); try { await navigator.clipboard.writeText(code); toastr.success('코드를 복사했어요. 붙여 넣어 보내면 돼요.', TITLE); } catch { await askInput('꾸밈 코드', '아래 글을 전부 복사해서 보내요.', code); } }
    after();
}
function sheetHTML() {
    const set = settings(), d = D(), L = hpLayout(), [, hue, sat] = themeOf(), custom = d.hpTheme === 'c', ti = custom ? -1 : Number(d.hpTheme) || 0, dot = skinOf() === 'dot', uw = userWins();
    const B = (arg, html, on = false, cls = '') => `<button class="${cls} ${on ? 'on' : ''}" data-hp="ed" data-arg="${arg}">${html}</button>`;
    const seg = (k, cur, opts) => `<span class="ss-hp-seg">${opts.map(([v, n]) => B(`${k}:${v}`, n, String(cur) === String(v))).join('')}</span>`;
    const row = (label, html) => `<div class="ss-hp-srow"><span>${label}</span><div>${html}</div></div>`;
    const pv = (p, n, arg, on) => B(arg, `<span class="ss-hp-pv ${p.hpSkin} ${p.hpDark === 'dark' ? 'dark' : ''}" style="--pv:hsl(${p.hpTheme === 'c' ? p.hpHue : (THEMES[p.hpTheme] ?? THEMES[0])[1]} ${Math.round(62 * (p.hpTheme === 'c' ? p.hpSat : 1))}% 58%)"><i></i><i></i><i></i></span>${n}`, on, 'card');
    const TABS = [['look', '모양'], ['wall', '배경화면'], ['color', '색'], ['type', '글씨'], ['frame', '틀'], ['wins', '창'], ['parts', '부분']];
    let body = '';
    if (ED.part && PARTS[ED.part]) {
        const p = d.hpParts?.[ED.part] ?? {}, col = (k, n) => `<label class="ss-hp-color"><input type="color" data-pc="${k}" value="${hex(p[k]) || '#888888'}"><small>${n}${hex(p[k]) ? ' ✓' : ''}</small></label>${hex(p[k]) ? B(`pcl:${k}`, '✕', false, 'x') : ''}`;
        const rng = (k, n, lo, hi, step, def) => `<label class="ss-hp-range"><small>${n}</small><input type="range" min="${lo}" max="${hi}" step="${step}" value="${numIn(p[k], lo, hi) ?? def}" data-pr="${k}"></label>${numIn(p[k], lo, hi) !== null ? B(`pcl:${k}`, '✕', false, 'x') : ''}`;
        body = `<div class="ss-hp-shead">${B('partback:1', '‹ 전체', false, 'back')}<b>「${PARTS[ED.part][0]}」만 꾸미기</b>${d.hpParts?.[ED.part] ? B('pcl:*', '이 부분 기본으로', false, 'txt') : ''}</div>
            ${row('색', col('ink', '글자') + col('bg', '바탕') + col('bd', '테두리'))}${row('테두리', rng('bw', '굵기', 0, 4, 0.5, 1) + rng('r', '둥글기', 0, 28, 1, 12))}${row('글씨', rng('fs', '크기', 0.7, 1.6, 0.05, 1))}`;
    } else if (ED.tab === 'look') {
        body = `<div class="ss-hp-strip">${Object.entries(SKINS).map(([k, n]) => pv({ hpSkin: k, hpDark: SKIN_DEF[k][1], hpTheme: ti < 0 ? 0 : ti }, n, `skin:${k}`, skinOf() === k)).join('')}</div>`;
    } else if (ED.tab === 'wall') {
        const ok = ['clean', 'phone'].includes(skinOf()), cur = wallOf();
        body = ok ? `<div class="ss-hp-strip walls">${B('wall:', '<span class="ss-hp-wp none"></span>없음', !cur && !set.hpBgImg, 'card')}${Object.entries(WALLS).map(([k, [n]]) => B(`wall:${k}`, `<span class="ss-hp-wp ${k}"></span>${n}`, cur === k, 'card')).join('')}<i class="sep"></i>${B('bgimg:add', `<span class="ss-hp-wp mine"${set.hpBgImg ? ` style="background-image:url('${esc(set.hpBgImg)}')"` : ''}><i class="fa-solid fa-image"></i></span>내 사진`, !!set.hpBgImg, 'card')}</div>`
            : `<div class="ss-hp-srow"><span>배경화면</span><div><small class="ss-hint">배경화면은 「깔끔」 · 「폰」 모양에서 써요.</small>${B('skin:clean', '깔끔 모양으로 바꾸기', false, 'txt')}</div></div>`;
    } else if (ED.tab === 'color') {
        body = `${row('밝기', seg('dark', DARKS[d.hpDark] ? d.hpDark : 'light', [['light', '밝게'], ['dark', '어둡게'], ['auto', '자동']]))}
            ${row('포인트', `<div class="ss-hp-faces sw">${THEMES.map(([n, h, s], i) => `<button class="ss-hp-sw ${ti === i ? 'on' : ''}" data-hp="ed" data-arg="theme:${i}" title="${n}" style="background:hsl(${h} ${Math.round(62 * s)}% 60%)"></button>`).join('')}${(ED.pal ?? []).map(([h, s], i) => `<button class="ss-hp-sw pal ${custom && Math.abs(hue - h) < 1 ? 'on' : ''}" data-hp="ed" data-arg="pal:${i}" title="사진에서 뽑은 색" style="background:hsl(${h} ${Math.round(62 * s)}% 60%)"></button>`).join('')}</div>${(ED.pal ?? []).length ? '<small class="ss-hint">네모는 사진에서 뽑은 색</small>' : ''}`)}
            ${row('직접', `<label class="ss-hp-range"><small>색상</small><input type="range" min="0" max="360" step="1" value="${hue}" data-hpr="hue" class="hue"></label><label class="ss-hp-range"><small>진하기</small><input type="range" min="0" max="1.2" step="0.05" value="${sat}" data-hpr="sat"></label>`)}
            ${row('바탕', ['Ink:글자', 'Bg:바탕', 'Paper:카드'].map(x => x.split(':')).map(([k, n]) => `<label class="ss-hp-color"><input type="color" data-hpc="hp${k}" value="${hex(d['hp' + k]) || (k === 'Ink' ? '#24262b' : '#ffffff')}"><small>${n}${hex(d['hp' + k]) ? ' ✓' : ''}</small></label>`).join('') + (hex(d.hpInk) || hex(d.hpBg) || hex(d.hpPaper) ? B('colreset:1', '기본색', false, 'txt') : '') + B('bgimg:add', `<i class="fa-solid fa-image"></i> 바탕 그림${set.hpBgImg ? ' 바꾸기' : ''}`, false, 'txt') + (set.hpBgImg ? B('bgimg:del', '빼기', false, 'txt') : ''))}`;
    } else if (ED.tab === 'type') {
        body = `${row('크기', `<label class="ss-hp-range wide"><small>가</small><input type="range" min="8" max="22" step="0.5" value="${fsPx()}" data-hpr="fs"><small class="big">가</small><small data-fsv>${fsPx()}px</small></label>${minFontNote()}${Number(d.hpFsPx) ? B('fs:m', '기본 크기', false, 'txt') : ''}`)}
            ${row('글꼴', seg('font', fontKey(), fontOpts()) + B('fontfile:add', '<i class="fa-solid fa-font"></i> 글꼴 파일', false, 'txt'))}`;
    } else if (ED.tab === 'frame') {
        body = `${row('모서리', `<label class="ss-hp-range wide"><small>각지게</small><input type="range" min="0" max="2" step="1" value="${pick3(d.hpCorner)}" data-hpr="corner"><small>둥글게</small></label>`)}
            ${row('여백', `<label class="ss-hp-range wide"><small>촘촘</small><input type="range" min="0" max="2" step="1" value="${pick3(d.hpGap)}" data-hpr="gap"><small>넉넉</small></label>`)}
            ${row('창 비침', `<label class="ss-hp-range wide"><small>비침</small><input type="range" min="0.3" max="1" step="0.05" value="${numIn(d.hpCardAlpha, 0.3, 1) ?? 1}" data-hpr="alpha"><small>또렷</small></label>`)}
            ${row('그 밖에', seg('motion', d.hpMotion === false ? '0' : '1', [['1', '움직임 켬'], ['0', '끔']]) + seg('pet', d.hpPet === false ? '0' : '1', [['1', '미트볼 보임'], ['0', '숨김']]) + (dot ? seg('pat', patOf(), Object.entries(PATTERNS)) : ''))}`;
    } else if (ED.tab === 'wins') {
        const hidden = [...Object.entries(WINS), ...uw.map(w => [w.id, w.title])].filter(([k]) => L.off.includes(k));
        body = `${row('옆 창', seg('lite', set.hpLite === true ? '1' : '0', [['0', '보이기'], ['1', '🪶 가볍게 (옆 창 없이)']]) + '<small class="ss-hint">가볍게: 가운데 창만 그려서 화면이 가벼워져요 (큰 상태창 · 폰에서 차이가 커요). 옆 창의 내용은 홈의 앱 카드에 그대로 있어요.</small>')}
            ${row('놓는 방식', seg('free', d.hpFreeOn === true ? '1' : '0', [['0', '줄 맞춤'], ['1', '자유롭게']]) + `<small class="ss-hint">${d.hpFreeOn === true ? '창 제목을 끌어 옮기고, 오른쪽 아래 모서리를 당겨 크기를 바꿔요.' : '창의 ▲▼ · ⇄로 자리를 바꿔요.'} −는 숨기기.</small>`)}
            ${row('창 더하기', `${hidden.map(([k, n]) => B(`win:${k}`, `＋ ${esc(n)}`, false, 'chip')).join('') || '<small class="ss-hint">숨긴 창이 없어요.</small>'}${uw.length < 8 ? B('uwadd:note', '＋ 메모 창', false, 'chip new') + B('uwadd:stat', '＋ 수치 창', false, 'chip new') : ''}`)}
            ${d.hpFreeOn === true ? '' : row('가운데 창', seg('main', L.main, [['l', '왼쪽'], ['c', '가운데'], ['r', '오른쪽']]) + seg('lw', L.lw, [['0', '왼 좁게'], ['1', '보통'], ['2', '넓게']]) + seg('rw', L.rw, [['0', '오른 좁게'], ['1', '보통'], ['2', '넓게']]))}`;
    } else {
        body = `<p class="ss-hint">화면에서 바꿀 곳(머리줄 · 창 제목 · 창 · 카드 · 단추)을 그냥 눌러도 돼요.</p><div class="ss-hp-strip">${Object.entries(PARTS).map(([k, [n]]) => B(`part:${k}`, n + (d.hpParts?.[k] ? ' ✓' : ''), !!d.hpParts?.[k], 'chip big')).join('')}</div>`;
    }
    return `<div class="ss-hp-sheet ss-notr" data-tab="${ED.part ? 'part' : ED.tab}"><div class="ss-hp-sbody">${body}</div>
        <div class="ss-hp-stabs">${TABS.map(([k, n]) => B(`tab:${k}`, n, !ED.part && ED.tab === k)).join('')}${B('more:1', '더보기 ›', false, 'more')}</div></div>`;
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
export const isDecoMode = () => editWins; // 꾸미기 모드인가 (홈의 앱 카드 순서 바꾸기 단추를 보일 때 씀)
export function photoHTML(meta) {
    const p = meta.hpPhoto;
    if (!p?.src) return '<div class="ss-hp-addphoto"><button class="ss-btn sm ghost" data-hp="photo"><i class="fa-solid fa-image"></i> 여기에 큰 사진 넣기</button></div>';
    const top = p.pos === 'top'; // 기본은 소식 아래 (미니홈피처럼) · ↑ 단추로 맨 위
    return `<figure class="ss-hp-main ${top ? 'top' : ''}"><img src="${esc(p.src)}" alt=""><figcaption><button data-hp="cap" title="눌러서 한마디 고치기">${p.cap ? esc(p.cap) : '<i>한마디 적기…</i>'}</button>
        <span><button class="ss-ib" data-hp="photopos" title="${top ? '사진을 앱들 아래로' : '사진을 앱들 위로'}"><i class="fa-solid ${top ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></button><button class="ss-ib" data-hp="photo" title="사진 바꾸기"><i class="fa-solid fa-image"></i></button><button class="ss-ib" data-hp="photodel" title="사진 빼기"><i class="fa-solid fa-trash-can"></i></button></span></figcaption></figure>`;
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
    try { const st = el._ss, key = `${st?.group}/${st?.tab}`; if (el._hpTab !== undefined && el._hpTab !== key) body?.classList.add('ss-hp-swap'); el._hpTab = key; const face = root.querySelector('.ss-hp-pet') ?? root.querySelector('.ss-hp-photo img'), fk = face?.getAttribute('src'); if (el._hpFace !== undefined && fk && el._hpFace !== fk) face.classList.add('pop'); el._hpFace = fk; } catch { /* 꾸밈일 뿐 */ }
    try { const gn = D().hpGroupNames ?? {}; root.querySelectorAll(':scope > .ss-hp-marks .ss-groups > button[data-arg]').forEach(b => { const sp = b.querySelector('span'); if (!sp) return; if (!b.dataset.n0) b.dataset.n0 = sp.textContent; const n = gn[b.dataset.arg], t = n ? String(n).slice(0, 8) : b.dataset.n0; if (sp.textContent !== t) sp.textContent = t; }); } catch { /* 꾸밈일 뿐 */ }
    if (innerWidth <= 640) return; // (속도) matchMedia는 물을 때마다 스타일 계산을 한 번 더 시킨다
    if (root.querySelector('.ss-hp-book.free') || root.classList.contains('ss-hp-edit')) { right?.classList.add('ss-hp-over'); cols.forEach(c => c.classList.add('ss-hp-over')); return; } // 자유 배치: 창마다 정한 크기 안에서 스크롤
    // (v2.8 다이어트) 예전엔 줄마다 「재고 → 줄이고 → 다시 재고」를 최대 4번 돌려 화면 배치 계산을 여러 번 시켰다 (전체화면에서 한 턴 시간의 절반).
    //  이제 ① 같은 창 크기 · 같은 내용 길이에서 지난번에 찾은 배율을 먼저 걸어 두고 ② 한 번에 다 잰 뒤 ③ 맞으면 그대로, 안 맞을 때만 예전처럼 다시 찾는다.
    const memo = (fitHompy._z ??= new Map()); if (memo.size > 80) memo.clear();
    const kb = `${innerWidth}x${innerHeight}|${root.getAttribute('style')}|${document.body.className}|${cols.length}`, keys = cols.map((c, i) => `${i}|${c.firstElementChild.innerHTML.length}|${kb}`);
    cols.forEach((c, i) => { const m = memo.get(keys[i]); if (m && m.z < 1) c.firstElementChild.style.zoom = String(m.z); if (m?.over) c.classList.add('ss-hp-over'); });
    // (속도) 재기 전에 쓸 것을 다 써 둔다 — 잰 뒤에 쓰면 브라우저가 화면 배치를 한 번 더 계산한다 (그릴 때마다 2번 → 1번)
    const hb = body?.querySelector(':scope > .ss-hp-homewrap > .ss-hp-homebody'), lastH = el._hpRoom?.k === kb ? el._hpRoom.h : '';
    right?.classList.add('ss-hp-over'); if (hb && lastH) body.style.height = lastH;
    if (!right || right.clientHeight < 60) { if (tries < 8) setTimeout(() => fitHompy(el, tries + 1), 80); return; } // 창이 아직 안 떴음
    const pad = (x) => { const cs = getComputedStyle(x); return parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom); };
    // 재기 (한 번에)
    const rooms = cols.map(c => c.clientHeight - pad(c)), hs = cols.map(c => c.firstElementChild.scrollHeight);
    let used = 0; for (const ch of right.children) { if (ch === body) continue; const cs = getComputedStyle(ch); used += ch.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom); }
    const room = right.clientHeight - pad(right) - used - 8;
    // 고르기
    const over = cols.map((c, i) => {
        const inn = c.firstElementChild, m = memo.get(keys[i]);
        if (m ? (m.over || hs[i] * m.z <= rooms[i] + 2) : (rooms[i] <= 0 || hs[i] <= rooms[i] + 1)) { if (!m) memo.set(keys[i], { z: 1, over: false }); return m ? m.over : false; }
        const ok = shrinkToFit(inn, rooms[i], () => inn.scrollHeight); memo.set(keys[i], { z: parseFloat(inn.style.zoom) || 1, over: !ok }); return !ok;
    });
    // 적기 (한 번에)
    cols.forEach((c, i) => c.classList.toggle('ss-hp-over', over[i]));
    if (hb) { const h = `${room}px`; if (body.style.height !== h) body.style.height = h; el._hpRoom = { k: kb, h }; } // 가운데 창은 글씨를 줄이지 않고, 넘치면 창 안에서 스크롤 (칸은 여러 단으로 쌓여 있음)
}
// 사진 단추 (패널마다 걸지 않고 문서에 한 번)
export function initHompy() {
    try { document.getElementById('ss-plex')?.remove(); } catch { /* 예전 판이 넣어 둔 구글 글꼴 줄 */ }
    // 프로필 그림은 처음엔 비워 둔다: 예전 판에서 기본값이던 「기분 따라 미트볼」(첫 화면에서 손 흔드는 움직이는 그림)이 저장돼 있으면 한 번만 비운다 — 다시 고르면 그대로 남는다
    try { const st = settings(); if (st.hpFaceV !== 2) { if (st.hpFace === 'auto' || st.hpFace === undefined) st.hpFace = 'none'; st.hpFaceV = 2; saveSettings(); } } catch (e) { ssErr(e); }
    // (속도) 시작할 때는 표시(class) · 색 값만 걸고, 재야 하는 것(브라우저 최소 글꼴 · 팝업 알림 색 읽기)은 화면이 뜬 뒤 한가할 때
    booting = true; try { applyRetro(); } catch (e) { ssErr(e); } booting = false;
    // 글꼴 목록: 지난번에 이 기기에서 추려 둔 것이 있으면 바로 걸고(싸다), 없으면 한가할 때 한 번 추린다
    try { const sv = JSON.parse(localStorage.getItem(FONT_KEY) || 'null'); if (sv?.stacks) writeFontCss(sv.stacks); } catch { /* 저장소를 못 쓰는 환경 */ }
    { const later = () => { try { trimFonts(); applyRetro(); } catch (e) { ssErr(e); } }; if (globalThis.requestIdleCallback) requestIdleCallback(later, { timeout: 2500 }); else setTimeout(later, 800); }
    try { window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyRetro()); const C = ctx(); C.eventSource?.on?.(C.event_types?.CHAT_CHANGED ?? C.eventTypes?.CHAT_CHANGED, () => setTimeout(applyRetro, 300)); } catch (e) { ssErr(e); } // 채팅마다 다른 꾸밈 세트
    let rt = null; const refit = () => { clearTimeout(rt); rt = setTimeout(() => document.querySelectorAll('.ss-hompy').forEach(r => fitHompy(r.closest('.ss-panel'))), 120); };
    window.addEventListener('resize', refit);
    // (속도) 그릴 때마다 그림(미트볼 · 프로필)이 새로 붙어 load가 다시 오고, 그때마다 한 번 더 재던 것 → 처음 보는 그림일 때만 다시 잰다 (이미 받은 그림은 크기를 아는 채로 그려진다)
    const seenImg = new Set();
    document.addEventListener('load', (e) => { const t = e.target; if (t?.tagName !== 'IMG' || !t.closest?.('.ss-hompy')) return; const k = t.currentSrc || t.src; if (seenImg.has(k)) return; if (seenImg.size > 400) seenImg.clear(); seenImg.add(k); refit(); }, true);
    // 🎛 꾸미기 모드 아래 판: 슬라이더 · 색은 끄는 동안 바로 보이고, 손을 떼면 저장
    let edSnapped = false;
    document.addEventListener('input', (e) => {
        const t = e.target; if (!ED || !t.closest?.('.ss-hp-sheet')) return; if (!edSnapped) { takeSnap(); edSnapped = true; }
        const roots = () => document.querySelectorAll('.ss-hompy');
        if (t.dataset.hpc) { W(t.dataset.hpc, t.value); applyRetro(); return; }
        if (t.dataset.pc || t.dataset.pr) { if (!ED.part) return; const P = clone(D().hpParts) ?? {}; P[ED.part] = { ...(P[ED.part] ?? {}), [t.dataset.pc || t.dataset.pr]: t.dataset.pc ? t.value : Number(t.value) }; W('hpParts', P); applyRetro(); return; }
        const k = t.dataset.hpr; if (!k) return; const sh = t.closest('.ss-hp-sheet');
        if (k === 'fs') { W('hpFsPx', Number(t.value)); applyRetro(); roots().forEach(x => x.style.setProperty('--hp-fs', `${fsUse(t.value)}px`)); const o = sh.querySelector('[data-fsv]'); if (o) o.textContent = `${t.value}px`; }
        else if (k === 'alpha') { W('hpCardAlpha', Number(t.value) >= 1 ? 0 : Number(t.value)); applyRetro(); }
        else if (k === 'corner') { W('hpCorner', Number(t.value)); applyRetro(); } else if (k === 'gap') { W('hpGap', Number(t.value)); applyRetro(); }
        else { W('hpTheme', 'c'); const hs = sh.querySelector('[data-hpr="hue"]').value, ss = sh.querySelector('[data-hpr="sat"]').value; W('hpHue', Number(hs)); W('hpSat', Number(ss)); applyRetro(); roots().forEach(x => { x.style.setProperty('--hp-h', hs); x.style.setProperty('--hp-s', ss); }); }
    }, true);
    document.addEventListener('change', (e) => { if (!ED || !e.target.closest?.('.ss-hp-sheet')) return; edSnapped = false; saveSettings(); app.rerenderPanels?.(true); }, true);
    // 빈 곳 · 창 제목을 길게 누르면 꾸미기 모드 (아이폰 · 갤럭시 홈 화면처럼 · 0.6초 · 움직이면 취소)
    let lp = null; const lpOff = () => { clearTimeout(lp?.t); lp = null; };
    document.addEventListener('pointerdown', (e) => {
        if (ED || e.button > 0) return; const root = e.target.closest?.('.ss-hompy'); if (!root) return;
        if (e.target.closest('button, a, input, textarea, select, [role="button"], [data-act], [data-hp], .ss-body')) return; // 누르는 것 · 가운데 내용 위에서는 안 켠다
        if (!e.target.closest('.ss-hp-book, .ss-hp-wt, .ss-hp-url')) return;
        const el = root.closest('.ss-panel'); lp = { x: e.clientX, y: e.clientY, t: setTimeout(() => { lp = null; startEdit(); if (el?.isConnected) app.renderPanel?.(el); try { navigator.vibrate?.(12); } catch { /* 진동 없음 */ } }, 600) };
    }, true);
    document.addEventListener('pointermove', (e) => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8) lpOff(); }, true);
    for (const ev of ['pointerup', 'pointercancel', 'scroll']) document.addEventListener(ev, lpOff, true);
    document.addEventListener('keydown', (e) => { if (ED && e.key === 'Escape' && !document.querySelector('.ss-hp-pick')) { e.preventDefault(); e.stopPropagation(); endEdit(false); } }, true);
    // 🪟 자유 배치: 창 제목을 끌어 옮기고, 오른쪽 아래 모서리를 당겨 크기를 바꾼다 (창 옮기기 중에만 · 0.5% 단위로 붙음)
    let drag = null;
    document.addEventListener('pointerdown', (e) => {
        const w = e.target.closest?.('.ss-hp-book.free.ss-hp-editing > .ss-hp-win'); if (!w || e.button > 0) return;
        const rs = e.target.closest('.ss-hp-rs'), wt = e.target.closest('.ss-hp-wt'); if (!rs && !wt || e.target.closest('button')) return;
        const book = w.parentElement, br = book.getBoundingClientRect(), g = (k) => Number(w.style.getPropertyValue(k)) || 0;
        drag = { w, book, br, rs: !!rs, sx: e.clientX, sy: e.clientY, x: g('--x'), y: g('--y'), ww: g('--w'), h: g('--h'), id: e.pointerId }; w.classList.add('drag'); e.preventDefault();
    }, true);
    document.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return; const dx = ((e.clientX - drag.sx) / drag.br.width) * 100, dy = ((e.clientY - drag.sy) / drag.br.height) * 100, sn = (v) => Math.round(v * 2) / 2, cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        if (drag.rs) { drag.w.style.setProperty('--w', String(sn(cl(drag.ww + dx, 8, 100 - drag.x)))); drag.w.style.setProperty('--h', String(sn(cl(drag.h + dy, 6, 200)))); }
        else { drag.w.style.setProperty('--x', String(sn(cl(drag.x + dx, 0, 100 - drag.ww)))); drag.w.style.setProperty('--y', String(sn(cl(drag.y + dy, 0, 300)))); }
    }, true);
    const dragEnd = (e) => {
        if (!drag || e.pointerId !== drag.id) return; const { w, book } = drag; drag = null; w.classList.remove('drag');
        const g = (k) => Number(w.style.getPropertyValue(k)) || 0, cls = book.dataset.cls === 'tab' ? 'tab' : 'wide', F = clone(D().hpFree) ?? {};
        F[cls] = { ...(F[cls] ?? {}), [w.dataset.win]: { x: g('--x'), y: g('--y'), w: g('--w'), h: g('--h') } }; W('hpFree', F); saveSettings();
    };
    document.addEventListener('pointerup', dragEnd, true); document.addEventListener('pointercancel', dragEnd, true);
    document.addEventListener('click', async (e) => {
        if (ED) { // 🎛 꾸미기 모드: 바꿀 곳을 누르면 그 부분 꾸미기 (메뉴 · 탭 · 아래 판 · 창 단추는 그대로 눌림)
            const root = e.target.closest?.('.ss-hompy');
            if (root && !e.target.closest('[data-hp], .ss-hp-sheet, .ss-hp-edbar, .ss-groups, .ss-tabs, .ss-hp-wtools, .ss-hp-rs')) {
                e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                const part = PART_PICK.find(([, q]) => e.target.closest(q))?.[0]; if (!part) return;
                ED.part = part; const pel = root.closest('.ss-panel'); if (pel?.isConnected) app.renderPanel?.(pel); return;
            }
        }
        const b = e.target.closest?.('.ss-hompy [data-hp]'); if (!b) return;
        e.preventDefault(); e.stopPropagation();
        const el = b.closest('.ss-panel');
        if (b.dataset.hp === 'close' && ED) endEdit(true); // 꾸미기 모드 중에 닫으면 저장하고 끝낸다
        if (b.dataset.hp === 'close') { el?.closest('dialog')?.querySelector('.popup-button-ok')?.click(); return; }
        if (b.dataset.hp === 'mv') { const [key, how] = String(b.dataset.arg).split(':'); moveWin(key, how, [...(b.closest('.ss-hp-col')?.querySelectorAll('[data-win]') ?? [])].map(x => x.dataset.win)); if (el?.isConnected) app.renderPanel?.(el); return; }
        if (b.dataset.hp === 'fold' && el?._ss) { el._ss.hpOpen = [b.dataset.arg]; app.renderPanel?.(el); return; } // 「모음」 칸: 탭처럼 한 번에 하나만 — 다른 제목을 누르면 열려 있던 칸은 사라지고 그 칸만 보임 (예전엔 아래로 계속 쌓였음)
        if (b.dataset.hp === 'solo' && el?._ss) { Object.assign(el._ss, { tab: b.dataset.arg, hpSolo: b.dataset.arg, mode: 'view', ui: {} }); app.renderPanel?.(el); return; } // 이 칸만 크게
        if (b.dataset.hp === 'all' && el?._ss) { el._ss.hpSolo = null; el._ss.mode = 'view'; app.renderPanel?.(el); return; } // 묶음 전체로
        if (b.dataset.hp === 'appmv') { // 홈의 앱 카드 순서: 지금 보이는 순서에서 한 칸 앞 · 뒤로
            const [t, d] = String(b.dataset.arg).split(':'), order = [...(b.closest('.ss-fb-grid')?.querySelectorAll('[data-app]') ?? [])].map(x => x.dataset.app), i = order.indexOf(t), j = i + Number(d);
            if (i >= 0 && j >= 0 && j < order.length) { [order[i], order[j]] = [order[j], order[i]]; settings().hpApps = order; saveSettings(); app.rerenderPanels?.(true); } return;
        }
        if (b.dataset.hp === 'tipoff') { settings().hpTip = false; saveSettings(); app.rerenderPanels?.(true); return; }
        if (b.dataset.hp === 'skinpick') { const v = b.dataset.arg; if (SKINS[v]) { settings().hpSkin = v; settings().hpFont = SKIN_DEF[v][0]; settings().hpDark = SKIN_DEF[v][1]; } else settings().hpSkin = settings().hpSkin ?? 'clean'; saveSettings(); applyRetro(); app.rerenderPanels?.(true); app.renderHud?.(); return; } // 처음 한 번: 모양 고르기
        if (b.dataset.hp === 'editdone') { if (ED) endEdit(true); else { editWins = false; if (el?.isConnected) app.renderPanel?.(el); } return; }
        const rd0 = () => { if (el?.isConnected) app.renderPanel?.(el); };
        if (b.dataset.hp === 'deco') { startEdit(); rd0(); return; } // 꾸미기 = 꾸미기 모드로 (자세한 창은 아래 판의 「더보기」)
        if (b.dataset.hp === 'eddone') { endEdit(true); return; } if (b.dataset.hp === 'edcancel') { endEdit(false); return; }
        if (b.dataset.hp === 'ed' && ED) {
            const arg = String(b.dataset.arg), ci = arg.indexOf(':'), k = arg.slice(0, ci), v = arg.slice(ci + 1);
            try {
                if (k === 'tab') { ED.tab = v; ED.part = null; rd0(); return; }
                if (k === 'partback') { ED.part = null; ED.tab = 'parts'; rd0(); return; }
                if (k === 'part') { ED.part = v; rd0(); return; }
                if (k === 'undo') { undo(); afterDeco(rd0); return; }
                if (k === 'more') { await openDeco(rd0); rd0(); return; }
                if (k === 'pal') { const p = ED.pal?.[Number(v)]; if (p) { takeSnap(); W('hpTheme', 'c'); W('hpHue', p[0]); W('hpSat', p[1]); afterDeco(rd0); } return; }
                if (k === 'pcl' && ED.part) { takeSnap(); const P = clone(D().hpParts) ?? {}; if (v === '*') delete P[ED.part]; else if (P[ED.part]) { delete P[ED.part][v]; if (!Object.keys(P[ED.part]).length) delete P[ED.part]; } W('hpParts', P); afterDeco(rd0); return; }
                await decoAct(k, v, rd0);
            } catch (err) { ssErr(err); }
            return;
        }
        if (b.dataset.hp === 'face') { try { await pickFace(() => { if (el?.isConnected) app.renderPanel?.(el); }); } catch (err) { ssErr(err); } return; }
        const meta = getMeta(); if (!meta) return;
        const done = () => { saveMeta(); if (el?.isConnected) app.renderPanel?.(el); };
        try {
            if (b.dataset.hp === 'photodel') { delete meta.hpPhoto; return done(); }
            if (b.dataset.hp === 'photopos') { if (meta.hpPhoto) meta.hpPhoto.pos = meta.hpPhoto.pos === 'top' ? 'bottom' : 'top'; return done(); }
            if (b.dataset.hp === 'cap') { const v = await askInput('사진 아래 한마디', '비워 두면 지워져요.', meta.hpPhoto?.cap ?? ''); if (v === null || !meta.hpPhoto) return; meta.hpPhoto.cap = short(v.trim(), 80); return done(); }
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
            inp.onchange = async () => { try { const f = inp.files?.[0]; if (!f) return; meta.hpPhoto = { src: await shrinkImage(f, 900, 0.82, 260000), cap: meta.hpPhoto?.cap ?? '', pos: meta.hpPhoto?.pos ?? 'bottom' }; done(); } catch (err) { ssErr(err); toastr.error('사진을 넣지 못했어요. 다른 그림으로 해 보세요.', TITLE); } };
            inp.click();
        } catch (err) { ssErr(err); }
    }, true);
}
// ⚡ (속도) 미니홈피를 다시 그릴 때 화면 전체(요소 400개 남짓)를 새로 붙이지 않고, 머리줄 · 메뉴 · 옆 창 가운데 **안 바뀐 것은 그대로 두고 바뀐 것만** 갈아 끼운다.
//   · 견주는 것은 「붙일 때의 원래 HTML」 — 그린 뒤 손본 것(화면 번역 · 맞춤 배율 · 아이콘 이름표)과는 견주지 않는다
//   · 가운데 창은 늘 새로 붙인다 (그린 뒤 손보는 것 — 「보일 것」 막대 · 입력칸 연결 — 이 그쪽에만 있어서)
//   · 틀이 달라졌으면(창 수 · 자리 · 꾸미기 모드 · 자유 배치 · 번역 사전이 바뀜) 예전처럼 통째로
const SRC = new WeakMap(), FRAME = new WeakMap();
const colCls = (c) => c.className.replace(/\s*\bss-hp-over\b/g, '').trim();
const frameOf = (root) => {
    const book = root.querySelector(':scope > .ss-hp-book'); if (!book || book.classList.contains('free') || root.classList.contains('ss-hp-edit')) return null;
    const kids = [...root.children].map(c => `${c.tagName}.${c.classList[0] ?? ''}`).join(' ');
    const cols = [...book.children].map(c => (c.classList.contains('ss-hp-col') ? `col(${colCls(c)})[${[...c.querySelectorAll(':scope > .ss-hp-col-in > .ss-hp-win')].map(w => w.dataset.win).join(',')}]${c.querySelectorAll(':scope > .ss-hp-col-in > *').length}` : c.classList.contains('main') ? 'main' : `?${c.className}`)).join(' ');
    return cols.includes('?') ? null : `${app.trEpoch?.() ?? ''}|${kids}|${cols}`;
};
const unitsOf = (root) => { const book = root.querySelector(':scope > .ss-hp-book'); return [...[...root.children].filter(c => c !== book), ...(book ? [...book.querySelectorAll(':scope > .ss-hp-col > .ss-hp-col-in > .ss-hp-win')] : [])]; };
export function mountHompy(el, html) {
    try {
        const t = document.createElement('template'); t.innerHTML = html; const neu = t.content.firstElementChild;
        if (!neu || t.content.childElementCount !== 1 || !neu.classList.contains('ss-hompy')) return false;
        const fr = frameOf(neu); for (const u of unitsOf(neu)) SRC.set(u, u.outerHTML); if (fr) FRAME.set(neu, fr);
        const old = el.childElementCount === 1 ? el.firstElementChild : null;
        if (!fr || !old || FRAME.get(old) !== fr || settings().hpPatch === false) { el.replaceChildren(neu); return true; }
        // 같은 틀: 바뀐 것만
        if (old.className !== neu.className) old.className = neu.className;
        if (old.getAttribute('style') !== neu.getAttribute('style')) old.setAttribute('style', neu.getAttribute('style') ?? '');
        const ob = old.querySelector(':scope > .ss-hp-book'), nb = neu.querySelector(':scope > .ss-hp-book');
        const swap = (o, n) => { if (SRC.get(o) !== SRC.get(n)) o.replaceWith(n); };
        const oc = [...old.children], nc = [...neu.children];
        for (let i = 0; i < oc.length; i++) if (oc[i] !== ob) swap(oc[i], nc[i]);
        if (ob.className !== nb.className) ob.className = nb.className;
        if (ob.getAttribute('style') !== nb.getAttribute('style')) ob.setAttribute('style', nb.getAttribute('style') ?? '');
        const obc = [...ob.children], nbc = [...nb.children];
        for (let i = 0; i < obc.length; i++) {
            const o = obc[i], n = nbc[i];
            if (!o.classList.contains('ss-hp-col')) { o.replaceWith(n); continue; } // 가운데 창
            o.classList.remove('ss-hp-over'); // 새로 붙인 줄처럼: 넘침 표시는 맞춤(fitHompy) · 미니 채팅 붙이기가 다시 정한다 (폰에서는 맞춤이 안 돌아 예전 표시가 남았음)
            const ow = [...o.querySelectorAll(':scope > .ss-hp-col-in > .ss-hp-win')], nw = [...n.querySelectorAll(':scope > .ss-hp-col-in > .ss-hp-win')];
            for (let k = 0; k < ow.length; k++) swap(ow[k], nw[k]);
        }
        FRAME.set(old, fr);
        return true;
    } catch (e) { ssErr(e); return false; }
}
export function hompyHTML({ rootCls, headHTML, pauseHTML, groupsHTML, restHTML, s, meta, nNew, enter, homeGroup }) {
    const c = s.core, d = s.data, [con, feel] = mood(s, meta, nNew), [, hue, sat] = themeOf();
    const total = (ctx().chat ?? []).filter(m => !m.is_system).length;
    const cal = d.calendar && modOn('calendar', meta) ? d.calendar : null, here = modOn('map', meta) ? d.map?.here : '';
    const w = d.wallet && modOn('wallet', meta) ? d.wallet : null;
    const DD = D(), PF = DD.hpProf ?? {}, CN = DD.hpCounts ?? {}, TT = DD.hpTitles ?? {}, UW = userWins();
    const bars = modOn('stats', meta) ? (d.stats?.bars ?? []).slice(0, [3, 6, 12].includes(Number(CN.bars)) ? Number(CN.bars) : 6) : [];
    const rel = d.rel && modOn('rel', meta) ? d.rel : null, AX = rel ? relAxes(rel) : null;
    const friends = rel ? rel.user.filter(r => !r.out).sort((x, y) => y.aff + y.trust - x.aff - x.trust).slice(0, [3, 6, 10].includes(Number(CN.friends)) ? Number(CN.friends) : 6) : [];
    const mini = [cal ? ['날짜', `${dateShort(cal)} ${cal.time}${cal.weather ? ` · ${cal.weather}` : ''}`] : null, here ? ['장소', here] : null, w ? ['재산', `${fmtNum(w.cash)} ${w.currency ?? ''}`] : null].filter(Boolean);
    const mine = String(D().hpFace ?? '').startsWith('my:') && !!settings().hpFaces?.[Number(String(D().hpFace).slice(3))];
    const home = !!homeGroup, photo = photoHTML(meta), hasPhoto = !!meta.hpPhoto?.src; // 홈 묶음에서는 사진이 가운데 창에 크게 → 옆의 사진 창은 안 띄움
    // 창 내용 (없으면 빈 글 → 창이 안 뜸)
    const BODY = {
        profile: () => (PF.face === false && PF.name === false && PF.mood === false && PF.badges === false ? '' : `${PF.face === false && PF.name === false && PF.mood === false ? '' : `<div class="ss-hp-prof ${PF.face === false ? 'noface' : ''}">${PF.face === false ? '' : `<div class="ss-hp-photo ${mine ? 'mine' : ''} ${faceSrc(con) ? '' : 'empty'}" data-hp="face" role="button" title="${faceSrc(con) ? '눌러서 프로필 그림 바꾸기' : '눌러서 프로필 그림 넣기'}">${faceSrc(con) ? `<img src="${esc(faceSrc(con))}" alt="">` : '<i class="fa-solid fa-plus"></i>'}</div>`}
            <div class="ss-hp-prof-t">${PF.name === false ? '' : `<b class="ss-hp-name">${esc(c.title || TITLE)}</b>`}${PF.mood === false ? '' : `<span class="ss-hp-today"><i></i>${esc(feel)}</span>`}</div></div>`}
            ${PF.badges === false ? '' : `<div class="ss-hp-badges"><span><b>${fmtNum(s.turn ?? 0)}</b>턴</span><span><b>${fmtNum(total)}</b>메시지</span>${(s.days ?? []).length ? `<span><b>${(s.days ?? []).length + 1}</b>일째</span>` : ''}</div>`}`),
        intro: () => (c.summary ? `<p class="ss-hp-intro">${esc(c.summary)}</p>` : ''),
        quest: () => { const q = d.quest && modOn('quest', meta) ? d.quest.list.filter(x => x.status === 'active') : []; return q.length ? `<ul class="ss-hp-list" data-act="tab" data-arg="quest">${q.slice(0, 6).map(x => `<li>${esc(x.title)}</li>`).join('')}</ul>` : ''; },
        news: () => { const n = d.news && modOn('news', meta) ? d.news.items.slice(-3).reverse() : []; return n.length ? `<ul class="ss-hp-list" data-act="tab" data-arg="news">${n.map(x => `<li>${esc(x.title)}</li>`).join('')}</ul>` : ''; },
        stats: () => `${mini.length ? `<dl class="ss-hp-mini">${mini.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}${bars.length ? `<div class="ss-hp-bars">${bars.map(b => `<div><span>${esc(b.name)}</span><i><b style="width:${b.max > 0 ? Math.max(0, Math.min(100, (b.cur / b.max) * 100)) : 0}%"></b></i><small>${fmtNum(b.cur)}</small></div>`).join('')}</div>` : ''}`,
        friends: () => (friends.length ? `<div class="ss-hp-friends">${friends.map(r => `<button data-act="tab" data-arg="rel" title="관계 탭 열기">${avatar(r.name)}<span><b>${esc(r.name)}</b><small>${r.label ? esc(r.label) : ''}</small></span><em>♥${r.aff}</em><em class="t">★${r.trust}</em></button>`).join('')}</div>` : ''),
        photo: () => (!home && hasPhoto ? photo : ''),
    };
    for (const u of UW) BODY[u.id] = u.type === 'note' ? () => (u.text ? `<p class="ss-hp-note">${esc(u.text)}</p>` : '') : () => { const b = (d.stats?.bars ?? []).find(x => x.name === u.stat); return b ? `<div class="ss-hp-big"><b>${fmtNum(b.cur)}</b><small>/ ${fmtNum(b.max)} ${esc(b.name)}</small><i><em style="width:${b.max > 0 ? Math.max(0, Math.min(100, (b.cur / b.max) * 100)) : 0}%"></em></i></div>` : `<p class="ss-hint">「${esc(u.stat || '')}」 수치가 없어요.</p>`; };
    const FREE = freeOn(), tOf = (k) => (TT[k] ? esc(TT[k]) : esc(winName(k)));
    const LY = hpLayout(), bodyOf = (k) => (LY.off.includes(k) ? '' : BODY[k] ? BODY[k]() : miniWidgets(s, [k])), mk = (k) => win(k, tOf(k), bodyOf(k), BODY[k] ? '' : 'x');
    // 🪶 가볍게 (설정 hpLite · 꾸미기 › 창): 옆 창들을 그리지 않는다 — 머리줄 · 메뉴 · 가운데 창만. 화면에 그리는 양이 절반 가까이 줄어 큰 상태창 · 폰에서 가볍다. 옆 창에 보이던 것은 홈의 앱 카드에 그대로 있다.
    const LITE = settings().hpLite === true && !FREE;
    const L = FREE || LITE ? '' : LY.l.map(mk).join(''), R = FREE || LITE ? '' : LY.r.map(mk).join('');
    const mainBody = restHTML;
    // 홈: 옆 창에 이미 보이는 칸은 가운데 타일에서 뺀다 — 그 창이 실제로 떠 있을 때만 (창을 숨기면 타일이 다시 보인다 · 자유 배치도 같음)
    const shown = (k) => !LITE && (LY.l.includes(k) || LY.r.includes(k)) && !!bodyOf(k);
    const dup = !home ? '' : ['stats', 'friends', 'quest', 'news', 'mind', 'cond', 'fate', 'music', 'custom'].filter(shown).map(k => `ss-hp-has-${k}`).join(' ');
    const COVER = { bars: 'stats', date: 'stats', loc: 'stats', cash: 'stats', rel: 'friends' }, HOME_KEYS = ['bars', 'date', 'loc', 'cash', 'music', 'fate', 'cond', 'custom', 'quest', 'rel', 'news'];
    const bare = home && !hasPhoto && !FREE && !miniWidgets(s, HOME_KEYS.filter(k => !shown(COVER[k] ?? k))); // 가운데에 남는 타일이 없음
    const cover = settings().hpCover;
    return `<div class="${rootCls} ss-hompy ${ED ? 'ss-hp-edit ss-hp-picking' : ''} ss-hp-k-${skinOf()} ${skinOf() === 'dot' ? `ss-hp-dot ss-hp-p-${patOf()}` : ''} ${home ? 'ss-hp-athome' : ''} ${dup} ${bare ? 'ss-hp-home-bare' : ''} ${enter ? 'ss-hp-enter' : ''}" style="--hp-h:${hue};--hp-s:${sat};--hp-fs:${fsPx()}px">
        ${ED ? `<div class="ss-hp-edbar"><button data-hp="edcancel">취소</button><span><b>꾸미기</b><small>아래에서 고르거나, 바꿀 곳을 눌러요</small></span>${undoSnap ? '<button data-hp="ed" data-arg="undo:1" title="방금 것 되돌리기"><i class="fa-solid fa-rotate-left"></i></button>' : ''}<button class="pri" data-hp="eddone">완료</button></div>` : ''}
        <div class="ss-hp-url ss-hp-top ${cover ? 'has-cover' : ''}"${cover ? ` style="background-image:linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.45)), url('${esc(cover)}')"` : ''}><i class="ss-hp-dots"></i><i class="ss-hp-dots"></i><i class="ss-hp-dots"></i><span class="ss-hp-nav" aria-hidden="true">‹ › ⟳</span><span class="ss-hp-buddy">${DD.hpPet === false || settings().showMascot === false ? '' : `<img class="ss-mascot ss-hp-pet m-${meta.paused ? 'sleep' : 'think'}" src="${mascotUrl(meta.paused ? 'sleep' : 'think')}" alt="" title="눌러 보세요! (${esc(feel)})" draggable="false">`}</span><span class="ss-hp-addr"><small>meatball.home/</small><b>${esc(short(c.title || TITLE, 30))}</b></span>${headHTML}<button class="ss-hp-x ss-hp-deco-m" data-hp="deco" title="꾸미기"><i class="fa-solid fa-palette"></i></button><button class="ss-hp-x" data-hp="close" title="닫기"><i class="fa-solid fa-xmark"></i></button><em></em></div>
        <div class="ss-hp-marks"><div class="ss-hp-index">${groupsHTML}</div><span class="ss-hp-count">TURN <b>${s.turn ?? 0}</b> · TOTAL <b>${total}</b></span>${editWins ? '<button class="ss-hp-deco-b on" data-hp="editdone">✓ 창 옮기기 끝</button>' : ''}<button class="ss-hp-deco-b" data-hp="deco" title="색 · 글씨 크기 · 창 자리 · 보일 창"><i class="fa-solid fa-palette"></i> 꾸미기</button></div>
        ${settings().hpSkin === undefined ? `<div class="ss-hp-choose"><b>어떤 모양으로 볼까요?</b><small>나중에 「꾸미기」에서 언제든 바꿀 수 있어요.</small>
            <button data-hp="skinpick" data-arg="clean" class="${skinOf() === 'clean' ? 'on' : ''}"><span class="ss-hp-pv clean"><i></i><i></i><i></i></span>깔끔</button>
            <button data-hp="skinpick" data-arg="dot" class="${skinOf() === 'dot' ? 'on' : ''}"><span class="ss-hp-pv dot"><i></i><i></i><i></i></span>도트</button>
<button data-hp="deco" title="폰 모양 · 색 · 글씨">다른 모양 더 보기 ›</button>
            <button data-hp="skinpick" data-arg="" class="x" title="지금 모양 그대로">✕</button></div>` : ''}
        ${ED ? sheetHTML() : ''}
        ${picking ? '<div class="ss-hp-pickbar"><i class="fa-solid fa-arrow-pointer"></i> <b>꾸밀 곳을 눌러요</b> <small>머리줄 · 메뉴 · 창 제목 · 창 · 카드 · 단추</small><button class="ss-hp-deco-b on" data-hp="pickend">끝</button></div>' : ''}
        ${(() => {
            if (FREE) { // 자유 배치: 창마다 자리(왼쪽 · 위 · 폭 · 높이, 판 크기의 %)를 따로 — 저장한 자리가 없으면 세 줄 모양에서 시작
                const ls = LY.l.filter(k => bodyOf(k)), rs = LY.r.filter(k => bodyOf(k)), mx = ls.length ? 18 : 0, mw = 100 - mx - (rs.length ? 20 : 0);
                const side = (list, x, w) => list.map((k, i2) => win(k, tOf(k), bodyOf(k), BODY[k] ? '' : 'x', freePos(k, { x, y: Math.round((100 / list.length) * i2), w, h: Math.round(100 / list.length) }))).join('');
                const mainW = `<section class="ss-hp-win main" data-win="main"${posStyle(freePos('main', { x: mx, y: 0, w: mw, h: 100 }))}><div class="ss-hp-wt"><b>${esc(c.title || TITLE)}</b><i class="ss-hp-hearts">♡♡♡</i></div><div class="ss-hp-right">${pauseHTML}${mainBody}</div>${editWins ? '<i class="ss-hp-rs" title="당겨서 크기 바꾸기"></i>' : ''}</section>`;
                return `<div class="ss-hp-book free ${editWins ? 'ss-hp-editing' : ''}" data-cls="${devCls()}">${mainW}${side(ls, 0, 17)}${side(rs, 81, 19)}</div>`;
            }
            const lcol = L ? `<aside class="ss-hp-col ss-hp-left"><div class="ss-hp-col-in ss-hp-left-in">${L}</div></aside>` : '', rcol = R ? `<aside class="ss-hp-col ss-hp-rcol"><div class="ss-hp-col-in">${R}</div></aside>` : '';
            const main = `<section class="ss-hp-win main"><div class="ss-hp-wt"><b>${esc(c.title || TITLE)}</b><i class="ss-hp-hearts">♡♡♡</i></div><div class="ss-hp-right">${pauseHTML}${mainBody}</div></section>`;
            const order = LY.main === 'l' ? [['m', main], ['l', lcol], ['r', rcol]] : LY.main === 'r' ? [['l', lcol], ['r', rcol], ['m', main]] : [['l', lcol], ['m', main], ['r', rcol]];
            const rwAuto = LY.rw; // 오른쪽 줄에 창이 4개 넘게 쌓이면 (폭을 직접 고르지 않았을 때) 넓게 — 좁은 줄에서 제목이 서너 줄로 꺾이던 것
            const cols = order.filter(([, h]) => h).map(([k]) => (k === 'm' ? 'minmax(0, 1fr)' : COLW[k === 'l' ? LY.lw : rwAuto])).join(' ');
            return `<div class="ss-hp-book ${editWins ? 'ss-hp-editing' : ''}" style="grid-template-columns:${cols}">${order.map(([, h]) => h).join('')}</div>`;
        })()}
    </div>`;
}
