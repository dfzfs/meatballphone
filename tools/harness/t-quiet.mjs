// 🔕 조용히 (새로 설치하면 켬): 저절로 뜨는 알림 · 안내 · 번역 경고는 화면에 안 띄우고 알림함에만 · ⚠️ 고장 알림은 그대로 · 끄면 예전처럼
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ auto: true, style: true, quiet: true, defaults: true });
const Q = (fn, arg) => page.evaluate(fn, arg);
try {
    await Q(() => { window.__shown = 0; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.matches?.('.ss-toast')) window.__shown++; }).observe(document.body, { childList: true, subtree: true }); });
    await sleep(2800);
    const s0 = await Q(async () => { const s = (await import('/ext/src/core.js')).settings(); return { quiet: s.quiet, ft: s.featureTips, at: s.actionTips }; });
    check(s0.quiet === true && s0.ft === false && s0.at === false, '새로 설치: 조용히 켬 · 팁 끔', JSON.stringify(s0));
    await Q(() => document.querySelector('dialog[open] .ss-stylepick')?.closest('dialog')?.querySelector('.popup-button-ok')?.click()); await sleep(300);
    const t0 = await Q(() => window.__toasts.length);
    for (let i = 0; i < 6; i++) {
        await Q((i) => window.__addUser(`hi ${i}`), i); await sleep(200);
        await Q((i) => window.__addAI(`Leon smiled. <tracker>x</tracker>\n<meatball>\ncash: -${100 + i}\naff: Leon +2\ntime: +3h\n${i === 4 ? 'day: +1\n' : ''}</meatball>`), i); await sleep(1200);
    }
    // 번역이 실패해도
    await Q(async () => { const tr = await import('/ext/src/translate.js'); const core = await import('/ext/src/core.js'); core.settings().trEngine = 'llm'; window.__ai = () => { throw new Error('no translator'); }; for (let i = 0; i < 3; i++) await tr.trJSON({ name: 'Hello there ' + i }); });
    await sleep(500);
    const r = await Q(async () => { const core = await import('/ext/src/core.js'); return { toasts: window.__toasts.slice(0).map(t => t.msg.slice(0, 60)), shown: window.__shown, notes: (core.getMeta()?.notes ?? []).map(n => n.icon + n.title) }; });
    check(r.shown === 0, '화면에 뜬 알림 팝업 0개', String(r.shown));
    check(r.toasts.length === t0, '실리 알림(toastr)도 저절로는 0개', JSON.stringify(r.toasts));
    check(r.notes.length >= 2 && r.notes.some(n => n.includes('번역')) && r.notes.filter(n => n.includes('번역')).length === 1, '대신 알림함에 쌓임 · 번역 실패는 한 번만', JSON.stringify(r.notes));
    check(await Q(() => !!document.querySelector('#ss-settings input[data-s="quiet"]')?.checked), '확장 설정에 「🔕 조용히」 체크 칸');
    // ⚠️ 고장 알림은 그대로
    await Q(async () => { (await import('/ext/src/notify.js')).notify({ kind: 'text', icon: '⚠️', title: '테스트 고장', text: 'x' }); }); await sleep(300);
    check(await Q(() => window.__shown) === 1, '⚠️ 고장 알림은 조용히여도 뜸');
    // 끄면 예전처럼 뜸
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().quiet = false; core.saveSettings(); (await import('/ext/src/notify.js')).notify({ kind: 'text', icon: '📌', title: '보통 알림', text: 'y' }); }); await sleep(300);
    check(await Q(() => window.__shown) === 2, '조용히를 끄면 예전처럼 화면에 뜸');
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
