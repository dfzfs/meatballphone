// 미트볼폰 — 실리태번 이벤트 연결
import { app, ctx, settings, saveSettings, getMeta, saveMeta, msgData, syncSwipe, ready, MODULE, OLD, VERSION, TITLE, INJ, MODS, DATA_V, bumpMeta, modOn, saveChatSoon, genStarted, genEnded, isGenerating, shutKey, aiNoOf, tidyEyes } from './src/base/st.js';
import { esc, short, tokens, dateOf } from './src/base/util.js';
import { readOps, stripTags, hasTag } from './src/rules/tags.js';
import { fold, resetCache, noteRules } from './src/rules/engine.js';
import { normBook, personOf, isStar } from './src/rules/book.js';
import { ruleText, factText, injTokens } from './src/rules/inject.js';
import { fillBook, templateBook } from './src/rules/ai.js';
import { mode, modeNote, profiles, enqueue, fingerprint, newPeople, fillPerson, clsStats, testConnection, presetText } from './src/rules/classify.js';
import { CURRENT, currentApi, resetThink } from './src/rules/clsconn.js';
import { parseStart, firstMessage } from './src/rules/firstmsg.js';
import { drawFrame, drawChips, drawSheet, openSheet, closeSheet, openPast, bindOuter } from './src/ui/frame.js';
import { sheet, toast, row, card } from './src/ui/kit.js';
import { findAll } from './src/extra/find.js';
import { initMascot, playMascotSound, MASCOT_SOUNDS } from './src/ui/mascot.js';
import { mount as mountApi, announce } from './src/extra/api.js';
import { backup, restore, toCard, fromCard, migrateOld, oldActive } from './src/extra/safe.js';
import { initLog, reportSheet } from './src/extra/report.js';

const perf = { turns: [], refresh: [] };
let resting = false;

