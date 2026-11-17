// 🧆 바로 시작: 상태창이 없는 채팅을 열면 틀이 바로 (AI 0회) → 홈에서 관리 › 쓸 기능으로 안내 → 고른 칸만 AI로 채움 · 세부 설정은 칸 밑에
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ auto: true });
try {
    await sleep(2400);
    const Q = (fn, arg) => page.evaluate(fn, arg);
    const meta = () => Q(async () => { const core = await import('/ext/src/core.js'); const m = core.getMeta(); return { base: !!m?.base, auto: m?.auto ?? null, mods: core.MOD_IDS.filter(id => core.modOn(id)).sort().join(','), title: m?.base?.core?.title ?? '' }; });
    await Q(() => { window.__n = 0; window.__ai = () => { window.__n++; return '{}'; }; });
    const calls = () => Q(() => window.__n);
    const m0 = await meta(), c0 = await calls();
    check(m0.base && m0.auto && m0.auto.world === false && m0.auto.tpl.length === 6, '채팅을 열면 틀이 바로 생김 (추천 6칸)', JSON.stringify(m0));
    check(m0.mods === ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar'].sort().join(','), '켜진 칸은 추천 6칸뿐');
    check(c0 === 0, 'AI는 한 번도 안 부름', String(c0));
    // 홈 맨 위의 안내 → 관리 › 쓸 기능
    await Q(() => { window.__SS_TEST__.api.app.openSheet('home'); }); await sleep(400);
    check(await Q(() => !!document.querySelector('dialog .ss-panel .ss-callout[data-act="gomods"]')), '홈 맨 위에 「지금은 틀만 있어요」 안내');
    await Q(() => document.querySelector('dialog .ss-panel .ss-callout[data-act="gomods"]').click()); await sleep(600);
    check(await Q(() => document.querySelectorAll('dialog[open] .ss-panel').length) === 1, '창을 하나 더 띄우지 않고 그 창 안에서 탭만 바뀜');
    check(await Q(async () => (await import('/ext/src/core.js')).settings().mgTab === 'mods' && !!document.querySelector('dialog .ss-mg[data-mg="mods"]:not([hidden]) .ss-pk-fill [data-act="fillchosen"]')), '누르면 관리 › 쓸 기능 — 「고른 대로 채우기」 단추');
    check(await Q(() => { const S = document.querySelector('dialog .ss-mg[data-mg="mods"]'); return !!S.querySelector('[data-act="fillworld"]') && [...S.querySelectorAll('.ss-pk .ss-mod em')].filter(e => e.textContent === '틀만').length === 6; }), '틀뿐인 칸에 「틀만」 표시 · 「세계관만 맞추기」 단추');
    // 세부 설정: 칸 밑 · 서랍과 한 값
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().mgOpen = { 'mods-people': true, 'mods-feed': true, 'cm-send': true }; const m = core.getMeta(true); m.mods.quest = true; await core.saveMeta(); window.__SS_TEST__.api.app.refreshNow(); window.__SS_TEST__.api.app.renderPanel(document.querySelector('dialog .ss-panel')); }); await sleep(400);
    check(await Q(() => !!document.querySelector('dialog .ss-pk[data-pk="rel"] .ss-pk-more [data-chg="setopt"][data-arg="jealousy"]') && !!document.querySelector('dialog .ss-pk[data-pk="quest"] .ss-pk-more [data-chg="setopt"][data-arg="questAsk"]') && !!document.querySelector('dialog [data-fold], dialog .ss-modgrp [data-chg="setopt"][data-arg="injectMode"]')), '칸 밑에 세부 설정 (관계: 질투 · 퀘스트: 완료 확인) · 공통 설정 묶음');
    await Q(() => { const i = document.querySelector('dialog [data-chg="setopt"][data-arg="jealousy"]'); i.checked = !i.checked; i.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
    check(await Q(async () => { const S = (await import('/ext/src/core.js')).settings(), box = document.querySelector('#ss-settings [data-s="jealousy"]'), mine = document.querySelector('dialog [data-chg="setopt"][data-arg="jealousy"]'); return S.jealousy === mine.checked && box.checked === mine.checked; }), '세부 설정을 바꾸면 설정 · 서랍의 같은 칸이 함께 바뀜');
    await Q(() => { const i = document.querySelector('dialog [data-chg="setopt"][data-arg="injectMode"]'); i.value = 'ultra'; i.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
    check(await Q(async () => (await import('/ext/src/core.js')).settings().injectMode) === 'ultra', '고르는 칸(규칙 주입)도 반영');
    // 고른 대로 채우기: 퀘스트를 켰으니 세계관 + 7칸
    const before = await calls();
    await Q(() => { document.querySelector('dialog .ss-pk-fill [data-act="fillchosen"]').click(); }); await sleep(400);
    check(await Q(() => /AI \d+회/.test(document.querySelector('dialog .ss-pk-fill .ss-pk-ask')?.textContent ?? '') && !!document.querySelector('dialog .ss-pk-fill [data-act="fillno"]')) && (await calls()) === before, '한 번 누르면 상자 안에서 「AI N회 — 진행 · 취소」 (확인 창을 따로 안 띄움 · 아직 AI 0회)');
    await Q(() => { document.querySelector('dialog .ss-pk-fill [data-act="fillgo"]').click(); });
    await page.waitForFunction(async () => { const core = await import('/ext/src/core.js'); return !core.getMeta()?.auto; }, null, { timeout: 60000 }).catch(() => {});
    await sleep(500);
    const m1 = await meta(), used = (await calls()) - before;
    check(!m1.auto, '다 채우면 「틀만」 표시가 사라짐', JSON.stringify(m1.auto));
    check(used >= 2, `AI는 「고른 대로 채우기」를 눌렀을 때만 (${used}회)`);
    check(await Q(() => document.querySelectorAll('dialog[open] .ss-panel').length === 1 && !document.querySelector('dialog[open] .ss-panel .ss-pk-fill')), '채우는 동안 창이 그대로 열려 있음 (한 겹) · 채울 게 없으면 채우기 상자가 사라짐');
    // 끄기: 설정 autoStart = false 면 새 채팅에 안 만든다
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().autoStart = false; core.saveSettings(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); await window.__changeChat('c2'); }); await sleep(1200);
    check(!(await meta()).base, '「바로 만들기」를 끄면 새 채팅에 안 만듦');
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().autoStart = true; core.saveSettings(); await window.__changeChat('c3'); }); await sleep(1200);
    check((await meta()).base, '켜면 새 채팅에 다시 바로');
    // 「바로 만들기」를 꺼 둔 채팅: 빈 화면의 큰 단추는 설정 창 없이 틀을 바로 · 예전 만들기 창은 작은 단추로
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().autoStart = false; core.saveSettings(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); await window.__changeChat('c4'); window.__SS_TEST__.api.app.openSheet('home'); }); await sleep(900);
    check(await Q(() => { const el = document.querySelector('dialog .ss-empty'); return !!el?.querySelector('.ss-btn.pri[data-act="quickstart"]') && !!el.querySelector('.ss-btn.ghost[data-act="wizard"]'); }), '빈 화면: 큰 단추 = 바로 시작 · 작은 단추 = 하나씩 골라서 만들기');
    await Q(() => document.querySelector('dialog .ss-empty [data-act="quickstart"]').click()); await sleep(1200);
    check((await meta()).base && !(await Q(() => !!document.querySelector('.ss-wizard'))), '바로 시작을 누르면 설정 창 없이 틀이 생김');
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
