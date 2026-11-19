// 미트볼 라이트 — 실리태번 이벤트 연결
import { app, ctx, settings, saveSettings, getMeta, saveMeta, slot, syncSwipe, ready, MODULE, OLD, VERSION, TITLE, INJ, MODS, DATA_V, bumpMeta } from './src/base/st.js';
import { esc, short, tokens } from './src/base/util.js';
import { readOps, stripTags, hasTag } from './src/rules/tags.js';
import { fold, resetCache } from './src/rules/engine.js';
import { normBook } from './src/rules/book.js';
import { ruleText, factText, injTokens } from './src/rules/inject.js';
import { fillBook, templateBook, supplement, stats as aiStats } from './src/rules/ai.js';
import { drawFrame, drawChips, drawSheet, openSheet, closeSheet, openPast, bindOuter } from './src/ui/frame.js';
import { sheet, toast, row, card } from './src/ui/kit.js';
import { findAll } from './src/extra/find.js';
import { initMascot, playMascotSound, MASCOT_SOUNDS } from './src/ui/mascot.js';
import { mount as mountApi, announce } from './src/extra/api.js';
import { backup, restore, toCard, fromCard, migrateOld, oldActive } from './src/extra/safe.js';

const perf = { turns: [], refresh: [] };
let resting = false;

// ───── 새로 그리기 (한 번에 묶어서) ─────
let pending = 0;
export function refresh(force = false) {
    if (resting) return;
    if (force) resetCache();
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
        const t0 = performance.now();
        try { drawFrame(); drawChips(); if (document.getElementById('ml-full')) drawSheet(); inject(); announce(); } catch (e) { console.error(`[${TITLE}]`, e); }
        perf.refresh.push(performance.now() - t0); if (perf.refresh.length > 50) perf.refresh.shift();
    });
}
// ───── 본편 주입 ─────
let lastInj = { rule: '', facts: '', hint: '' };
function setInj(o) {
    const c = ctx(), d = settings().injectDepth;
    c.setExtensionPrompt(INJ.rule, o.rule ?? '', 1, d, false, 0);
    c.setExtensionPrompt(INJ.facts, o.facts ?? '', 1, d, false, 0);
    c.setExtensionPrompt(INJ.hint, o.hint ?? '', 1, d, false, 0);
    lastInj = o;
}
export function inject() {
    const meta = getMeta();
    if (!settings().enabled || !ready(meta) || meta.paused || meta.off) return setInj({});
    const r = fold(); if (!r) return setInj({});
    const chat = ctx().chat ?? []; let li = chat.length - 1; while (li >= 0 && (chat[li].is_user || chat[li].is_system)) li--;
    const ft = factText(r, li >= 0 ? r.changes[li] ?? [] : []);
    setInj({ rule: ruleText(r.book), ...ft });
}
app.refresh = refresh; app.inject = inject; app.applyLook = () => applyLook(); app.lastInj = () => lastInj; app.perfLast = () => perf.turns.at(-1) ?? null; app.openSheet = openSheet; app.closeSheet = closeSheet; app.openPast = openPast;
app.find = () => findAll();
app.jump = async (i) => {
    closeSheet();
    const c = ctx();
    try { if (c.executeSlashCommandsWithOptions) { await c.executeSlashCommandsWithOptions(`/chat-jump ${i}`); } } catch { /* 없음 */ }
    let el = document.querySelector(`#chat .mes[mesid="${i}"]`);
    if (!el && typeof c.showMoreMessages === 'function') { await c.showMoreMessages(); el = document.querySelector(`#chat .mes[mesid="${i}"]`); }
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('ml-flash'); setTimeout(() => el.classList.remove('ml-flash'), 1600); }
};

