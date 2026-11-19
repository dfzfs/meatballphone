import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.addStyleTag({ content: 'input[type="range"]{width:100%}' });
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\nbuy: 빵\n</meatball>')); await sleep(300);
    check(await page.evaluate(() => [...document.querySelectorAll('.ml-msg .ml-chip')].some(c => c.textContent.includes('🧾'))), '영수증 칩');
    check(await page.evaluate(() => document.querySelectorAll('#ml-hud .ml-h.shop').length >= 2), 'HUD 가게 한 줄');
    await page.evaluate(() => __ML__.app.openSheet('look')); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="look-set"][data-v="accent|#7c5cff"]').click()); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="look-set"][data-v="font|Galmuri11"]').click()); await sleep(400);
    check(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ml-accent').trim()) === '#7c5cff', '꾸미기: 강조색 바로 반영');
    await page.screenshot({ path: '/tmp/look.png' });
    await page.evaluate(() => document.querySelector('[data-act="look-reset"]').click()); await sleep(200);
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(150);
    await page.evaluate(() => document.querySelector('[data-act="askprice"]').click()); await sleep(200);
    await page.evaluate(() => { document.querySelector('#mlf-q').value = '하룻밤 숙박'; document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(300);
    check(await page.evaluate(() => /약 40/.test(document.querySelector('.ml-bs')?.textContent ?? '')), '물가 물어보기 (식사 × 4)');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
