// 🔍 칩 점검 · 🩺 자가 진단
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('1'));
    await page.evaluate(() => window.__addAI('a\n<meatball>\ncash: +30 | 용돈\nbogus: 이상한 키\nused: 없는물건\n</meatball>')); await sleep(300);
    const h = await page.evaluate(async () => { const d = await import('/ext/src/extra/doctor.js'); return d.chipCheck(1); });
    check(/cash: \+30/.test(h) && /💰 재산/.test(h) && /ml-chk good/.test(h), '읽힌 줄 → 앱 · 바뀐 값', '');
    check(/bogus/.test(h) && /모르는 키/.test(h), '모르는 키 표시');
    check(/없는 물건/.test(h) && /ml-chk bad/.test(h), '확인 필요 줄 표시');
    await page.evaluate(() => __ML__.app.openSheet('gauge')); await sleep(150);
    await page.evaluate(() => document.querySelector('#ml-full [data-act="doctor"]').click()); await sleep(300);
    const t = await page.evaluate(() => [...document.querySelectorAll('.ml-bs')].pop()?.textContent ?? '');
    check(t.includes('자가 진단') && /태그 쓴 답 100%/.test(t) && /모르는 키 1종/.test(t) && /확인 필요 1개/.test(t), '자가 진단 표', t.slice(0, 300));
    await page.evaluate(() => document.querySelector('.ml-msg [data-act="turncard"]')?.click() ?? document.querySelector('.ml-msg .ml-chip')?.click()); await sleep(200);
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
