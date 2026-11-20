// 화면은 셋뿐: HUD · 미니바 · 전체화면 — 여기는 늘 떠 있는 HUD · 미니바 · 답 밑 칩만.
//   펼친 폰 화면(sheet.js)과 앱들(tabs · home · tools …)은 처음 열 때 불러와서, 실리태번을 켤 때 받는 코드를 줄인다.
import { app, ctx, settings, getMeta, modOn, ready, msgData, VERSION } from '../base/st.js';
import { esc, dateText, periodName, short, fmt } from '../base/util.js';
import { fold, derived, needStage } from '../rules/engine.js';
import { placeOf } from '../rules/book.js';
import { applyGloss, glossList } from '../base/gloss.js';
import { applyTr, trSig } from '../extra/trgate.js';
// 번역 사전 · 용어집이 바뀌면 같은 글이어도 다시 칠함
const paintKey = (h) => `${h}|${trSig()}|${glossList().length}`;
import { chip, bar, layerHost } from './kit.js';
import { mascot } from './mascot.js';
import { isWaiting } from '../rules/classify.js';

// ───── 펼친 화면은 필요할 때 불러오기 ─────
let SH = null, loading = null;
export const sheetLoaded = () => !!SH;
// 🎨 펼친 화면 CSS(sheet.css)도 처음 열 때 같이 (다 받은 뒤에 그려서 맨 화면이 번쩍이지 않게)
let cssP = null;
export function sheetCss() {
    return (cssP ??= new Promise((ok) => {
        if (document.getElementById('ml-sheet-css')) return ok();
        const l = Object.assign(document.createElement('link'), { id: 'ml-sheet-css', rel: 'stylesheet', href: new URL(`../../sheet.css?v=${VERSION}`, import.meta.url).href });
        l.onload = l.onerror = () => ok(); document.head.appendChild(l);
    }));
}
export function loadSheet() { if (SH) return Promise.resolve(SH); loading ??= Promise.all([import('./sheet.js'), sheetCss()]).then(([m]) => (SH = m)); return loading; }
export function openSheet(tab = 'home') { if (SH) return SH.openSheet(tab); return loadSheet().then(m => m.openSheet(tab)); }
export function drawSheet() { if (SH && document.getElementById('ml-full')) SH.drawSheet(); }
export function closeSheet() { if (SH) return SH.closeSheet(); document.getElementById('ml-full')?.remove(); document.body.classList.remove('ml-open'); }
export function openPast(i) { return loadSheet().then(m => m.openPast(i)); }
export function turnSheet(i) { return loadSheet().then(m => m.turnSheet(i)); }
export const redraw = () => drawSheet();
// 바깥(HUD · 미니바 · 답 밑 칩 · 패널 밖 시트)에서 누른 것 → 앱 쪽 처리는 불러와서
const onAct = async (...a) => (await Promise.all([import('./tabs.js'), sheetCss()]))[0].onAct(...a); // 칩 · 미니바에서 연 작은 창도 앱 CSS가 필요