// ───── 답을 받았을 때: 태그 → 메시지 칸으로 옮겨 적기 (본문엔 이야기만) ─────
const isOOC = () => { const c = ctx().chat ?? []; const u = [...c].reverse().find(m => m.is_user); try { return settings().ooc && u && new RegExp(settings().oocPattern, 'i').test(u.mes); } catch { return false; } };
let skipThis = false, quietGen = false;
async function onBeforeGen(type, opts, dry) {
    if (dry) return;
    const meta = getMeta();
    quietGen = type === 'quiet' || type === 'impersonate';
    skipThis = !!meta?.skipNext || isOOC();
    if ((quietGen && settings().skipQuiet) || skipThis || meta?.paused) { setInj({}); return; }
    inject();
}
async function onReceived(i, type) {
    const meta = getMeta(); const m = ctx().chat?.[i];
    if (!m || m.is_user || !ready(meta) || !settings().enabled) return;
    if ((type === 'quiet' || quietGen) && settings().skipQuiet) { quietGen = false; return; }
    const t0 = performance.now(), calls0 = aiStats.calls;
    const sl = slot(m, true);
    if (meta.paused || skipThis) {
        sl.ops = []; sl.skip = true; m.mes = stripTags(m.mes);
        if (skipThis && meta.skipNext) { meta.skipNext = false; saveMeta(); }
        skipThis = false;
    } else if (hasTag(m.mes)) {
        sl.ops = readOps(m.mes); sl.fill = false; m.mes = stripTags(m.mes);
    } else if (settings().fillMissing) {
        // 빠졌을 때만 작게 보충 (AI 1회)
        try { const raw = await supplement(m.mes, fold()); sl.ops = readOps(raw); sl.fill = true; } catch (e) { sl.ops = []; console.warn(`[${TITLE}] 보충 실패`, e); }
    } else sl.ops = [];
    sl.rev = (sl.rev ?? 0) + 1; bumpMeta();
    if (Array.isArray(m.swipes) && typeof m.swipe_id === 'number') m.swipes[m.swipe_id] = m.mes;
    syncSwipe(m);
    ctx().saveChatDebounced?.();
    perf.turns.push({ ms: performance.now() - t0, calls: aiStats.calls - calls0, tok: injTokens(lastInj) }); if (perf.turns.length > 30) perf.turns.shift();
    { const q = /weave this line once[^「]*「([^」]+)」/.exec(lastInj.hint ?? ''); if (q) { meta.quoteSent = q[1]; saveMeta(); } }
    refresh(); setTimeout(alerts, 300);
}
function onEdited(i) {
    bumpMeta(); // 앞쪽 메시지를 고쳐도 다시 계산되게
    const m = ctx().chat?.[i]; if (!m || m.is_user) return refresh();
    if (hasTag(m.mes)) { const sl = slot(m, true); sl.ops = readOps(m.mes); sl.rev = (sl.rev ?? 0) + 1; bumpMeta(); m.mes = stripTags(m.mes); syncSwipe(m); ctx().saveChatDebounced?.(); }
    refresh();
}

// ───── 🔔 하루 전 알림: 약속 · 마감 · 생일 · 기념일 (한 번씩만) ─────
function alerts() {
    const meta = getMeta(), r = fold(); if (!r) return;
    const { S, book } = r, sent = new Set(meta.alerted ?? []), out = [];
    for (const p of S.promises) if (!p.done && p.due != null && p.due >= S.t && p.due - S.t <= 1440) out.push([`p|${p.text}|${p.due}`, `📅 하루 안: ${p.text}`]);
    const day0 = Math.floor(S.t / 1440);
    for (const p of book.people) { const m = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(p.day || ''); if (!m) continue; for (const k of [0, 1]) { const d = new Date(Date.UTC(book.world.start.y, book.world.start.m - 1, book.world.start.d + day0 + k)); if (d.getUTCMonth() + 1 === Number(m[1]) && d.getUTCDate() === Number(m[2])) out.push([`b|${p.name}|${d.getUTCFullYear()}`, `🎂 ${k ? '내일' : '오늘'} ${p.name} ${p.day}`]); } }
    let n = 0; for (const [k, t] of out) if (!sent.has(k)) { sent.add(k); toast(t); n++; }
    if (n) { meta.alerted = [...sent].slice(-80); saveMeta(); }
}
// ───── 상태창 만들기 ─────
async function create(useAI) {
    const meta = getMeta(true);
    let b = null;
    if (useAI) { toast('로어북 · 카드를 읽고 설정집을 채우는 중…'); try { const { book, src } = await fillBook(); if (book) { b = normBook(book); b.src = { from: 'ai', at: Date.now(), sig: src.sig }; } } catch (e) { console.warn(e); } if (!b) toast('AI로 못 채워서 기본 틀로 시작해요', 'bad'); }
    b ??= templateBook();
    if (!b.people.length) b.people = templateBook().people;
    meta.book = b; meta.start ??= { cash: b.world.meal * 5, loc: b.world.places.find(p => p.kind === 'home')?.name ?? '' };
    saveMeta(); refresh(true); openSheet('book');
}

