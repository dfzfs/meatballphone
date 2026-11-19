// 💾 세이브 슬롯: 저장 → 더 진행 → 불러오기(그 상태로 이어서) → 자동 세이브로 되돌리기
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const cash = () => page.evaluate(() => __ML__.fold().S.cash);
const fill = (vals) => page.evaluate((vals) => { for (const [k, v] of Object.entries(vals)) document.querySelector(`#mlf-${k}`).value = v; document.querySelector('.ml-bs [data-bs="ok"]').click(); }, vals);
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(() => window.__addUser('1')); await page.evaluate(() => window.__addAI('a\n<meatball>\ncash: +10\n</meatball>')); await sleep(200);
    await page.evaluate(() => __ML__.app.openSheet('rec')); await sleep(150);
    await page.evaluate(() => document.querySelector('[data-act="sv-save"][data-v="0"]').click()); await sleep(200); await fill({ name: '고백 직전' }); await sleep(300);
    await page.evaluate(() => window.__addAI('b\n<meatball>\ncash: +100\n</meatball>')); await sleep(200);
    check(await cash() === 160, '더 진행 (160)');
    await page.evaluate(() => __ML__.app.openSheet('rec')); await sleep(150);
    await page.evaluate(() => document.querySelector('[data-act="sv-load"][data-v="0"]').click()); await sleep(300);
    check(await cash() === 60, '불러오기 → 저장한 60');
    await page.evaluate(() => window.__addAI('c\n<meatball>\ncash: +5\n</meatball>')); await sleep(200);
    check(await cash() === 65, '불러온 상태에서 이어서 (65)');
    await page.evaluate(() => __ML__.app.openSheet('rec')); await sleep(150);
    await page.evaluate(() => document.querySelector('[data-act="sv-load"][data-v="auto"]').click()); await sleep(300);
    check(await cash() === 165, '자동 세이브로 되돌리기 (불러오기 전 + 이후 답)');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