// ───── 새로 그리기 (한 번에 묶어서) ─────
let pending = 0;
export function refresh(force = false) {
    if (resting) return;
    if (force) resetCache();
    { const meta = getMeta(); if (ready(meta) && noteRules(meta, ctx().chat?.length ?? 0)) saveMeta(); } // 📐 숫자 규칙을 고쳤으면 「여기부터」 새 판
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
    if (!settings().enabled || !ready(meta) || meta.paused || meta.off || meta.setup) return setInj({}); // 앱을 고르기 전엔 본편에 아무것도
    const r = fold(); if (!r) return setInj({});
    const chat = ctx().chat ?? []; let li = chat.length - 1; while (li >= 0 && (chat[li].is_user || chat[li].is_system)) li--;
    const ft = factText(r, li >= 0 ? r.changes[li] ?? [] : []);
    setInj({ rule: mode() === 'A' ? ruleText(r.book) : '', ...ft }); // B: 본편은 소설만 (적는 법 규칙 뺌)
}
app.create = (useAI) => create(useAI);
app.refresh = refresh; app.inject = inject; app.applyLook = () => applyLook(); app.lastInj = () => lastInj; app.perfLast = () => perf.turns.at(-1) ?? null; app.perfData = () => perf; app.openSheet = openSheet; app.closeSheet = closeSheet; app.openPast = openPast;
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
    if (!m || m.is_user || !ready(meta) || !settings().enabled || meta.setup) return;
    const sl = msgData(m, true);
    // 메시지 글(mes)은 답이 다 온 뒤(MESSAGE_RECEIVED) 여기서 한 번만 고침 · 태그가 있을 때만
    const strip = (t) => (hasTag(t) ? stripTags(t) : t);
    const skip = (type === 'quiet' || quietGen) && settings().skipQuiet;
    const t0 = performance.now();
    if (skip || meta.paused || skipThis) {
        // 조용한 생성 · 일시정지 · 다음 1번 건너뛰기 · OOC → 이 답은 셈하지 않음 (분류도 안 부름)
        sl.ops = []; sl.skip = true; m.mes = strip(m.mes);
        if (skipThis && meta.skipNext) { meta.skipNext = false; saveMeta(); }
        skipThis = false; quietGen = false;
    } else if (mode() === 'B') {
        // B: 본편은 소설만 → 답은 바로 보여 주고, 분류 모델이 고른 결과가 오면 칩을 붙임
        delete sl.skip; m.mes = strip(m.mes); sl.src = 'cls';
        if (sl.fp !== fingerprint(i)) { sl.ops = []; delete sl.fp; }
        enqueue(i);
    } else {
        // A: 본편이 적은 태그만 (추가 호출 0회)
        delete sl.skip; sl.src = 'tag'; delete sl.fp;
        sl.ops = (hasTag(m.mes) ? readOps(m.mes) : []).filter(([k]) => !shutKey(k, aiNoOf(i))); m.mes = strip(m.mes); // 😌 눈 감은 앱 줄은 버림
    }
    tidyEyes();
    delete sl.fill;
    sl.rev = (sl.rev ?? 0) + 1; bumpMeta();
    if (Array.isArray(m.swipes) && typeof m.swipe_id === 'number') m.swipes[m.swipe_id] = m.mes;
    syncSwipe(m);
    saveChatSoon();
    perf.turns.push({ ms: performance.now() - t0, mode: mode(), calls: 0, tok: injTokens(lastInj), inj: Object.values(lastInj).join('').length });
    if (perf.turns.length > 30) perf.turns.shift();
    refresh(); setTimeout(alerts, 300);
}
// 분류 결과가 왔을 때: 칩 · 알림 · 처음 나온 인물 규칙 채우기 (그 인물당 한 번)
app.afterClassify = (i) => {
    const t = perf.turns.at(-1); if (t) { t.calls = (t.calls ?? 0) + 1; t.cls = clsStats.lastTok; }
    refresh(); setTimeout(alerts, 300);
    // 새 인물은 ⭐ 주요 인물일 때만 규칙을 채움 (그 외 인물은 기본 행동만 · AI 호출 없음)
    if (mode() === 'B') { const m = getMeta(), r = fold(); for (const [n, why] of newPeople()) if (r && isStar(m, r.book, n)) fillPerson(n, why); }
};
app.reclassify = (i) => { if (mode() !== 'B') return toast('분류 모델(B)일 때만 다시 고를 수 있어요'); enqueue(i, true); };
app.fillPerson = (n) => fillPerson(n);
// 옛 스와이프로 돌아오면 저장된 결과 · 결과가 없는 스와이프면 (같은 글이면 저장된 것으로) 고르기
function onSwiped(i) {
    bumpMeta(); refresh();
    if (mode() !== 'B') return;
    setTimeout(() => {
        const m = ctx().chat?.[i]; if (!m || m.is_user || !ready()) return;
        const sl = msgData(m), txt = stripTags(m.mes ?? '').trim();
        if (txt.length < 2 || sl?.skip || (sl?.src === 'cls' && sl.fp === fingerprint(i))) return;
        if (sl) enqueue(i); // 새로 만드는 스와이프는 받기(MESSAGE_RECEIVED)에서
    }, 0);
}
function onEdited(i) {
    bumpMeta(); // 앞쪽 메시지를 고쳐도 다시 계산되게
    const m = ctx().chat?.[i]; if (!m || m.is_user) return refresh();
    if (isGenerating()) return refresh(); // 답을 받는 중엔 글을 안 건드림 (끝나면 받기에서 한 번)
    const sl = msgData(m);
    if (mode() === 'B') {
        // 글이 바뀌었을 때만 다시 고르기
        if (hasTag(m.mes)) { m.mes = stripTags(m.mes); syncSwipe(m); saveChatSoon(); }
        if (!sl?.skip && sl?.fp !== fingerprint(i)) enqueue(i);
    } else if (hasTag(m.mes)) {
        const s2 = msgData(m, true); s2.ops = readOps(m.mes); s2.src = 'tag'; s2.rev = (s2.rev ?? 0) + 1; bumpMeta(); m.mes = stripTags(m.mes); syncSwipe(m); saveChatSoon();
    }
    refresh();
}