// ───── HUD: 한 줄 (욕구 · 돈 · 시간 · 장소 · 가게 한 줄) ─────
function hudHTML(r) {
    const { S, book } = r, L = [];
    if (modOn('stats')) for (const n of book.me.needs) { const v = Math.round(S.needs[n.key] ?? 0), st = needStage(v); L.push(`<span class="ml-h ${st === '위험' ? 'bad' : st === '주의' ? 'mid' : ''}" title="${esc(n.name)} ${v}">${n.icon}${v}</span>`); }
    if (modOn('wallet')) L.push(`<span class="ml-h">💰${fmt(S.cash)}</span>`);
    if (modOn('calendar')) L.push(`<span class="ml-h">🕰${periodName(S.t)}${S.weather ? ` · ${esc(S.weather)}` : ''}</span>`);
    if (modOn('map') && S.loc) { const pl = placeOf(book, S.loc); L.push(`<span class="ml-h tap" data-act="open" data-v="${pl?.goods.length ? 'bag' : 'map'}">📍${esc(S.loc)}${pl?.goods.length ? ' · 🛒' : ''}</span>`); }
    // 🛒 가게에 있으면 HUD에 물건 한 줄 (누르면 사는 말이 입력창에)
    if (modOn('wallet') && S.loc) { const pl = placeOf(book, S.loc); if (pl?.goods.length) L.push(...pl.goods.slice(0, 3).map(g => `<span class="ml-h tap shop${S.cash < g.price ? ' poor' : ''}" data-act="say" data-v="${esc(g.name)} 하나 주세요.">${esc(g.name)} ${g.price}</span>`)); }
    if (S.status.length) L.push(`<span class="ml-h">🏷${S.status.length}</span>`);
    // 🔤 토큰 계기판: 이번 턴 본편 주입 · 분류 모델에 보낸 토큰(B) · 걸린 시간 (작게)
    const pt = app.perfLast?.();
    if (pt) {
        const title = `이번 턴: 본편 주입 ≈${pt.tok}토큰${pt.cls ? ` · 분류 모델에 보냄 ≈${pt.cls}토큰 (${pt.calls}회)` : ''} · ${pt.ms.toFixed(0)}ms`;
        L.push(`<span class="ml-h meter" title="${title}">🔤${pt.tok}${pt.cls ? ` · 🧭${pt.cls}` : ''}</span>`);
    }
    return L.join('');
}
// ───── 미니바: 접힌 사이드 모양 · 「펼치기」 → 전체화면 ─────
function miniHTML(r) {
    const { S, book } = r;
    const needs = modOn('stats') ? book.me.needs.map(n => { const v = Math.round(S.needs[n.key] ?? 0); return `<div class="ml-mb-n" title="${esc(n.name)}">${n.icon}${bar(v, needStage(v) === '위험' ? 'bad' : '')}</div>`; }).join('') : '';
    // 😺 미트볼 표정: 위험 → 슬픔 · 방금 단계가 오름 → 파티 · 돈이 바닥 → 생각 · 밤 → 잠 (지금 상태만 봄 · 저장 0)
    const night = /심야|밤/.test(periodName(S.t)), last = r.changes?.[r.changes.length - 1] ?? [], idle = settings().mascotPick === 'idle' || !settings().mascotPick;
    const face = derived(book, S).some(d => d.stage === '위험') ? 'sad'
        : !idle ? ''
        : last.some(c => /^stage\./.test(c.f) && !c.f.startsWith('stage.need') && c.why === '단계가 올랐어요') ? 'party'
        : modOn('wallet') && S.cash <= 0 ? 'think'
        : night ? 'sleep' : '';
    return `${mascot('sm', face, 'ml-mascot')}${needs}<div class="ml-mb-t">${dateText(book.world.start, S.t, false)}</div><button class="ml-btn sm" data-act="open" data-v="now">펼치기</button>`;
}
export function drawFrame() {
    const meta = getMeta(), on = settings().enabled && ready() && !meta?.off && !meta?.setup;
    let hud = document.getElementById('ml-hud'), mb = document.getElementById('ml-mini');
    // 설정집이 없거나 앱을 고르는 중이면 HUD · 미니바에 한 줄만
    if (settings().enabled && !on && ctx().chatMetadata && !meta?.off && (ctx().chat?.length || ctx().getCurrentChatId?.())) {
        const line = meta?.setup && ready() ? '🛍️ 쓸 앱 고르기' : '📘 설정집 만들기';
        const one = `<button class="ml-h tap ml-first-line" data-act="open" data-v="home">${line}</button>`;
        if (settings().hud) {
            if (!hud) { hud = document.createElement('div'); hud.id = 'ml-hud'; hud.className = 'ml-scope'; (document.getElementById('sheld') ?? document.body).prepend(hud); }
            if (hud.dataset.h !== one) { hud.innerHTML = one; hud.dataset.h = one; }
        } else hud?.remove();
        if (settings().minibar) {
            if (!mb) { mb = document.createElement('div'); mb.id = 'ml-mini'; mb.className = 'ml-scope'; layerHost().appendChild(mb); }
            const h = `${mascot('sm', '', 'ml-mascot')}<button class="ml-btn sm" data-act="open" data-v="home">${line}</button>`; if (mb.innerHTML !== h) mb.innerHTML = h;
        } else mb?.remove();
        return;
    }
    if (!on) { hud?.remove(); mb?.remove(); return; }
    const r = fold(); if (!r) return;
    if (settings().hud) {
        if (!hud) { hud = document.createElement('div'); hud.id = 'ml-hud'; hud.className = 'ml-scope'; const host = document.getElementById('sheld') ?? document.body; settings().hudPos === 'bottom' ? (document.getElementById('form_sheld') ?? host).before(hud) : host.prepend(hud); }
        const h = `<button class="ml-h tap" data-act="open" data-v="home">😼</button>${hudHTML(r)}${getMeta().paused ? '<span class="ml-h bad">⏸</span>' : ''}`;
        if (hud.dataset.h !== paintKey(h)) { hud.innerHTML = h; hud.dataset.h = paintKey(h); applyTr(hud); applyGloss(hud); }
    } else hud?.remove();
    if (settings().minibar) {
        if (!mb) { mb = document.createElement('div'); mb.id = 'ml-mini'; mb.className = 'ml-scope'; layerHost().appendChild(mb); }
        const h = miniHTML(r); if (mb.innerHTML !== h) mb.innerHTML = h;
    } else mb?.remove();
}
// 바깥(HUD · 미니바) 누르기
export function bindOuter() {
    document.addEventListener('click', (e) => {
        const a = e.target.closest('#ml-hud [data-act], #ml-mini [data-act]'); if (!a) return;
        if (a.dataset.act === 'open') openSheet(a.dataset.v);
        if (a.dataset.act === 'say') onAct('say', a.dataset.v, a);
    });
    document.addEventListener('click', async (e) => {
        const a = e.target.closest('.ml-bs [data-act], .ml-msg [data-act]');
        if (!a || a.closest('#ml-full')) return;
        /* 패널 안 시트는 패널이 처리 */ if (a.dataset.act === 'turncard') return turnSheet(Number(a.dataset.v));
        const [T] = await Promise.all([import('./tools.js'), sheetCss()]);
        if (T.TOOL_ACTS.has(a.dataset.act)) {
            a.closest('.ml-bs')?.remove();
            return T.onTool(a.dataset.act, a.dataset.v);
        }
        await onAct(a.dataset.act, a.dataset.v, a);
    });
}
// ───── 답 밑 칩: 보이는 최근 메시지에만 ─────
const CHIP_N = 6;
let chipLast = { r: null, n: -1, w: '', boxes: -1 };
export function drawChips() {
    const r = fold(); const chat = ctx().chat ?? [];
    // 🏎 계산 결과 · 메시지 수 · 기다리는 분류 · 붙은 칩 수가 그대로면 아무것도 안 함 (답마다 12개 메시지를 다시 훑던 것)
    const wk = chat.slice(-CHIP_N * 2).map((_, k) => (isWaiting(chat.length - CHIP_N * 2 + k) ? 1 : 0)).join(''), boxes = document.querySelectorAll('.ml-msg').length;
    if (r && r === chipLast.r && chat.length === chipLast.n && wk === chipLast.w && boxes === chipLast.boxes && !getMeta()?.off && settings().enabled) return;
    document.querySelectorAll('.ml-msg').forEach(x => { const i = Number(x.closest('.mes')?.getAttribute('mesid')); if (!(i >= chat.length - CHIP_N * 2)) x.remove(); });
    if (getMeta()?.off || !settings().enabled || !r) { document.querySelectorAll('.ml-msg').forEach(x => x.remove()); return; } // 「켜기(모든 채팅)」를 끄면 붙어 있던 칩도 뗌
    for (let i = Math.max(0, chat.length - CHIP_N * 2); i < chat.length; i++) {
        const el = document.querySelector(`#chat .mes[mesid="${i}"] .mes_text`); if (!el) continue;
        const ch = (r.changes[i] ?? []).filter(c => c.src !== 'time' && c.src !== 'hand' && !c.hand), fl = (r.flags[i] ?? []); // ✋ 직접 고친 값은 답 밑 칩에 안 붙임 (이야기에서 생긴 일이 아님 · 기록엔 ✋로 남음)
        let box = el.parentElement.querySelector('.ml-msg');
        const sl = msgData(chat[i]), wait = isWaiting(i), failed = !wait && sl?.clsFail, B = !chat[i].is_user && sl?.src === 'cls' && !wait && !failed;
        // ✓ 셈한 답인데 바뀐 게 없으면 「변화 없음」 칩 (안 붙은 건지 · 없던 건지 헷갈리지 않게) · B면 🔄로 다시 고르기
        const read = !chat[i].is_user && !sl?.skip && (B || sl?.ops?.length || /<meatball>/i.test(chat[i].mes ?? '') || sl?.src === 'tag');
        if (!ch.length && !fl.length && !wait && !failed && !read) { box?.remove(); continue; }
        const cls = wait ? chip('…', 'mid') : failed ? chip('⚠ 분류 실패 · 다시', 'bad', 'cls-redo', String(i)) : B ? chip('🔄', 'mid', 'cls-redo', String(i)) : '';
        const none = !ch.length && !fl.length && !wait && !failed ? chip('✓ 변화 없음', 'good', 'turncard', String(i)) : '';
        const h = cls + none + fl.map(f => chip(`⚠ 확인 필요 · ${esc(short(f.text, 24))}`, 'bad')).join('') + ch.slice(0, 8).map(c => chip(`${c.icon} ${esc(c.label)} ${typeof c.to === 'number' && typeof c.from === 'number' ? (c.f === 'time' ? '' : signed2(c.to - c.from)) : esc(c.to)}`
            + `${c.why ? ` · ${esc(short(c.why, 12))}` : ''}`, c.kind === 'bad' || (typeof c.to === 'number' && c.to < c.from) ? 'bad' : 'good', 'turncard', String(i))).join('') + (ch.length > 8 ? chip(`+${ch.length - 8}`, 'mid', 'turncard', String(i)) : '');
        if (!box) { box = document.createElement('div'); box.className = 'ml-msg ml-scope'; el.after(box); }
        if (box.dataset.h !== paintKey(h)) { box.innerHTML = h; box.dataset.h = paintKey(h); applyTr(box); applyGloss(box); }
    }
    chipLast = { r, n: chat.length, w: wk, boxes: document.querySelectorAll('.ml-msg').length };
}
const signed2 = (n) => (n > 0 ? `+${Math.round(n)}` : `−${Math.abs(Math.round(n))}`);