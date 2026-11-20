// 화면은 셋뿐: HUD · 미니바 · 전체화면
import { app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, ready, msgData, TITLE, MODS, setEyes, shut } from '../base/st.js';
import { esc, dateText, periodName, short, fmt, clockText, DAY } from '../base/util.js';
import { fold, derived, needStage } from '../rules/engine.js';
import { placeOf } from '../rules/book.js';
import { RENDER, onAct, changeRow, setRecFilter, setRecView } from './tabs.js';
import { home, market, cat, look, appOf, installed, markSeen, firstView, setupView, homeCfg, homeEditing, setHomeEdit, wallCss, setMktTab } from './home.js';
import { renderExt, setAppsChange, installApp } from '../extra/apps.js';
import { resetCal } from './calplus.js';
import { loveAct } from './love.js';
import { bindHomeEdit } from './homeedit.js';
import { toolbar, onTool, TOOL_ACTS, applyGloss } from './tools.js';
import { applyTr, trOn, trBusy } from '../extra/translate.js';
import { chip, sheet, bar, toast, layerHost, resetLayerHost } from './kit.js';

import { mascot } from './mascot.js';
import { isWaiting } from '../rules/classify.js';
import { chipCheck } from '../extra/doctor.js';
let cur = 'home', past = null;

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
        if (hud.dataset.h !== h) { hud.innerHTML = h; hud.dataset.h = h; applyGloss(hud); applyTr(hud); }
    } else hud?.remove();
    if (settings().minibar) {
        if (!mb) { mb = document.createElement('div'); mb.id = 'ml-mini'; mb.className = 'ml-scope'; layerHost().appendChild(mb); }
        const h = miniHTML(r); if (mb.innerHTML !== h) mb.innerHTML = h;
    } else mb?.remove();
}
// ───── 전체화면 ─────
setAppsChange(() => { if (document.getElementById('ml-full') && (cur === 'home' || cur === 'market')) drawSheet(); });
export function openSheet(tab = 'home') {
    if (tab === 'now' && !document.getElementById('ml-full')) tab = 'home';
    if (tab === 'cal') resetCal();
    cur = tab; past = null;
    let el = document.getElementById('ml-full');
    if (!el) {
        el = document.createElement('div'); el.id = 'ml-full'; el.className = 'ml-scope';
        resetLayerHost(); layerHost().appendChild(el); // body가 fixed 기준을 바꾸면 <html>에 (아이폰 · 테마 · 다른 확장)
        el.addEventListener('click', clickHandler);
        el.addEventListener('change', changeHandler);
        bindHomeEdit(el); // ✏️ 꾹 누르기 · 끌어서 순서
    }
    document.body.classList.add('ml-open');
    try { drawSheet(); } catch (e) {
        // 그리다 실패해도 빈 화면이 아니라 무엇이 잘못됐는지 보이게 (📋로 복사해서 보내 줄 수 있음)
        console.error(`[${TITLE}] 화면 그리기 실패`, e);
        el.innerHTML = `<header class="ml-top"><b>${TITLE}</b><span class="ml-sp"></span><button class="ml-ib" data-act="report" title="전체 복사">📋</button><button class="ml-ib" data-act="close">✕</button></header>`
            + `<main class="ml-body"><div class="ml-hint">⚠ 화면을 그리다 멈췄어요. 위 📋를 눌러 복사해서 보내 주세요.</div><pre class="ml-err">${esc(String(e?.stack || e)).slice(0, 1200)}</pre></main>`;
    }
}
export function closeSheet() { document.getElementById('ml-full')?.remove(); document.body.classList.remove('ml-open'); }
export function drawSheet() {
    const el = document.getElementById('ml-full'); if (!el) return;
    if (!ctx().chatMetadata) { closeSheet(); return; }
    const meta0 = getMeta(), r = fold();
    if (!r || meta0?.setup) {
        // 📘 설정집이 없으면 설정집 하나만 · 🛍️ 만든 뒤에는 쓸 앱 고르기 한 화면
        el.innerHTML = `<header class="ml-top">${mascot('head')}<b>${r ? '🛍️ 쓸 앱 고르기' : TITLE}</b><span class="ml-sp"></span><button class="ml-ib" data-act="report" title="전체 복사">📋</button><button class="ml-ib" data-act="close">✕</button></header>`
            + `<main class="ml-body" data-tab="${r ? 'setup' : 'first'}">${r ? setupView(r) : firstView()}</main>`;
        return;
    }
    const R2 = { ...RENDER, home, market, cat, look };
    const xa = String(cur).startsWith('x:') ? appOf(cur) : null;
    if (!xa && (!R2[cur] || (appOf(cur) && !installed(appOf(cur))))) cur = 'home';
    const view = past != null ? { ...r, S: r.stateAt(past) ?? r.S } : r;
    const meta = getMeta(), a = appOf(cur);
    const keep = el.querySelector(':scope > .ml-bs'); // 열려 있는 시트는 다시 그려도 그대로
    const scroll = el.querySelector('.ml-body')?.scrollTop ?? 0, same = el.querySelector('.ml-body')?.dataset.tab === cur;
    if (cur !== 'home' && homeEditing()) setHomeEdit(false);
    const L = settings().look, wall = wallCss(L);
    el.classList.toggle('home', cur === 'home'); el.classList.toggle('has-wall', !!wall); el.classList.toggle('editing', cur === 'home' && homeEditing());
    el.classList.toggle('tone', (L.icons ?? 'color') === 'tone');
    el.classList.toggle('left', (L.side ?? 'left') === 'left');
    el.classList.toggle('dark-wall', !!wall && (L.wall === 'night' || (L.wallDim ?? 0) >= 35));
    el.style.setProperty('--ml-wall', wall || 'none'); el.style.setProperty('--ml-wdim', `${(L.wallDim ?? 0) / 100}`);
    if (cur === 'home') {
        el.innerHTML = statusBar(view, meta) + `<main class="ml-body" data-tab="home">${home(view)}</main>`;
        applyGloss(el.querySelector('.ml-body')); applyTr(el.querySelector('.ml-body'));
        if (keep) el.appendChild(keep);
        if (same) el.querySelector('.ml-body').scrollTop = scroll;
        return;
    }
    if (xa) { // 🧩 기타 앱: 앱이 그린 화면은 다시 그리지 않음 (앱 쪽 상태 지키기)
        if (same && el.querySelector('.ml-ext')) return;
        el.innerHTML = `<header class="ml-top"><button class="ml-ib back" data-tab="home" title="홈">‹</button><b>${esc(xa.icon)} ${esc(xa.name)}</b><span class="ml-sp"></span>`
            + `<button class="ml-ib" data-act="close">✕</button></header><main class="ml-body" data-tab="${esc(cur)}"><div class="ml-ext"></div></main>`;
        renderExt(el.querySelector('.ml-ext'), xa, Object.freeze({ close: closeSheet, redraw: () => { el.querySelector('.ml-ext')?.remove(); drawSheet(); }, toast: (t) => toast(String(t)) }));
        if (keep) el.appendChild(keep);
        return;
    }
    el.innerHTML = `<header class="ml-top"><button class="ml-ib back" data-tab="home" title="홈">‹</button><b>${a ? `${a.icon} ${a.name}` : ''}</b>`
        + `${past != null ? chip(`🕰 #${past} 시점 · 읽기 전용`, 'mid', 'past-off') : ''}<span class="ml-sp"></span><button class="ml-ib${meta.paused || meta.skipNext || eyesShut().length ? ' on' : ''}" data-act="pause" `
        + `title="멈춤 · 건너뛰기 · 😌 눈 감기">${pauseLabel(meta)}</button><button class="ml-ib" data-act="find" title="검색">🔍</button><button class="ml-ib" data-act="report" title="📋 전체 복사">📋</button><button class="ml-ib" data-act="close">✕</button></header>`
        + `<main class="ml-body" data-tab="${cur}">${a && !a.sys ? toolbar(cur) : ''}${past != null && cur === 'now' ? thenNow(view.S, r) : ''}${R2[cur](view)}</main>`;
    applyGloss(el.querySelector('.ml-body')); applyTr(el.querySelector('.ml-body'));
    if (trOn() && trBusy()) el.querySelector('.ml-sp')?.insertAdjacentHTML('beforebegin', '<span class="ml-pill">🌐 번역 중…</span>');
    if (a && !a.sys) markSeen(cur, r);
    if (keep) el.appendChild(keep);
    if (same) el.querySelector('.ml-body').scrollTop = scroll;
}
async function clickHandler(e) {
    const t = e.target.closest('[data-tab]'); if (t && t.tagName === 'BUTTON') { cur = t.dataset.tab; drawSheet(); return; }
    const o = e.target.closest('[data-act="open"]'); if (o && !e.target.closest('[data-act]:not([data-act="open"])')) { if (o.dataset.v === 'cal' && cur !== 'cal') resetCal(); cur = o.dataset.v; drawSheet(); el0()?.querySelector('.ml-body')?.scrollTo(0, 0); return; }
    const s = e.target.closest('.ml-seg button'); if (s) { const name = s.parentElement.dataset.seg, v = s.dataset.v, meta = getMeta();
        if (name === 'mkt') { setMktTab(v); drawSheet(); return; }
        if (name === 'v:rec') { setRecView(v); drawSheet(); return; } // 보기만 바꿈 · 저장 안 함
        if (name === 'hide') meta.hideNums = v === '1';
        if (name === 'scope') { meta.influence = v === 'chat' ? structuredClone(settings().influence) : null; }
        if (name === 'recf') setRecFilter(v);
        if (name === 'relv') meta.relView = v;
        if (name === 'mindmode') meta.mindMode = v;
        saveMeta(); drawSheet(); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act, v = a.dataset.v;
    if (TOOL_ACTS.has(act)) return onTool(act, v);
    const meta = getMeta();
    if (act === 'close') return closeSheet();
    if (act === 'pause') return pauseMenu();
    if (act === 'cc') return controlCenter();
    if (act === 'cc-open') { document.querySelector('.ml-bs')?.remove(); cur = v; drawSheet(); return; }
    if (act === 'home-edit') { document.querySelector('.ml-bs')?.remove(); cur = 'home'; setHomeEdit(true); drawSheet(); return; }
    if (act === 'x-home') { const H = homeCfg(); H.extOff = H.extOff.includes(v) ? H.extOff.filter(x => x !== v) : [...H.extOff, v]; saveSettings(); drawSheet(); return; }
    if (act === 'x-reload') { location.reload(); return; }
    if (act === 'love-up' || act === 'love-down') { loveAct(act, v); return; }
    if (act === 'x-install') { a.disabled = true; a.textContent = '설치 중…'; try { await installApp(v); toast('설치했어요 · 새로 고침하면 켜져요', 'good'); } catch (e) { toast(`⚠ ${e.message}`, 'bad'); } drawSheet(); return; }
    if (act === 'home-done') { setHomeEdit(false); drawSheet(); return; }
    if (act === 'w-toggle') { const H = homeCfg(); H.hidden = H.hidden.includes(v) ? H.hidden.filter(x => x !== v) : [...H.hidden, v]; saveSettings(); drawSheet(); return; }
    if (homeEditing() && a.closest('.ml-app')) return; // 편집 중엔 앱을 열지 않음
    if (act === 'p-off') { document.querySelector('.ml-bs')?.remove(); app.setChatOff?.(true); return; }
    if (act === 'p-all') { meta.paused = !meta.paused; saveMeta(); app.refresh(); return pauseMenu(); }
    if (act === 'skip' || act === 'p-skip') { meta.skipNext = !meta.skipNext; saveMeta(); drawSheet(); return pauseMenu(); }
    if (act === 'eye') { const [mod, mode] = String(v).split('|'); setEyes(mod, mode); app.refresh(); return pauseMenu(); }
    if (act === 'past-off') { past = null; drawSheet(); return; }
    if (act === 'find') return app.find?.();
    await onAct(act, v, a);
}
function changeHandler(e) {
    const wf = e.target.closest?.('[data-wallfile]'); if (wf) { wallUpload(wf.files?.[0]); return; }
    const lk = e.target.closest('[data-look]'); if (lk) { const L = settings().look, k = lk.dataset.look; L[k] = lk.type === 'range' ? Number(lk.value) : lk.value; saveSettings(); app.applyLook?.(); drawSheet(); return; }
    const g = e.target.closest('[data-gauge]'); if (!g) return;
    const meta = getMeta(), tgt = meta.influence ?? settings().influence, id = g.dataset.gauge, v = Number(g.value);
    if (id === 'all') tgt.all = v; else { tgt.by ??= {}; tgt.by[id] = v - (tgt.all ?? 2); }
    meta.influence ? saveMeta() : ctx().saveSettingsDebounced();
    drawSheet(); app.inject?.();
}
// 🕰 그때 ↔ 지금: 그때 상태와 지금 상태의 차이 한 장 (보기만 · 저장 0)
function thenNow(T, r) {
    const N = r.S, book = r.book, L = [];
    const d = (a, b) => { const x = Math.round(b - a); return x ? `<b class="${x > 0 ? 'pos' : 'neg'}">${x > 0 ? '+' : '−'}${fmt(Math.abs(x))}</b>` : ''; };
    if (T.loc !== N.loc) L.push(`<div class="ml-rl"><i>📍</i>${esc(T.loc || '-')} → <b>${esc(N.loc || '-')}</b></div>`);
    if (modOn('wallet') && T.cash !== N.cash) L.push(`<div class="ml-rl"><i>💰</i>${fmt(T.cash)} → ${fmt(N.cash)} ${esc(book.world.currency)} ${d(T.cash, N.cash)}</div>`);
    if (modOn('stats')) for (const n of book.me.needs) { const a = T.needs[n.key] ?? 0, b = N.needs[n.key] ?? 0; if (Math.round(a) !== Math.round(b)) L.push(`<div class="ml-rl"><i>${n.icon}</i>${esc(n.name)} ${Math.round(a)} → ${Math.round(b)} ${d(a, b)}</div>`); }
    if (modOn('rel')) for (const [n, x] of Object.entries(N.rel)) { const t = T.rel[n]; if (!t) { L.push(`<div class="ml-rl"><i>👤</i>${esc(n)} <span>그 뒤에 만남</span></div>`); continue; } if (t.aff !== x.aff) L.push(`<div class="ml-rl"><i>💗</i>${esc(n)} 애정 ${t.aff} → ${x.aff} ${d(t.aff, x.aff)}</div>`); }
    const gone = T.items.filter(it => !N.items.some(x => x.name === it.name)).map(it => it.name), got = N.items.filter(it => !T.items.some(x => x.name === it.name)).map(it => it.name);
    if (modOn('wallet') && (gone.length || got.length)) L.push(`<div class="ml-rl"><i>👜</i>${got.length ? `생김 ${got.slice(0, 5).map(esc).join(' · ')}` : ''}${gone.length ? ` <span>없어짐 ${gone.slice(0, 5).map(esc).join(' · ')}</span>` : ''}</div>`);
    const days = Math.floor(N.t / DAY) - Math.floor(T.t / DAY);
    return `<section class="ml-sec"><h4>그때 → 지금 <span>${days > 0 ? `${days}일 지남` : '같은 날'}</span></h4><div class="ml-card ml-thennow">${L.join('') || '<div class="ml-rl dim"><i>·</i>달라진 게 없어요</div>'}</div></section>`;
}
export function openPast(i) { openSheet('now'); past = i; drawSheet(); }
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
        if (TOOL_ACTS.has(a.dataset.act)) {
            a.closest('.ml-bs')?.remove();
            return onTool(a.dataset.act, a.dataset.v);
        }
        await onAct(a.dataset.act, a.dataset.v, a);
    });
}
// ───── 답 밑 칩: 보이는 최근 메시지에만 ─────
const CHIP_N = 6;
export function drawChips() {
    const r = fold(); const chat = ctx().chat ?? [];
    document.querySelectorAll('.ml-msg').forEach(x => { const i = Number(x.closest('.mes')?.getAttribute('mesid')); if (!(i >= chat.length - CHIP_N * 2)) x.remove(); });
    if (getMeta()?.off) { document.querySelectorAll('.ml-msg').forEach(x => x.remove()); return; }
    if (!r || !settings().enabled) return;
    for (let i = Math.max(0, chat.length - CHIP_N * 2); i < chat.length; i++) {
        const el = document.querySelector(`#chat .mes[mesid="${i}"] .mes_text`); if (!el) continue;
        const ch = (r.changes[i] ?? []).filter(c => c.src !== 'time'), fl = (r.flags[i] ?? []);
        let box = el.parentElement.querySelector('.ml-msg');
        const sl = msgData(chat[i]), wait = isWaiting(i), failed = !wait && sl?.clsFail, B = !chat[i].is_user && sl?.src === 'cls' && !wait && !failed;
        if (!ch.length && !fl.length && !wait && !failed) { box?.remove(); continue; }
        const cls = wait ? chip('…', 'mid') : failed ? chip('⚠ 분류 실패 · 다시', 'bad', 'cls-redo', String(i)) : B ? chip('🔄', 'mid', 'cls-redo', String(i)) : '';
        const h = cls + fl.map(f => chip(`⚠ 확인 필요 · ${esc(short(f.text, 24))}`, 'bad')).join('') + ch.slice(0, 8).map(c => chip(`${c.icon} ${esc(c.label)} ${typeof c.to === 'number' && typeof c.from === 'number' ? (c.f === 'time' ? '' : signed2(c.to - c.from)) : esc(c.to)}`
            + `${c.why ? ` · ${esc(short(c.why, 12))}` : ''}`, c.kind === 'bad' || (typeof c.to === 'number' && c.to < c.from) ? 'bad' : 'good', 'turncard', String(i))).join('') + (ch.length > 8 ? chip(`+${ch.length - 8}`, 'mid', 'turncard', String(i)) : '');
        if (!box) { box = document.createElement('div'); box.className = 'ml-msg ml-scope'; el.after(box); }
        if (box.dataset.h !== h) { box.innerHTML = h; box.dataset.h = h; applyTr(box); }
    }
}
const signed2 = (n) => (n > 0 ? `+${Math.round(n)}` : `−${Math.abs(Math.round(n))}`);
export function turnSheet(i) { const r = fold(); sheet(`#${i} 이번 답에서 바뀐 것`, `<div class="ml-card">${(r.changes[i] ?? []).filter(c => c.src !== 'time').map(c => changeRow(c, i)).join('')}</div><details class="ml-det"><summary>🔍 칩 점검 · 줄마다 어떻게 읽혔나</summary>${chipCheck(i)}</details>`); }
const el0 = () => document.getElementById('ml-full');

