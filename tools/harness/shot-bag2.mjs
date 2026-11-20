import { open, sleep } from './lib.mjs';
const { page, close } = await open({ width: 420, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => { const m = __ML__.getMeta(); m.book.world.currency = '동화'; m.book.world.meal = 3; m.book.me.needs.push({ key: 'calm', name: '정신 안정', icon: '🕊️', start: 45, rate: 6, max: 100 });
        m.book.world.places[0].goods = [{ name: '신선한 갈비 한 덩이', price: 3, fx: { hunger: 35 } }, { name: '원두 한 줌', price: 2, fx: { calm: 10 } }]; __ML__.app.refresh?.(true); });
    const A = await page.evaluate(() => __ML__.getMeta().book.people[0].name);
    const turn = async (b) => { await page.evaluate(() => window.__addUser('.')); await page.evaluate((b) => window.__addAI(`a\n<meatball>\n${b}\n</meatball>`), b); await sleep(250); };
    await turn('earn: 120 | 진료비\nbuy: 신선한 갈비 한 덩이 | 3\nwear: 낡은 후드 로브\nbuy: 원두 한 줌 | 2');
    await turn('time: +1d\nbuy: 털장갑 | 8\ncash: -5 | 하준 생일 선물\ngot: 녹슨 열쇠');
    await turn(`time: +1d\nwith: ${A}\ngot: 은반지\nbuy: 산사과 | 1`);
    await page.evaluate(() => { const m = __ML__.getMeta(); m.book.world.fx = { rate: 1000, unit: '원' }; __ML__.app.refresh?.(true); }); await sleep(200); await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(500);
    await page.screenshot({ path: '/tmp/bag1.png', fullPage: false });
    await page.evaluate(() => document.querySelector('#ml-full .ml-body')?.scrollBy(0, 600)); await sleep(200);
    await page.screenshot({ path: '/tmp/bag2.png' });
} finally { await close(); }