// ───── 🔔 하루 전 알림: 약속 · 마감 · 생일 · 기념일 (한 번씩만) ─────
function alerts() {
    const meta = getMeta(), r = fold(); if (!r) return;
    const { S, book } = r, sent = new Set(meta.alerted ?? []), out = [];
    for (const p of S.promises) if (!p.done && p.due != null && p.due >= S.t && p.due - S.t <= 1440) out.push([`p|${p.text}|${p.due}`, `📅 하루 안: ${p.text}`]);
    const day0 = Math.floor(S.t / 1440);
    for (const p of book.people) {
        const m = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(p.day || '');
        if (!m) continue;
        for (const k of [0, 1]) {
            const d = dateOf(book.world.start, (day0 + k) * 1440);
            if (d.m === Number(m[1]) && d.d === Number(m[2])) out.push([`b|${p.name}|${d.y}`, `🎂 ${k ? '내일' : '오늘'} ${p.name} ${p.day}`]);
        }
    }
    // 🎵 곡이 바뀌면 작은 알림 (설정에서 끄기)
    if (modOn('music') && settings().musicPop !== 'off' && S.bgm) {
        const chat = ctx().chat ?? []; let li = chat.length - 1; while (li >= 0 && (chat[li].is_user || chat[li].is_system)) li--;
        if (S.bgm.m === li) out.push([`s|${li}|${chat[li]?.swipe_id ?? 0}|${S.bgm.title}`, `🎵 ${S.bgm.title}${S.bgm.artist ? ` · ${S.bgm.artist}` : ''}`]);
    }
    // 💭 속마음이 뜨면 알림 (방금 답의 것만 · 같은 건 한 번)
    if (modOn('mind') && meta.mindPop !== 'off') {
        const chat = ctx().chat ?? [];
        let li = chat.length - 1;
        while (li >= 0 && (chat[li].is_user || chat[li].is_system)) li--;
        const IC = { mind: '💭', watch: '👀', cell: '🧠' };
        for (const e of (S.mindLog ?? []).filter((e) => e.m === li))
            out.push([
                `m|${li}|${chat[li]?.swipe_id ?? 0}|${e.who}|${e.text}`,
                `${personOf(book, e.who)?.face ?? IC[e.k]} ${e.who} · ${e.text}`,
                'mind',
            ]);
    }
    let n = 0; for (const [k, t, kind] of out) if (!sent.has(k)) { sent.add(k); toast(t, kind ?? 'mid'); n++; }
    if (n) { meta.alerted = [...sent].slice(-80); saveMeta(); }
}
// ───── 상태창 만들기 ─────
async function create(useAI) {
    const meta = getMeta(true), first = !meta.book;
    let b = null;
    if (useAI) { toast('로어북 · 카드를 읽고 설정집을 채우는 중…'); try { const { book, src } = await fillBook(); if (book) { b = normBook(book); b.src = { from: 'ai', at: Date.now(), sig: src.sig }; } } catch (e) { console.warn(e); } if (!b) toast('AI로 못 채워서 기본 틀로 시작해요', 'bad'); }
    b ??= templateBook();
    if (!b.people.length) b.people = templateBook().people;
    // 시작 상태: 첫 메시지의 돈 · 시각 · 장소를 먼저 (못 읽으면 끼니 값 × 5 · 집)
    if (!meta.start) {
        const fm = parseStart(firstMessage(), b);
        if (fm.clock != null) b.world.start.clock = fm.clock;
        meta.start = { cash: fm.cash ?? b.world.meal * 5, loc: fm.loc ?? b.world.places.find(p => p.kind === 'home')?.name ?? '', from: Object.keys(fm).length ? 'first' : 'default' };
    }
    meta.book = b;
    // 처음 만든 설정집이면 앱은 아직 안 깔림 → 🛍️ 쓸 앱 고르기 한 화면 (직접 쓰기면 시작 뒤 설정집으로)
    if (first) { meta.setup = true; meta.setupThen = useAI ? 'home' : 'book'; for (const k of Object.keys(meta.mods)) meta.mods[k] = false; }
    saveMeta(); refresh(true); openSheet(first ? 'home' : 'book');
}

