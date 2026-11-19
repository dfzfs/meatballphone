import { open, sleep } from './lib.mjs';
const { page, close } = await open({ width: 1440, height: 900 });
try {
    await page.addStyleTag({ content: 'input[type="range"]{width:100%}' });
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('시장'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\nwith: Leon\nbuy: 빵 | 3\nact: Leon | 칭찬\nstatus: 감기 | 2d\npromise: Leon과 저녁 식사 | 1d\nlife: Leon | 경비 교대 뒤 술집에 들렀다\n</meatball>'));
    await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200); await page.screenshot({ path: '/tmp/h-lap.png' });
    await page.evaluate(() => document.querySelector('.ml-body').scrollTo(0, 9999)); await sleep(100); await page.screenshot({ path: '/tmp/h-lap2.png' });
    await page.evaluate(() => document.querySelector('.ml-app[data-v="dice"]').click()); await sleep(200);
    await page.evaluate(() => document.querySelector('.ml-dbtn').click()); await sleep(900); await page.screenshot({ path: '/tmp/h-dice.png' });
    await page.evaluate(() => document.querySelector('.ml-top .back').click()); await sleep(100);
    await page.evaluate(() => document.querySelector('.ml-app[data-v="market"]').click()); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="uninstall"][data-v="news"]').click()); await sleep(300);
    await page.screenshot({ path: '/tmp/h-market.png' });
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200); await page.screenshot({ path: '/tmp/h-ph.png' });
    console.log(await page.evaluate(() => window.__errors.join('\n') || 'no errors'));
} finally { await close(); }