// ───── 확장 설정 서랍 (남긴 설정만) ─────
function settingsHTML() {
    const s = settings();
    const sw = (k, label) => `<label class="checkbox_label"><input type="checkbox" data-ml-s="${k}" ${s[k] ? 'checked' : ''}> ${label}</label>`;
    const sel = (k, label, opts) => `<label>${label} <select class="text_pole" data-ml-s="${k}">${opts.map(([v, l]) => `<option value="${v}" ${String(s[k]) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    return `<div class="inline-drawer ml-set"><div class="inline-drawer-toggle inline-drawer-header"><b>😼 ${TITLE} <small>v${VERSION}</small></b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content">
${sw('enabled', '켜기')}
<div class="ml-set-btns"><button class="menu_button" data-ml="create-ai">📘 상태창 만들기 (AI 1회)</button><button class="menu_button" data-ml="create-tpl">⚡ 바로 시작 (AI 0회)</button><button class="menu_button" data-ml="open">펼치기</button></div>
<h4>화면</h4>${sw('hud', 'HUD')}${sel('hudPos', 'HUD 자리', [['top', '위'], ['bottom', '아래']])}${sw('minibar', '미니바')}${sw('mascot', '마스코트')}${sel('mascotSound', '마스코트 누르면 나는 소리', MASCOT_SOUNDS)}<label>효과음 크기 <input type="range" min="0" max="100" step="5" data-ml-s="mascotVolume" value="${s.mascotVolume}"></label><div class="ml-set-btns"><button class="menu_button" data-ml="cat">😺 마스코트 고르기</button></div>
<h4>꾸미기</h4><label>강조색 <input type="color" data-ml-look="accent" value="${s.look.accent}"></label> <label>글자 크기 <input type="range" min="0.85" max="1.3" step="0.05" data-ml-look="size" value="${s.look.size}"></label> <label>모서리 <input type="range" min="0" max="24" step="2" data-ml-look="radius" value="${s.look.radius}"></label> <label>테두리 <input type="range" min="0" max="3" step="1" data-ml-look="border" value="${s.look.border}"></label> <label>그림자 <input type="range" min="0" max="3" step="1" data-ml-look="shadow" value="${s.look.shadow}"></label> <label>글꼴 <input class="text_pole" data-ml-look="font" value="${esc(s.look.font)}" placeholder="비우면 실리태번 글꼴"></label>
<h4>AI</h4>${sel('preset', '본편 지시', [['flash', '플래시용 (짧은 키 + 예시)'], ['general', '일반']])}${sw('fillMissing', '태그가 빠졌을 때만 보충 (AI 1회)')}${sw('skipQuiet', '퀵리플라이 · /gen 답엔 안 붙이기')}${sw('ooc', 'OOC 메시지는 건너뛰기')}
<label>미트볼 AI 연결 프로필 <input class="text_pole" data-ml-s="profile" value="${esc(s.profile)}" placeholder="비우면 지금 연결"></label>
${sel('pinBook', '장면 인물의 증상 한 줄 본편에', [['auto', '붙이기'], ['off', '안 붙이기']])}
<h4>저장 · 옮기기</h4><div class="ml-set-btns"><button class="menu_button" data-ml="perf">🏎 부하 재기</button><button class="menu_button" data-ml="backup">💾 백업</button><button class="menu_button" data-ml="restore">📂 불러오기</button><button class="menu_button" data-ml="card">🃏 카드에 붙이기</button><button class="menu_button" data-ml="migrate">🍖 옛 미트볼 옮겨 오기</button></div>
</div></div>`;
}
function mountSettings() {
    const host = document.getElementById('extensions_settings2') ?? document.getElementById('extensions_settings'); if (!host) return;
    host.querySelector('.ml-set')?.remove();
    host.insertAdjacentHTML('beforeend', settingsHTML());
    const box = host.querySelector('.ml-set');
    box.addEventListener('change', (e) => {
        const t = e.target, k = t.dataset.mlS, lk = t.dataset.mlLook;
        if (k) settings()[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value;
        if (k === 'mascotSound' || k === 'mascotVolume') playMascotSound();
        if (lk) settings().look[lk] = t.type === 'range' ? Number(t.value) : t.value;
        saveSettings(); applyLook(); document.getElementById('ml-hud')?.remove(); refresh();
    });
    box.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-ml]')?.dataset.ml; if (!a) return;
        if (a === 'create-ai') return create(true);
        if (a === 'create-tpl') return create(false);
        if (a === 'open') return ready() ? openSheet('now') : toast('먼저 상태창을 만들어 주세요');
        if (a === 'perf') return showPerf();
        if (a === 'cat') return ready() ? openSheet('cat') : toast('먼저 상태창을 만들어 주세요');
        if (a === 'backup') return backup();
        if (a === 'restore') return restore().then(() => refresh(true));
        if (a === 'card') return toCard();
        if (a === 'migrate') { const n = migrateOld(); toast(n ? `답 ${n}개를 옮겨 왔어요` : '옮길 옛 기록이 없어요', n ? 'good' : 'mid'); refresh(true); }
    });
}
// 꾸미기: 직접 고르기 하나
function applyLook() {
    const L = settings().look, d = document.documentElement.style;
    d.setProperty('--ml-accent', L.accent); d.setProperty('--ml-size', L.size); d.setProperty('--ml-radius', `${L.radius}px`);
    d.setProperty('--ml-border', `${L.border}px`); d.setProperty('--ml-shadow', ['none', '0 1px 3px rgb(0 0 0/.12)', '0 4px 14px rgb(0 0 0/.16)', '0 10px 30px rgb(0 0 0/.24)'][L.shadow] ?? 'none');
    d.setProperty('--ml-font', L.font || 'inherit');
}
// 🏎 부하 재기
function showPerf() {
    const t0 = performance.now(); resetCache(); fold(); const full = performance.now() - t0;
    const t1 = performance.now(); fold(); const inc = performance.now() - t1;
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const T = perf.turns;
    sheet('🏎 부하 재기', card('지금 채팅', row({ icon: '🧮', title: '처음부터 다시 계산', value: `${full.toFixed(1)}ms` }) + row({ icon: '⚡', title: '바뀐 곳만 계산', value: `${inc.toFixed(2)}ms` }) + row({ icon: '🖼', title: '화면 다시 그리기 (평균)', value: `${avg(perf.refresh).toFixed(1)}ms` }) + row({ icon: '💬', title: '메시지', value: `${ctx().chat?.length ?? 0}개` }))
        + card('최근 턴', row({ icon: '⏱', title: '한 턴 처리 (평균)', value: `${avg(T.map(t => t.ms)).toFixed(1)}ms` }) + row({ icon: '🤖', title: '미트볼 AI 호출', sub: '태그가 빠진 턴만', value: `${T.reduce((a, t) => a + t.calls, 0)}회 / ${T.length}턴` }) + row({ icon: '🔤', title: '이번 턴 주입', value: `≈${injTokens(lastInj)}토큰` })));
}
// ───── 시작 ─────
async function boot() {
    settings();
    if (oldActive()) { resting = true; console.info(`[${TITLE}] 옛 미트볼이 켜져 있어서 쉽니다.`); return; }
    applyLook(); mountSettings(); bindOuter(); mountApi(); initMascot();
    const c = ctx(), E = c.event_types, on = (n, f) => n && c.eventSource.on(n, f);
    on(E.GENERATION_AFTER_COMMANDS, onBeforeGen);
    on(E.MESSAGE_RECEIVED, onReceived);
    on(E.MESSAGE_EDITED, onEdited);
    for (const n of [E.CHAT_CHANGED]) on(n, () => { closeSheet(); fromCard(); refresh(true); });
    for (const n of [E.CHARACTER_MESSAGE_RENDERED, E.USER_MESSAGE_RENDERED, E.MESSAGE_SWIPED, E.MESSAGE_DELETED, E.MESSAGE_SWIPE_DELETED, E.MORE_MESSAGES_LOADED, E.MESSAGE_UPDATED]) on(n, () => { bumpMeta(); refresh(); });
    c.SlashCommandParser?.addCommandObject?.(c.SlashCommand.fromProps({ name: 'ml', callback: () => { openSheet('now'); return ''; }, helpString: '미트볼 라이트 열기' }));
    refresh(true);
}
const c0 = ctx();
c0.eventSource.on(c0.event_types.APP_READY, boot);
globalThis.__ML__ = { app, fold, perf, inject, refresh, MODULE, OLD, DATA_V, MODS, tokens, short };
