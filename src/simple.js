// 🍙 심플 모드 — 탭 없이 타일 판 하나로 쓰는 가벼운 화면 (채팅마다 · meta.simple === true)
//   · 켜면: 추천 6칸(+ 타일 한 칸으로 보이는 칸 몇 개)만 · 탭 줄 · 관리 · 부가 기능 화면 없음 · 팁 · 추천 · 알림 창 안 뜸
//   · 넓히기(기본 모드로): 숨겨 둔 칸을 그대로 되살린다 — 내용은 지운 적이 없다
//   · 돌아오기(심플로): 심플에 없는 칸은 끄기만 하고(내용 · 기록 그대로) 어떤 칸이었는지 meta.simpleBak에 적어 둔다
// 이 파일은 톱니를 누르거나 모드를 바꿀 때만 불러온다 (shell.js의 app.simpleMenu · 'tosimple').
import { app, settings, saveSettings, getMeta, saveMeta, modOn, MOD, MOD_IDS, GENRES, normalize, TITLE, LOG, ssWarn, esc, SIMPLE_EXTRA, simpleOk, isSimple } from './core.js';
import { commit } from './engine.js';
import { skeleton } from './skeleton.js';
import { popup, askConfirm } from './kit.js';
import { openWizard, openHelp } from './lazy.js';

const MANY = 3; // 더 켠 칸이 이만큼이면 「기본 모드가 더 편할 수 있어요」를 톱니 창 안에 한 줄 (알림으로는 안 띄움)

// 보이는 곳 — 모든 채팅에 같이 걸리는 설정(showHud · showSide · showFloat)을 셋 중 하나로 맞춘다
export const WHERE = {
    hud: { name: '채팅 위', icon: 'fa-window-maximize', desc: '채팅 위에 한 줄로' },
    side: { name: '옆', icon: 'fa-table-columns', desc: '오른쪽 작은 창으로' },
    full: { name: '버튼만', icon: 'fa-circle-dot', desc: '평소엔 숨기고 · 떠 있는 버튼을 누르면 한 화면으로' },
};
export function whereNow() {
    const s = settings();
    if (s.showHud && s.showSide) return 'both';
    if (s.showHud) return 'hud';
    if (s.showSide) return 'side';
    return 'full';
}
export function setWhere(v) {
    if (!WHERE[v]) return;
    const s = settings();
    s.showHud = v === 'hud'; s.showSide = v === 'side'; s.showFloat = v === 'full';
    if (v === 'side' && s.sideState === 'closed') s.sideState = 'mini';
    saveSettings();
    app.ensureUI?.();
}
// 어디에도 안 보이게 꺼 둔 채로 심플을 켜면 상태창이 아예 안 보인다 → 채팅 위 한 줄을 켠다
function ensureVisible() {
    const s = settings();
    if (!s.showHud && !s.showSide && !s.showFloat) { s.showHud = true; saveSettings(); }
}

// 칸 하나 더 켜기 · 끄기 (AI 0회 — 비어 있으면 기본 틀로 채운다 · 끌 때 내용은 그대로 둔다)
export async function setExtra(mod, on) {
    if (!SIMPLE_EXTRA.includes(mod)) return;
    const meta = getMeta(true);
    meta.mods[mod] = !!on;
    await saveMeta();
    const s = app.current?.state;
    if (on && s && !s.data[mod]) {
        try {
            const genre = GENRES.find(g => g.name === s.core?.genre)?.id ?? '';
            const d = skeleton(mod, genre, { pmode: 'minimal' });
            if (d) await commit(mod, normalize(mod, d), '');
        } catch (e) { ssWarn(LOG, 'simple extra', mod, e); }
    }
    app.refreshNow?.();
}