// ───── ⏸ 멈춤 메뉴: 전체 멈춤 · 다음 1번 건너뛰기 · 😌 앱마다 눈 감기 (깔린 앱만) ─────
const EYE_MODS = ['stats', 'wallet', 'rel', 'map', 'calendar', 'dice', 'music', 'quote', 'mind', 'news', 'custom'];
const EYE_WHAT = { stats: '욕구 · 상태 딱지', wallet: '돈 · 물건 · 옷', rel: '애정 · 기억 · 새 인물', map: '장소 · 같이 있는 사람', calendar: '시간 · 날씨 · 약속', dice: '판정',
    music: '추천 곡', quote: '한 구절', mind: '속마음', news: '화면 밖 소식', custom: '내 탭' };
function eyesShut() { const m = getMeta(); return EYE_MODS.filter(id => modOn(id) && m?.eyes?.[id]); }
function pauseLabel(meta) {
    if (meta.paused) return '⏸ 멈춤';
    const n = eyesShut().length;
    return `${meta.skipNext ? '⏭ ' : ''}${n ? `😌${n}` : '⏸'}`;
}
function pauseMenu() {
    const meta = getMeta(); if (!meta) return;
    const row = (act, v, icon, title, sub, on) => `<div class="ml-row tap" data-act="${act}" data-v="${v}"><span class="ml-ic">${icon}</span><span class="ml-tx"><b>${title}</b><small>${sub}</small></span>`
        + `<span class="ml-val">${on ? '<b class="ml-pill bad">켜짐</b>' : '<small>꺼짐</small>'}</span></div>`;
    const seg = (id) => { const e = meta.eyes?.[id]?.mode ?? ''; return [['', '뜸'], ['once', '다음 1번'], ['on', '계속']].map(([k, n]) => `<button class="ml-btn xs${e === k ? ' on' : ''}" data-act="eye" data-v="${id}|${k}">${n}</button>`).join(''); };
    const apps = MODS.filter(m => EYE_MODS.includes(m.id) && modOn(m.id));
    const html = `<div class="ml-card">${row('p-all', '', '⏸', '전체 멈춤', '미트볼이 쉬어요: 본편에 아무것도 안 넣고 · 분류 모델도 안 부르고 · 칩도 안 붙여요', meta.paused)}`
        + `${row('p-skip', '', '⏭', '다음 답 1번 건너뛰기', '다음 답 하나만 셈하지 않아요 (끝나면 저절로 꺼짐)', meta.skipNext)}`
        + `<div class="ml-row tap" data-act="p-off"><span class="ml-ic">🔌</span><span class="ml-tx"><b>이 채팅에서 끄기</b><small>HUD · 칩 · 폰 모두 사라져요 · 다시 켜기는 확장 설정 › 미트볼폰 › 「이 채팅에서만 끄기」 해제</small></span><span class="ml-val">›</span></div></div>`
        + `<h4 class="ml-h4">😌 눈 감기 <span>앱마다 · 그 답엔 이 앱 일을 만들지도 받지도 않아요 · 다른 앱은 그대로</span></h4>`
        + `<div class="ml-card">${apps.map(m => `<div class="ml-row"><span class="ml-ic">${m.icon}</span><span class="ml-tx"><b>${esc(m.name)}</b><small>${EYE_WHAT[m.id] ?? ''}${shut(m.id) ? ' · 다음 답에 감김' : ''}</small></span>`
            + `<span class="ml-val"><span class="ml-picks">${seg(m.id)}</span></span></div>`).join('') || '<div class="ml-row"><span class="ml-tx"><small>깔린 앱이 없어요</small></span></div>'}</div>`
        + '<div class="ml-hint">「다음 1번」은 다음 답 하나에만 감기고(그 답을 리롤해도 감긴 채), 그다음 답부터 저절로 떠요. 「계속」은 다시 「뜸」을 누를 때까지 감겨요.</div>';
    sheet('⏸ 멈춤 · 눈 감기', html);
}

