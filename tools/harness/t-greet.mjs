// 👋 인사말 분류: 새 채팅 · 저장 안 된 채팅에서 같은 인사말이면 AI를 다시 안 부르고 같은 결과
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const calls = () => page.evaluate(() => (window.__sent ?? []).filter(x => x.id === 'p-flash' && /status tracker/.test(x.prompt?.[0]?.content ?? '')).length);
const settle = () => page.evaluate(async () => { const c = await import('/ext/src/rules/classify.js'); for (let k = 0; k < 100 && !c.idle(); k++) await new Promise(r => setTimeout(r, 30)); await new Promise(r => setTimeout(r, 150)); });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); st.settings().mode = 'B'; st.settings().clsProfile = 'p-flash'; st.saveSettings();
        window.__cls = () => '<meatball>\nstatus: 긴장 | 1d\n</meatball>';
        __ML__.app.refresh(true);
    });
    await page.evaluate(() => window.__addAI('인사말 장면. 광장은 시끄러웠다.')); await settle();
    const n1 = await calls();
    const st1 = await page.evaluate(() => __ML__.fold().S.status.map(s => s.name));
    check(n1 === 1 && st1.includes('긴장'), '인사말 분류 1번', `${n1} ${st1}`);
    // 새 채팅처럼: 메시지 칸 · 채팅 메타 캐시가 없는 상태에서 같은 인사말
    await page.evaluate(async () => { const c = SillyTavern.getContext(); delete c.chat[0].extra; const m = __ML__.getMeta(); m.clsCache = {}; const k = await import('/ext/src/rules/classify.js'); k.enqueue(0); });
    await settle();
    const n2 = await calls();
    const st2 = await page.evaluate(() => __ML__.fold().S.status.map(s => s.name));
    check(n2 === n1, '같은 인사말 → AI 다시 안 부름', `${n1} → ${n2}`);
    check(st2.filter(x => x === '긴장').length === 1, '딱지는 한 번만', JSON.stringify(st2));
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