// 기본 모드로 넓히기
export async function widen() {
    const meta = getMeta(); if (!isSimple(meta)) return false;
    const back = (meta.simpleBak ?? []).filter(id => MOD[id]);
    const ok = await askConfirm([
        '기본 모드로 넓힐까요?',
        '',
        '· 탭이 있는 상태창이 열려요 (관리 · 쓸 기능 · 꾸미기)',
        '· 연락 · 상점 · 퀘스트 같은 칸을 관리 › 쓸 기능에서 켤 수 있어요 — 켜지 않으면 토큰은 지금과 같아요',
        back.length ? `· 숨겨 둔 칸 ${back.length}개(${back.map(id => MOD[id].name).join(' · ')})가 내용 그대로 돌아와요` : '',
        '· 언제든 심플로 돌아올 수 있고, 내용은 지워지지 않아요',
    ].filter((x, i) => x || i === 1).join('\n'));
    if (!ok) return false;
    for (const id of back) meta.mods[id] = true;
    delete meta.simpleBak;
    meta.simple = false;
    if (app.current) meta.fullTurn = app.current.state.turn; // 되살린 칸을 다음 턴에 한 번 통째로 보낸다 (가리기를 풀 때와 같게)
    await saveMeta();
    app.refreshNow?.();
    app.rerenderPanels?.(true);
    toastr.success('기본 모드로 넓혔어요. 돌아가려면 관리 › 플레이 › 「심플 모드로 바꾸기」.', TITLE, { timeOut: 7000 });
    return true;
}

// 심플 모드로 (기본 → 심플)
export async function toSimple() {
    const meta = getMeta(); if (!meta?.base || isSimple(meta)) return false;
    const hide = MOD_IDS.filter(id => meta.mods?.[id] !== false && modOn(id, meta) && !simpleOk(id));
    const ok = await askConfirm([
        '심플 모드로 바꿀까요? (이 채팅만)',
        '',
        '· 탭 없이 타일 판 하나만 써요',
        '· 팁 · 기능 추천 · 알림 창이 안 떠요 (답 밑의 칩과 오류 알림은 그대로)',
        hide.length ? `· 숨기는 칸 ${hide.length}개: ${hide.map(id => MOD[id].name).join(' · ')} — AI에게도 안 보내고, 내용은 그대로 둬요` : '· 숨기는 칸은 없어요',
        hide.length ? '· 숨긴 동안 이야기에서 바뀐 것은 그 칸에 적히지 않아요' : '',
        '· 톱니 › 「기본 모드로 넓히기」로 언제든 돌아와요',
    ].filter((x, i) => x || i === 1).join('\n'));
    if (!ok) return false;
    for (const id of hide) meta.mods[id] = false;
    meta.simpleBak = hide;
    meta.simple = true;
    ensureVisible();
    await saveMeta();
    app.tileEdit = false; app.hudExp = app.sideExp = null;
    app.refreshNow?.();
    app.rerenderPanels?.(true);
    toastr.info('심플 모드예요. 타일을 누르면 자세히 보이고, 톱니에서 설정해요.', TITLE, { timeOut: 6000 });
    return true;
}

// 만들기 창에서 심플로 시작했을 때 (wizard.js) — 묻지 않고 바로
export async function startSimple(on) {
    const meta = getMeta(true);
    if (on) { meta.simple = true; delete meta.simpleBak; ensureVisible(); app.tileEdit = false; app.hudExp = app.sideExp = null; }
    else if (meta.simple) { meta.simple = false; delete meta.simpleBak; }
    await saveMeta();
    app.refreshNow?.();
}