// ───── 📱 상태바: 이야기 속 시각 · 다이내믹 아일랜드(미트볼이 숨어 있음 · 누르면 제어 센터) · 통신사 「미트볼」 · 배터리 = 기력 ─────
function statusBar(r, meta) {
    const { book, S } = r;
    const clk = book.world.start.cal?.style === '' ? periodName(S.t) : clockText(book.world.start, S.t);
    const en = book.me.needs.find(n => n.key === 'energy'), bat = Math.max(0, Math.min(100, Math.round(en ? S.needs.energy ?? 0 : S.gauges?.hp ?? 100)));
    const n = eyesShut().length, state = meta.paused ? '⏸ 멈춤' : meta.skipNext ? '⏭ 건너뜀' : n ? `😌 ${n}` : '';
    return `<header class="ml-top ml-status"><span class="ml-sb-time">${esc(clk)}</span>`
        + `<button class="ml-island${state ? ' busy' : ''}" data-act="cc" title="제어 센터">${state ? `<span>${state}</span>` : ''}<span class="ml-peek">${mascot('xs', '', 'peek')}</span></button>`
        + `<span class="ml-sb-r"><b>미트볼</b><i class="ml-sig"><u></u><u></u><u></u><u></u></i><span class="ml-bat${bat < 20 ? ' low' : ''}" title="배터리 = ${en ? '기력' : '체력'} ${bat}%"><i style="width:${bat}%"></i></span>`
        + `<button class="ml-ib" data-act="close" title="닫기">✕</button></span></header>`;
}
// 🎛 제어 센터
function controlCenter() {
    const meta = getMeta(); if (!meta) return;
    const t = (act, icon, name, on = false, v = '') => `<button class="ml-cc-b${on ? ' on' : ''}" data-act="${act}" data-v="${v}"><i>${icon}</i><span>${name}</span></button>`;
    sheet('🎛 제어 센터', `<div class="ml-cc">${t('p-all', '⏸', meta.paused ? '멈춤 중' : '전체 멈춤', meta.paused)}${t('p-skip', '⏭', '다음 1번 건너뛰기', meta.skipNext)}`
        + `${t('pause', '😌', `눈 감기${eyesShut().length ? ` · ${eyesShut().length}` : ''}`, eyesShut().length > 0)}${t('find', '🔍', '검색')}${t('report', '📋', '전체 복사')}`
        + `${t('cc-open', '🎨', '꾸미기 · 배경화면', false, 'look')}${t('home-edit', '✏️', '홈 편집')}${t('cc-open', '🎚️', '영향력', false, 'gauge')}</div>`
        + '<div class="ml-hint">미트볼은 위의 섬 안에 숨어 있어요. 누르면 이 화면이 열려요.</div>');
}
// 🖼 내 사진 → 1280px · JPEG로 줄여서 설정에 (확장 파일에는 안 들어감)
async function wallUpload(file) {
    if (!file || !/^image\//.test(file.type)) return;
    try {
        const url = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(file); });
        const img = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = url; });
        const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        let out = c.toDataURL('image/jpeg', 0.82); if (out.length > 900000) out = c.toDataURL('image/jpeg', 0.6);
        const L = settings().look; L.wallImg = out; L.wall = 'img'; saveSettings(); drawSheet();
    } catch { toast('사진을 못 읽었어요', 'bad'); }
}
export const redraw = () => drawSheet();
