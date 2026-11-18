// 🌐 번역 알림 (trNotice · 기본 끔): 「한국어로 저장된 칸」 · 「번역 실패」가 화면에도 알림함에도 안 뜸 · 켜면 예전처럼
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ defaults: true });
const Q = (fn, arg) => page.evaluate(fn, arg);
try {
    await sleep(1500);
    const def = await Q(async () => (await import('/ext/src/core.js')).settings().trNotice);
    check(def !== true, '기본: 번역 알림 꺼짐', String(def));
    const run = (tag) => Q(async (tag) => {
        const core = await import('/ext/src/core.js'); const tr = await import('/ext/src/translate.js');
        const before = window.__toasts.length, n0 = (core.getMeta()?.notes ?? []).length;
        core.settings().trEngine = 'llm'; window.__ai = () => { throw new Error('no translator ' + tag); };
        await tr.trJSON({ name: 'Hello ' + tag });
        const toasts = window.__toasts.slice(before).map(t => t.msg.slice(0, 50));
        return { toasts, notes: (core.getMeta()?.notes ?? []).slice(n0).map(n => n.title) };
    }, tag);
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().quiet = false; core.saveSettings(); });
    const off = await run('a');
    check(!off.toasts.some(t => t.includes('번역')) && !off.notes.some(n => n.includes('번역')), '꺼짐: 번역 실패 알림 안 뜸 (화면 · 알림함 둘 다)', JSON.stringify(off));
    // 켜면 예전처럼 (꺼진 동안의 실패는 「알렸음」으로 치지 않음)
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().trNotice = true; core.saveSettings(); });
    const on = await run('b');
    check(on.toasts.some(t => t.includes('번역')), '켜면: 번역 실패 알림이 뜸', JSON.stringify(on));
    const box = await Q(() => !!document.querySelector('#ss-settings input[data-s="trNotice"]'));
    check(box, '확장 설정에 「🌐 번역 알림 띄우기」 체크 칸');
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