// ───── 톱니 창 ─────
function menuHTML() {
    const meta = getMeta(), w = whereNow();
    const on = SIMPLE_EXTRA.filter(id => modOn(id, meta)).length;
    return `<div class="ss-sm-head"><b>🍙 심플 모드</b><small>타일을 누르면 자세히 · 직접 고칠 수 있어요</small></div>
        <div class="ss-sm-row"><button class="ss-btn ${meta?.paused ? 'pri' : ''}" data-sm="pause"><i class="fa-solid ${meta?.paused ? 'fa-play' : 'fa-pause'}"></i> ${meta?.paused ? '재개하기' : '일시정지'}</button><button class="ss-btn" data-sm="sheet"><i class="fa-solid fa-table-cells-large"></i> 한눈에 보기</button><button class="ss-btn" data-sm="help"><i class="fa-solid fa-circle-question"></i> 도우미</button></div>
        <section class="ss-sm-sec"><h4>보이는 곳 <small>모든 채팅에 같이 걸려요</small></h4>
            <div class="ss-seg wrap stack">${Object.entries(WHERE).map(([k, v]) => `<button class="${w === k ? 'on' : ''}" data-sm="where:${k}"><i class="fa-solid ${v.icon}"></i> ${v.name}<small>${v.desc}</small></button>`).join('')}</div>
            ${w === 'both' ? '<p class="ss-hint">지금은 채팅 위와 옆 둘 다 보여요. 하나를 고르면 그쪽만 남아요.</p>' : ''}</section>
        <section class="ss-sm-sec"><h4>기능 더 켜기 <small>칸 하나씩 · AI 0회</small></h4>
            <div class="ss-sm-mods">${SIMPLE_EXTRA.map(id => `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-sm-mod="${id}" ${modOn(id, meta) ? 'checked' : ''}><span><i class="fa-solid ${MOD[id].icon}"></i> ${esc(MOD[id].name)}<small>${esc(MOD[id].desc)}</small></span></label>`).join('')}</div>
            ${on >= MANY ? '<p class="ss-hint">칸이 꽤 늘었어요 — 이쯤이면 탭이 있는 기본 모드가 더 편할 수 있어요.</p>' : ''}</section>
        <section class="ss-sm-sec"><h4>더 많이 쓰고 싶을 때</h4>
            <div class="ss-sm-row"><button class="ss-btn" data-sm="widen"><i class="fa-solid fa-up-right-and-down-left-from-center"></i> 기본 모드로 넓히기</button></div>
            <p class="ss-hint">연락 · 상점 · 본거지 · 꾸미기처럼 탭이 있어야 쓰는 기능은 기본 모드에 있어요. 넓혀도 지금 내용은 그대로고, 언제든 심플로 돌아올 수 있어요.</p></section>
        <section class="ss-sm-sec"><h4>다시 만들기 · 삭제</h4>
            <div class="ss-sm-row"><button class="ss-btn" data-sm="wizard"><i class="fa-solid fa-wand-magic-sparkles"></i> 처음부터 다시 만들기</button><button class="ss-btn danger" data-sm="reset"><i class="fa-solid fa-trash-can"></i> 이 채팅 상태창 삭제</button></div></section>`;
}
let menuOpen = false;
export async function openSimpleMenu() {
    if (menuOpen || !isSimple()) return;
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-simple-menu';
    const draw = () => { if (el.isConnected && !isSimple()) return close(); el.innerHTML = menuHTML(); };
    const close = () => el.closest('dialog')?.querySelector('.popup-button-ok')?.click();
    el.addEventListener('change', async (e) => {
        const i = e.target.closest('[data-sm-mod]'); if (!i) return;
        i.disabled = true;
        try { await setExtra(i.dataset.smMod, i.checked); } finally { draw(); }
    });
    el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-sm]'); if (!b) return;
        const a = b.dataset.sm;
        try {
            if (a.startsWith('where:')) { setWhere(a.slice(6)); return draw(); }
            if (a === 'pause') { await app.togglePause?.(); return draw(); }
            if (a === 'sheet') { close(); return void setTimeout(() => app.newSheet?.('home'), 150); }
            if (a === 'help') { close(); return void setTimeout(() => openHelp(), 150); }
            if (a === 'wizard') { close(); return void setTimeout(() => openWizard(), 150); }
            if (a === 'widen') { if (await widen()) { close(); setTimeout(() => app.newSheet?.('manage'), 200); } return; }
            if (a === 'reset') { await app.resetChat?.(); if (!getMeta()?.base) close(); return; }
        } catch (err) { ssWarn(LOG, 'simple menu', a, err); toastr.error('처리하지 못했어요. 다시 눌러 주세요.', TITLE); }
    });
    draw();
    menuOpen = true;
    try { await popup(el, {}); } finally { menuOpen = false; }
}
