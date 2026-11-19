// 화면은 셋뿐: HUD · 미니바 · 전체화면
import { app, ctx, settings, getMeta, saveMeta, modOn, ready, TITLE } from '../base/st.js';
import { esc, dateText, slotName, short, fmt } from '../base/util.js';
import { fold, derived, needStage } from '../rules/engine.js';
import { placeOf } from '../rules/book.js';
import { TABS, RENDER, onAct, changeRow, setRecFilter } from './tabs.js';
import { home, market, cat, look, APPS, appOf, installed, markSeen } from './home.js';
import { toolbar, onTool, TOOL_ACTS, applyGloss } from './tools.js';
import { traitsView, traitAct, TRAIT_ACTS } from './traits.js';
import { chip, sheet, bar } from './kit.js';

import { mascot } from './mascot.js';
let cur = 'home', past = null;

// ───── HUD: 한 줄 (욕구 · 돈 · 시간 · 장소 · 가게 한 줄) ─────
function hudHTML(r) {
    const { S, book } = r, L = [];
    if (modOn('stats')) for (const n of book.me.needs) { const v = Math.round(S.needs[n.key] ?? 0), st = needStage(v); L.push(`<span class="ml-h ${st === '위험' ? 'bad' : st === '주의' ? 'mid' : ''}" title="${esc(n.name)} ${v}">${n.icon}${v}</span>`); }
    if (modOn('wallet')) L.push(`<span class="ml-h">💰${fmt(S.cash)}</span>`);
    if (modOn('calendar')) L.push(`<span class="ml-h">🕰${slotName(S.t)}${S.weather ? ` · ${esc(S.weather)}` : ''}</span>`);
    if (modOn('map') && S.loc) { const pl = placeOf(book, S.loc); L.push(`<span class="ml-h tap" data-act="open" data-v="${pl?.goods.length ? 'bag' : 'map'}">📍${esc(S.loc)}${pl?.goods.length ? ' · 🛒' : ''}</span>`); }
    // 🛒 가게에 있으면 HUD에 물건 한 줄 (누르면 사는 말이 입력창에)
    if (modOn('wallet') && S.loc) { const pl = placeOf(book, S.loc); if (pl?.goods.length) L.push(...pl.goods.slice(0, 3).map(g => `<span class="ml-h tap shop${S.cash < g.price ? ' poor' : ''}" data-act="say" data-v="${esc(g.name)} 하나 주세요.">${esc(g.name)} ${g.price}</span>`)); }
    if (S.status.length) L.push(`<span class="ml-h">🏷${S.status.length}</span>`);
    // 🔤 토큰 계기판: 이번 턴 본편 주입 · 미트볼 AI 호출 · 걸린 시간 (작게)
    const pt = app.perfLast?.(); if (pt) L.push(`<span class="ml-h meter" title="이번 턴: 본편 주입 ≈${pt.tok}토큰 · 미트볼 AI ${pt.calls}회 · ${pt.ms.toFixed(0)}ms">🔤${pt.tok}${pt.calls ? ` · 🤖${pt.calls}` : ''}</span>`);
    return L.join('');
}
// ───── 미니바: 접힌 사이드 모양 · 「펼치기」 → 전체화면 ─────
function miniHTML(r) {
    const { S, book } = r;
    const needs = modOn('stats') ? book.me.needs.map(n => { const v = Math.round(S.needs[n.key] ?? 0); return `<div class="ml-mb-n" title="${esc(n.name)}">${n.icon}${bar(v, needStage(v) === '위험' ? 'bad' : '')}</div>`; }).join('') : '';
    const night = /심야|밤/.test(slotName(S.t)), face = derived(book, S).some(d => d.stage === '위험') ? 'sad' : night && settings().mascotPick === 'idle' ? 'sleep' : '';
    return `${mascot('sm', face, 'ml-mascot')}${needs}<div class="ml-mb-t">${dateText(book.world.start, S.t, false)}</div><button class="ml-btn sm" data-act="open" data-v="now">펼치기</button>`;
}
export function drawFrame() {
    const on = settings().enabled && ready() && !getMeta()?.off;
    let hud = document.getElementById('ml-hud'), mb = document.getElementById('ml-mini');
    if (!on) { hud?.remove(); mb?.remove(); return; }
    const r = fold(); if (!r) return;
    if (settings().hud) {
        if (!hud) { hud = document.createElement('div'); hud.id = 'ml-hud'; hud.className = 'ml-scope'; const host = document.getElementById('sheld') ?? document.body; settings().hudPos === 'bottom' ? (document.getElementById('form_sheld') ?? host).before(hud) : host.prepend(hud); }
        const h = `<button class="ml-h tap" data-act="open" data-v="home">😼</button>${hudHTML(r)}${getMeta().paused ? '<span class="ml-h bad">⏸</span>' : ''}`;
        if (hud.dataset.h !== h) { hud.innerHTML = h; hud.dataset.h = h; applyGloss(hud); }
    } else hud?.remove();
    if (settings().minibar) {
        if (!mb) { mb = document.createElement('div'); mb.id = 'ml-mini'; mb.className = 'ml-scope'; document.body.appendChild(mb); }
        const h = miniHTML(r); if (mb.innerHTML !== h) mb.innerHTML = h;
    } else mb?.remove();
}
// ───── 전체화면 ─────
export function openSheet(tab = 'home') {
    if (tab === 'now' && !document.getElementById('ml-full')) tab = 'home';
    cur = tab; past = null;
    let el = document.getElementById('ml-full');
    if (!el) {
        el = document.createElement('div'); el.id = 'ml-full'; el.className = 'ml-scope';
        document.body.appendChild(el);
        el.addEventListener('click', clickHandler);
        el.addEventListener('change', changeHandler);
    }
    drawSheet();
    document.body.classList.add('ml-open');
}
export function closeSheet() { document.getElementById('ml-full')?.remove(); document.body.classList.remove('ml-open'); }
export function drawSheet() {
    const el = document.getElementById('ml-full'); if (!el) return;
    const r = fold(); if (!r) { closeSheet(); return; }
    const R2 = { ...RENDER, home, market, cat, look, traits: traitsView };
    if (!R2[cur] || (appOf(cur) && !installed(appOf(cur)))) cur = 'home';
    const view = past != null ? { ...r, S: r.states[past] ?? r.S } : r;
    const meta = getMeta(), a = appOf(cur);
    const keep = el.querySelector(':scope > .ml-bs'); // 열려 있는 시트는 다시 그려도 그대로
    const scroll = el.querySelector('.ml-body')?.scrollTop ?? 0, same = el.querySelector('.ml-body')?.dataset.tab === cur;
    el.innerHTML = `<header class="ml-top">${cur === 'home' ? `${mascot('head')}<b>${TITLE}</b>` : `<button class="ml-ib back" data-tab="home" title="홈">‹</button><b>${a ? `${a.icon} ${a.name}` : ''}</b>`}${past != null ? chip(`🕰 #${past} 시점 · 읽기 전용`, 'mid', 'past-off') : ''}<span class="ml-sp"></span><button class="ml-ib" data-act="pause" title="일시정지">${meta.paused ? '▶' : '⏸'}</button><button class="ml-ib" data-act="skip" title="다음 1번 건너뛰기">${meta.skipNext ? '⏭✓' : '⏭'}</button><button class="ml-ib" data-act="find" title="검색">🔍</button><button class="ml-ib" data-act="close">✕</button></header>`
        + `<main class="ml-body" data-tab="${cur}">${a && !a.sys ? toolbar(cur) : ''}${R2[cur](view)}</main>`;
    applyGloss(el.querySelector('.ml-body'));
    if (a && !a.sys) markSeen(cur, r);
    if (keep) el.appendChild(keep);
    if (same) el.querySelector('.ml-body').scrollTop = scroll;
}
async function clickHandler(e) {
    const t = e.target.closest('[data-tab]'); if (t && t.tagName === 'BUTTON') { cur = t.dataset.tab; drawSheet(); return; }
    const o = e.target.closest('[data-act="open"]'); if (o && !e.target.closest('[data-act]:not([data-act="open"])')) { cur = o.dataset.v; drawSheet(); el0()?.querySelector('.ml-body')?.scrollTo(0, 0); return; }
    const s = e.target.closest('.ml-seg button'); if (s) { const name = s.parentElement.dataset.seg, v = s.dataset.v, meta = getMeta();
        if (name === 'hide') meta.hideNums = v === '1';
        if (name === 'scope') { meta.influence = v === 'chat' ? structuredClone(settings().influence) : null; }
        if (name === 'recf') setRecFilter(v);
        saveMeta(); drawSheet(); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act, v = a.dataset.v;
    if (TOOL_ACTS.has(act)) return onTool(act, v);
    if (TRAIT_ACTS.has(act)) return traitAct(act, v);
    const meta = getMeta();
    if (act === 'close') return closeSheet();
    if (act === 'pause') { meta.paused = !meta.paused; saveMeta(); app.refresh(); return; }
    if (act === 'skip') { meta.skipNext = !meta.skipNext; saveMeta(); drawSheet(); return; }
    if (act === 'past-off') { past = null; drawSheet(); return; }
    if (act === 'find') return app.find?.();
    await onAct(act, v, a);
}
function changeHandler(e) {
    const lk = e.target.closest('[data-look]'); if (lk) { const L = settings().look, k = lk.dataset.look; L[k] = lk.type === 'range' ? Number(lk.value) : lk.value; saveSettings(); app.applyLook?.(); drawSheet(); return; }
    const g = e.target.closest('[data-gauge]'); if (!g) return;
    const meta = getMeta(), tgt = meta.influence ?? settings().influence, id = g.dataset.gauge, v = Number(g.value);
    if (id === 'all') tgt.all = v; else { tgt.by ??= {}; tgt.by[id] = v - (tgt.all ?? 2); }
    meta.influence ? saveMeta() : ctx().saveSettingsDebounced();
    drawSheet(); app.inject?.();
}
export function openPast(i) { openSheet('now'); past = i; drawSheet(); }
// 바깥(HUD · 미니바) 누르기
export function bindOuter() {
    document.addEventListener('click', (e) => {
        const a = e.target.closest('#ml-hud [data-act], #ml-mini [data-act]'); if (!a) return;
        if (a.dataset.act === 'open') openSheet(a.dataset.v);
        if (a.dataset.act === 'say') onAct('say', a.dataset.v, a);
    });
    document.addEventListener('click', async (e) => { const a = e.target.closest('.ml-bs [data-act], .ml-msg [data-act]'); if (!a || a.closest('#ml-full')) return; /* 패널 안 시트는 패널이 처리 */ if (a.dataset.act === 'turncard') return turnSheet(Number(a.dataset.v)); if (TOOL_ACTS.has(a.dataset.act)) { a.closest('.ml-bs')?.remove(); return onTool(a.dataset.act, a.dataset.v); } await onAct(a.dataset.act, a.dataset.v, a); });
}
// ───── 답 밑 칩: 보이는 최근 메시지에만 ─────
const CHIP_N = 6;
export function drawChips() {
    const r = fold(); const chat = ctx().chat ?? [];
    document.querySelectorAll('.ml-msg').forEach(x => { const i = Number(x.closest('.mes')?.getAttribute('mesid')); if (!(i >= chat.length - CHIP_N * 2)) x.remove(); });
    if (!r || !settings().enabled) return;
    for (let i = Math.max(0, chat.length - CHIP_N * 2); i < chat.length; i++) {
        const el = document.querySelector(`#chat .mes[mesid="${i}"] .mes_text`); if (!el) continue;
        const ch = (r.changes[i] ?? []).filter(c => c.src !== 'time'), fl = (r.flags[i] ?? []);
        let box = el.parentElement.querySelector('.ml-msg');
        if (!ch.length && !fl.length) { box?.remove(); continue; }
        const h = fl.map(f => chip(`⚠ 확인 필요 · ${esc(short(f.text, 24))}`, 'bad')).join('') + ch.slice(0, 8).map(c => chip(`${c.icon} ${esc(c.label)} ${typeof c.to === 'number' && typeof c.from === 'number' ? (c.f === 'time' ? '' : signed2(c.to - c.from)) : esc(c.to)}${c.why ? ` · ${esc(short(c.why, 12))}` : ''}`, c.kind === 'bad' || (typeof c.to === 'number' && c.to < c.from) ? 'bad' : 'good', 'turncard', String(i))).join('') + (ch.length > 8 ? chip(`+${ch.length - 8}`, 'mid', 'turncard', String(i)) : '');
        if (!box) { box = document.createElement('div'); box.className = 'ml-msg ml-scope'; el.after(box); }
        if (box.innerHTML !== h) box.innerHTML = h;
    }
}
const signed2 = (n) => (n > 0 ? `+${Math.round(n)}` : `−${Math.abs(Math.round(n))}`);
export function turnSheet(i) { const r = fold(); sheet(`#${i} 이번 답에서 바뀐 것`, `<div class="ml-card">${(r.changes[i] ?? []).filter(c => c.src !== 'time').map(c => changeRow(c, i)).join('')}</div>`); }
const el0 = () => document.getElementById('ml-full');