// ───── 확장 설정 서랍 (남긴 설정만) ─────
function settingsHTML() {
    const s = settings();
    const sw = (k, label) => `<label class="checkbox_label"><input type="checkbox" data-ml-s="${k}" ${s[k] ? 'checked' : ''}> ${label}</label>`;
    // 실리태번 연결 프로필 고르기 (목록이 없으면 이름을 직접)
    const prof = (k, label, none) => {
        const P = profiles();
        if (!P.length) return `<label>${label} <input class="text_pole" data-ml-s="${k}" value="${esc(s[k])}" placeholder="연결 프로필 id · 비우면 ${none}"></label>`;
        return `<label>${label} <select class="text_pole" data-ml-s="${k}"><option value="">${esc(none)}</option>${P.map(p => `<option value="${esc(p.id)}" ${s[k] === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>`;
    };
    // 분류 모델 연결: 고르지 않음 · 지금 쓰는 API에서 모델만 · 연결 프로필
    const clsPick = () => {
        const P = profiles(), cur = s.clsProfile === CURRENT, a = currentApi();
        const opts = [['', '고르지 않음 → A로'], [CURRENT, `지금 쓰는 API에서 모델만 고르기 (${a.src || a.main || '?'})`], ...P.map(p => [p.id, `프로필: ${p.name}`])];
        if (s.clsProfile && !opts.some(o => o[0] === s.clsProfile)) opts.push([s.clsProfile, `프로필 id: ${s.clsProfile}`]);
        return `<label>분류 모델 연결 (가벼운 모델) <select class="text_pole" data-ml-s="clsProfile">${opts.map(([v, l]) => `<option value="${esc(v)}" ${s.clsProfile === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`
            + (cur ? `<label>분류 모델 이름 <input class="text_pole" data-ml-s="clsModel" value="${esc(s.clsModel)}" placeholder="비우면 지금 모델 (${esc(a.model || '?')}) · 예: gemini-3.8-flash"></label>` : '')
            + `<small class="ml-set-note">🧼 ${esc(presetText())}</small>`
            + `<div class="ml-set-btns"><button class="menu_button" data-ml="cls-test">🔌 분류 연결 시험</button></div><div class="ml-cls-test"></div>`;
    };
    const sel = (k, label, opts) => `<label>${label} <select class="text_pole" data-ml-s="${k}">${opts.map(([v, l]) => `<option value="${v}" ${String(s[k]) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    return `<div class="inline-drawer ml-set"><div class="inline-drawer-toggle inline-drawer-header"><b>😼 ${TITLE} <small>v${VERSION}</small></b><div `
        + `class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content">
${sw('enabled', '켜기')}
<div class="ml-set-btns"><button class="menu_button" data-ml="create-ai">📘 상태창 만들기 (AI 1회)</button><button class="menu_button" `
        + `data-ml="create-tpl">⚡ 바로 시작 (AI 0회)</button><button class="menu_button" data-ml="open">펼치기</button></div>
<h4>화면</h4>${sw('hud', 'HUD')}${sel('hudPos', 'HUD 자리', [['top', '위'], ['bottom', '아래']])}${sw('minibar', '미니바')}${sw('mascot', '마스코트')}`
        + `${sel('mascotSound', '마스코트 누르면 나는 소리', MASCOT_SOUNDS)}<label>효과음 크기 <input type="range" min="0" max="100" step="5" `
        + `data-ml-s="mascotVolume" value="${s.mascotVolume}"></label><div class="ml-set-btns"><button class="menu_button" data-ml="cat">😺 마스코트 `
        + `고르기</button></div>
<h4>꾸미기</h4><label>강조색 <input type="color" data-ml-look="accent" value="${s.look.accent}"></label> <label>글자 크기 <input type="range" min="0.85" `
        + `max="1.3" step="0.05" data-ml-look="size" value="${s.look.size}"></label> <label>모서리 <input type="range" min="0" max="24" step="2" `
        + `data-ml-look="radius" value="${s.look.radius}"></label> <label>테두리 <input type="range" min="0" max="3" step="1" data-ml-look="border" `
        + `value="${s.look.border}"></label> <label>그림자 <input type="range" min="0" max="3" step="1" data-ml-look="shadow" value="${s.look.shadow}">`
        + `</label> <label>글꼴 <input class="text_pole" data-ml-look="font" value="${esc(s.look.font)}" placeholder="비우면 실리태번 글꼴"></label>
<h4>AI</h4>${sel('preset', '본편 지시', [['flash', '플래시용 (짧은 키 + 예시)'], ['general', '일반']])}`
        + `${sw('skipQuiet', '퀵리플라이 · /gen 답엔 안 붙이기')}${sw('ooc', 'OOC 메시지는 건너뛰기')}
${sel('mode', '사건 고르기', [['B', 'B. 분류 모델 (본편은 소설만 · 답마다 1회)'], ['A', 'A. 본편 태그 (추가 호출 0회)']])}${clsPick()}`
        + `${modeNote() ? `<small class="ml-set-note">⚠ ${esc(modeNote())}</small>` : ''}${prof('profile', '상태창 만들기 · 번역 연결', '지금 연결')}
${sel('pinBook', '장면 인물의 증상 한 줄 본편에', [['auto', '붙이기'], ['off', '안 붙이기']])}
<h4>번역</h4>${sel('saveLang', '상태창 저장 언어', [['ko', '한국어'], ['en', '영어 (화면만 한국어로)']])}`
        + `${sel('trAuto', '모르는 말', [['ai', '모아서 AI로 번역 (1회씩)'], ['off', '직접 고친 것만']])}
<h4>저장 · 옮기기</h4><div class="ml-set-btns"><button class="menu_button" data-ml="perf">🏎 부하 재기</button><button class="menu_button" data-ml="report">📋 전체 복사</button><button class="menu_button" data-ml="doctor">🩺 `
        + `자가 진단</button><button class="menu_button" data-ml="backup">💾 백업</button><button class="menu_button" data-ml="restore">📂 불러오기</button>`
        + `<button class="menu_button" data-ml="card">🃏 카드에 붙이기</button><button class="menu_button" data-ml="migrate">🍖 옛 미트볼 옮겨 오기</button></div>
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
        if (k === 'mode' || k === 'clsProfile') mountSettings();
        if (k === 'clsProfile' || k === 'clsModel') resetThink(); // 「A로 돌아감」 알림 다시 그리기
    });
    box.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-ml]')?.dataset.ml; if (!a) return;
        if (a === 'create-ai') return create(true);
        if (a === 'create-tpl') return create(false);
        if (a === 'open') return openSheet(ready() ? 'now' : 'home');
        if (a === 'perf') return showPerf();
        if (a === 'cls-test') return clsTest(box.querySelector('.ml-cls-test'), e.target.closest('button'));
        if (a === 'report') return reportSheet();
        if (a === 'doctor') { const d = await import('./src/extra/doctor.js'); return d.doctor(app, perf); }
        if (a === 'cat') return ready() ? openSheet('cat') : toast('먼저 상태창을 만들어 주세요');
        if (a === 'backup') return backup();
        if (a === 'restore') return restore().then(() => refresh(true));
        if (a === 'card') return toCard();
        if (a === 'migrate') { const r = migrateOld(); toast(r ? `옮겼어요 · 시작값(#${r.start}부터) · 답 ${r.ops}개 · 인물 ${r.people}명 · 물건 ${r.items}개${r.later ? ` · 손 고침 ${r.later}개` : ''}${r.skipped ? ` · 못 옮긴 고침 ${r.skipped}개` : ''}` : '옮길 옛 기록이 없어요', r ? 'good' : 'mid'); refresh(true); }
    });
}
// 🔌 분류 연결 시험 → 결과를 버튼 아래에 바로
async function clsTest(out, btn) {
    if (!out) return;
    btn && (btn.disabled = true); out.innerHTML = '<small>⏳ 견본 답 하나를 분류하는 중…</small>';
    const r = await testConnection();
    btn && (btn.disabled = false);
    const ops = (r.ops ?? []).map(([k, v]) => `${k}: ${v}`).join(' · ');
    out.innerHTML = `<div class="ml-cls-res ${r.ok ? 'good' : 'bad'}"><b>${r.ok ? '✅ 성공' : '❌ 실패'}</b> · ${r.ms}ms · ${esc(r.route)}`
        + `${r.ok ? `<br>고른 사건: ${esc(ops)}` : `<br>오류: <code>${esc(r.error ?? '')}</code>`}${r.reply ? `<details><summary>받은 답</summary><pre>${esc(String(r.reply).slice(0, 1500))}</pre></details>` : ''}</div>`;
    console.info(`[${TITLE}] 분류 연결 시험 ${r.ok ? '성공' : '실패'} · ${r.ms}ms · ${r.route}${r.ok ? '' : ` · ${r.error}`}`);
}
// 꾸미기: 직접 고르기 하나
// 🎨 테마 값 → CSS 변수 (--ml-accent · --ml-font · --ml-size · --ml-radius · --ml-border · --ml-shadow) — 문서 전체에 걸어서 다른 확장도 읽음
function applyLook() {
    const L = settings().look, d = document.documentElement.style;
    d.setProperty('--ml-accent', L.accent); d.setProperty('--ml-size', L.size); d.setProperty('--ml-radius', `${L.radius}px`);
    d.setProperty('--ml-border', `${L.border}px`); d.setProperty('--ml-shadow', ['none', '0 1px 3px rgb(0 0 0/.12)', '0 4px 14px rgb(0 0 0/.16)', '0 10px 30px rgb(0 0 0/.24)'][L.shadow] ?? 'none');
    d.setProperty('--ml-font', L.font || getComputedStyle(document.body).fontFamily || 'sans-serif'); // 안 고르면 실리태번 글꼴 그대로
}
// 🏎 부하 재기
function showPerf() {
    const t0 = performance.now(); resetCache(); fold(); const full = performance.now() - t0;
    const t1 = performance.now(); fold(); const inc = performance.now() - t1;
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const T = perf.turns;
    sheet(
        '🏎 부하 재기',
        card(
            '지금 채팅',
            row({ icon: '🧮', title: '처음부터 다시 계산', value: `${full.toFixed(1)}ms` }) +
                row({ icon: '⚡', title: '바뀐 곳만 계산', value: `${inc.toFixed(2)}ms` }) +
                row({ icon: '🖼', title: '화면 다시 그리기 (평균)', value: `${avg(perf.refresh).toFixed(1)}ms` }) +
                row({ icon: '💬', title: '메시지', value: `${ctx().chat?.length ?? 0}개` }),
        ) +
            card(
                '최근 턴',
                row({ icon: '⏱', title: '한 턴 처리 (평균)', value: `${avg(T.map((t) => t.ms)).toFixed(1)}ms` }) +
                    row({
                        icon: '🤖',
                        title: '미트볼 AI 호출',
                        sub: '태그가 빠진 턴만',
                        value: `${T.reduce((a, t) => a + t.calls, 0)}회 / ${T.length}턴`,
                    }) +
                    row({ icon: '🔤', title: '이번 턴 주입', value: `≈${injTokens(lastInj)}토큰` }),
            ),
    );
}
// ───── 시작 ─────
async function boot() {
    initLog(); settings(); applyLook(); // 테마 변수는 늘 열어 둔다 (선택지 확장이 미트볼폰 디자인을 따름)
    if (oldActive()) { resting = true; console.info(`[${TITLE}] 옛 미트볼이 켜져 있어서 쉽니다.`); return; }
    // 🔁 같은 확장이 두 번 깔린 경우(옛 「미트볼 라이트」 폴더 + 새 「meatballphone」 폴더): 새 폴더 쪽만 돈다
    const folder = (import.meta.url.match(/third-party\/([^/]+)\//) ?? [])[1] ?? '', hasNew = [...document.querySelectorAll('script[src]')].some(e => /third-party\/meatballphone\//i.test(e.src));
    if ((folder && folder !== 'meatballphone' && hasNew) || globalThis.__meatballPhoneBoot) {
        resting = true; console.warn(`[${TITLE}] 같은 확장이 두 번 깔려 있어서 이쪽(${folder || '?'})은 쉽니다.`);
        setTimeout(() => toastr?.warning?.(`미트볼폰이 두 번 깔려 있어요. 실리태번 › 확장 관리에서 옛 「${folder || '미트볼 라이트'}」를 지워 주세요.`, '미트볼폰'), 1500);
        return;
    }
    globalThis.__meatballPhoneBoot = folder || 'dev';
    mountSettings(); bindOuter(); mountApi(); initMascot();
    const c = ctx(), E = c.event_types, on = (n, f) => n && c.eventSource.on(n, f);
    on(E.GENERATION_AFTER_COMMANDS, onBeforeGen);
    // 💾 저장 시점: 답을 받는 중엔 안 함 · 끝나고 1초 뒤 한 번 (윈도우 EPERM 겹침 막기)
    on(E.GENERATION_STARTED, genStarted);
    for (const n of [E.GENERATION_ENDED, E.GENERATION_STOPPED]) on(n, genEnded);
    on(E.MESSAGE_RECEIVED, async (...a) => { await onReceived(...a); genEnded(); });
    on(E.MESSAGE_EDITED, onEdited);
    for (const n of [E.CHAT_CHANGED]) on(n, () => { closeSheet(); fromCard(); refresh(true); });
    on(E.MESSAGE_SWIPED, onSwiped);
    for (const n of [E.CHARACTER_MESSAGE_RENDERED, E.USER_MESSAGE_RENDERED, E.MESSAGE_DELETED, E.MESSAGE_SWIPE_DELETED, E.MORE_MESSAGES_LOADED, E.MESSAGE_UPDATED]) on(n, () => { bumpMeta(); refresh(); });
    c.SlashCommandParser?.addCommandObject?.(c.SlashCommand.fromProps({ name: 'ml', callback: () => { openSheet('now'); return ''; }, helpString: '미트볼폰 열기' }));
    refresh(true);
}
const c0 = ctx();
c0.eventSource.on(c0.event_types.APP_READY, boot);
globalThis.__ML__ = { app, fold, perf, inject, refresh, getMeta, MODULE, OLD, DATA_V, MODS, tokens, short };
