// 📱 펼친 폰 화면 (전체화면 · 패널) — 처음 열 때만 불러온다 (frame.js가 import()로)
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
import { setView, setAct, setChange } from './setapp.js';
import { bindHomeEdit } from './homeedit.js';
import { toolbar, onTool, TOOL_ACTS, applyGloss } from './tools.js';
import { glossList } from '../base/gloss.js';
import { chip, sheet, bar, toast, layerHost, resetLayerHost } from './kit.js';

import { mascot } from './mascot.js';
import { isWaiting } from '../rules/classify.js';
import { applyTr, trSig, trBusy } from '../extra/tr.js';
import { chipCheck } from '../extra/doctor.js';
let cur = 'home', past = null, lastHtml = ''; // lastHtml: 지난번에 그린 폰 화면 (같으면 다시 안 그림)
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
        lastHtml = ''; el.innerHTML = `<header class="ml-top"><b>${TITLE}</b><span class="ml-sp"></span><button class="ml-ib" data-act="report" title="전체 복사">📋</button><button class="ml-ib" data-act="close">✕</button></header>`
            + `<main class="ml-body"><div class="ml-hint">⚠ 화면을 그리다 멈췄어요. 위 📋를 눌러 복사해서 보내 주세요.</div><pre class="ml-err">${esc(String(e?.stack || e)).slice(0, 1200)}</pre></main>`;
    }
}
export function closeSheet() { lastHtml = ''; document.getElementById('ml-full')?.remove(); document.body.classList.remove('ml-open'); }
export function drawSheet() {
    const el = document.getElementById('ml-full'); if (!el) return;
    if (!ctx().chatMetadata) { closeSheet(); return; }
    const meta0 = getMeta(), r = fold();
    if (!r || meta0?.setup) {
        // 📘 설정집이 없으면 설정집 하나만 · 🛍️ 만든 뒤에는 쓸 앱 고르기 한 화면
        lastHtml = ''; el.innerHTML = `<header class="ml-top">${mascot('head')}<b>${r ? '🛍️ 쓸 앱 고르기' : TITLE}</b><span class="ml-sp"></span><button class="ml-ib" data-act="report" title="전체 복사">📋</button><button class="ml-ib" data-act="close">✕</button></header>`
            + `<main class="ml-body" data-tab="${r ? 'setup' : 'first'}">${r ? setupView(r) : firstView()}</main>`;
        return;
    }
    const R2 = { ...RENDER, home, market, cat, look, set: setView };
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
        const html = statusBar(view, meta) + `<main class="ml-body" data-tab="home">${home(view)}</main>`;
        if (same && lastHtml === html && paintSig === sigNow() && el.querySelector('.ml-body')) return; // 🏎 바뀐 게 없으면 다시 그리지 않음
        paint(el, html, same, scroll); lastHtml = html;
        return;
    }
    if (xa) { // 🧩 기타 앱: 앱이 그린 화면은 다시 그리지 않음 (앱 쪽 상태 지키기)
        if (same && el.querySelector('.ml-ext')) return;
        lastHtml = ''; el.innerHTML = `<header class="ml-top"><button class="ml-ib back" data-tab="home" title="홈">‹</button><b>${esc(xa.icon)} ${esc(xa.name)}</b><span class="ml-sp"></span>`
            + `<button class="ml-ib" data-act="close">✕</button></header><main class="ml-body" data-tab="${esc(cur)}"><div class="ml-ext"></div></main>`;
        renderExt(el.querySelector('.ml-ext'), xa, Object.freeze({ close: closeSheet, redraw: () => { el.querySelector('.ml-ext')?.remove(); drawSheet(); }, toast: (t) => toast(String(t)) }));
        if (keep) el.appendChild(keep);
        return;
    }
    const html = `<header class="ml-top"><button class="ml-ib back" data-tab="home" title="홈">‹</button><b>${a ? `${a.icon} ${a.name}` : ''}</b>`
        + `${past != null ? chip(`🕰 #${past} 시점 · 읽기 전용`, 'mid', 'past-off') : ''}<span class="ml-sp"></span><button class="ml-ib${meta.paused || meta.skipNext || eyesShut().length ? ' on' : ''}" data-act="pause" `
        + `title="멈춤 · 건너뛰기 · 😌 눈 감기">${pauseLabel(meta)}</button><button class="ml-ib" data-act="find" title="검색">🔍</button><button class="ml-ib" data-act="report" title="📋 전체 복사">📋</button><button class="ml-ib" data-act="close">✕</button></header>`
        + `<main class="ml-body" data-tab="${cur}">${a && !a.sys ? toolbar(cur) : ''}${past != null && cur === 'now' ? thenNow(view.S, r) : ''}${R2[cur](view)}</main>`;
    if (same && lastHtml === html && paintSig === sigNow() && el.querySelector('.ml-body')) return; // 🏎 같은 화면이면 그대로
    paint(el, html, same, scroll); lastHtml = html;
    el.querySelector('.ml-pill.tr-busy')?.remove();
    if (trBusy()) el.querySelector('.ml-sp')?.insertAdjacentHTML('beforebegin', '<span class="ml-pill tr-busy">🌐</span>');
    if (a && !a.sys) markSeen(cur, r);
}
// 🧩 바뀐 칸만 갈아 끼우기 — 새 글을 맨 위(머리 · 본문) → 본문 안 칸(위젯 · 카드)으로 나눠 보고, 글이 같은 칸은 DOM을 그대로 둔다
//   (답마다 폰 전체를 다시 그리던 것 → 바뀐 위젯 · 카드만. 스크롤 · 펼쳐 둔 접기 · 열린 시트도 그대로)
const SRC = Symbol('src');
const srcOf = (n) => (n.nodeType === 1 ? n.outerHTML : n.textContent);
const live = (box) => [...box.childNodes].filter(n => (n.nodeType === 1 ? !n.classList.contains('ml-bs') : n.textContent.trim()));
function nodesOf(html) { const t = document.createElement('template'); t.innerHTML = html; return [...t.content.childNodes].filter(n => n.nodeType === 1 || n.textContent.trim()); }
function patch(box, html, depth = 0) {
    const nw = nodesOf(html), old = live(box), keep = box.querySelector(':scope > .ml-bs'), changed = [];
    if (nw.length !== old.length) { old.forEach(n => n.remove()); for (const n of nw) { n[SRC] = srcOf(n); box.insertBefore(n, keep); if (n.nodeType === 1) changed.push(n); } return changed; }
    nw.forEach((n, i) => {
        const o = old[i], h = srcOf(n); if (o[SRC] === h) return;
        // 본문(main)은 통째로 바꾸지 않고 안쪽 칸만 비교 (스크롤 그대로)
        if (depth === 0 && n.nodeType === 1 && o.nodeType === 1 && n.tagName === 'MAIN' && o.tagName === 'MAIN' && o.dataset.tab === n.dataset.tab) { o[SRC] = h; changed.push(...patch(o, n.innerHTML, 1)); return; }
        n[SRC] = h; box.replaceChild(n, o); if (n.nodeType === 1) changed.push(n);
    });
    return changed;
}
// 용어집이 바뀌면 글이 같아도 다시 칠해야 함 → 서명이 바뀌면 통째로
let paintSig = '';
const sigNow = () => `${JSON.stringify(glossList())}|${trSig()}`;
function paint(el, html, same, scroll) {
    const sig = sigNow(); if (sig !== paintSig) { paintSig = sig; same = false; }
    if (!same) live(el).forEach(n => n.remove());
    const ch = patch(el, html), body = el.querySelector('.ml-body');
    for (const n of ch) if (body && (n === body || body.contains(n))) { applyTr(n); applyGloss(n); }
    if (same && body && body.scrollTop !== scroll) body.scrollTop = scroll;
    perfPaint.n++; perfPaint.nodes += ch.length;
}
export const perfPaint = { n: 0, nodes: 0 };
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
    if (String(act).startsWith('set-')) { await setAct(act, v); drawSheet(); return; } // ⚙️ 설정 앱
    await onAct(act, v, a);
}
function changeHandler(e) {
    const ms = e.target.closest?.('[data-mlset], [data-mlmeta]'); if (ms) { setChange(ms); return; } // ⚙️ 설정 앱
    const wf = e.target.closest?.('[data-wallfile]'); if (wf) { wallUpload(wf.files?.[0]); return; }
    const lk = e.target.closest('[data-look]'); if (lk) { const L = settings().look, k = lk.dataset.look; L[k] = lk.type === 'range' ? Number(lk.value) : lk.value; saveSettings(); app.applyLook?.(); drawSheet(); return; }
    const g = e.target.closest('[data-gauge]'); if (!g) return;
    const meta = getMeta(), tgt = meta.influence ?? settings().influence, id = g.dataset.gauge, v = Number(g.value);
    if (id === 'all') tgt.all = v; else { tgt.by ??= {}; tgt.by[id] = v - (tgt.all ?? 2); }
    meta.influence ? saveMeta() : saveSettings();
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
export function turnSheet(i) { const r = fold(), L = (r.changes[i] ?? []).filter(c => c.src !== 'time'); sheet(`#${i} 이번 답에서 바뀐 것`, `<div class="ml-card">${L.map(c => changeRow(c, i)).join('') || '<div class="ml-row"><span class="ml-tx"><b>✓ 변화 없음</b><small>이 답에서는 셈할 일이 없었어요 · 분류 모델(B)이면 「🔄 다시 분류」로 다시 고를 수 있어요</small></span></div>'}</div>${msgData(ctx().chat?.[i])?.src === 'cls' ? `<div class="ml-acts"><button class="ml-btn xs" data-act="cls-redo" data-v="${i}">🔄 다시 분류</button></div>` : ''}<details class="ml-det"><summary>🔍 칩 점검 · 줄마다 어떻게 읽혔나</summary>${chipCheck(i)}</details>`); }
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
        + `${t('cc-open', '🎨', '꾸미기 · 배경화면', false, 'look')}${t('home-edit', '✏️', '홈 편집')}${t('cc-open', '🎚️', '영향력', false, 'gauge')}${t('cc-open', '⚙️', '설정 · 칩 점검', false, 'set')}</div>`
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
