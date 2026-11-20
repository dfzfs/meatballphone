// 화면 묶음 스크린샷 (CSS 나누기 전후 비교용)
import { open, sleep } from './lib.mjs';
const out = process.argv[2] ?? '/tmp/css-a';
const { page, close } = await open({ width: 420, height: 860 });
const turn = async (b) => { await page.evaluate(() => window.__addUser('.')); await page.evaluate((b) => window.__addAI(`a\n<meatball>\n${b}\n</meatball>`), b); await sleep(200); };
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const { A, P0, P1 } = await page.evaluate(() => { const m = __ML__.getMeta(); for (const k of Object.keys(m.mods)) m.mods[k] = true; __ML__.app.refresh?.(true); return { A: m.book.people[0].name, P0: m.book.world.places[0].name, P1: m.book.world.places[1].name }; });
    await turn(`loc: ${P0}\nwith: ${A}\nact: ${A} | 기쁘게 함\ngot: 빵\nmind: ${A} | 기분 좋다\nstatus: 감기 | 2d`);
    await turn(`time: +1d\nloc: ${P1}\nbuy: 물 | 1\nearn: 30 | 심부름`);
    await page.evaluate(() => __ML__.app.closeSheet?.()); await sleep(300);
    await page.screenshot({ path: `${out}-chat.png` });
    for (const t of ['home', 'now', 'dice', 'bag', 'rel', 'map', 'cal', 'rec', 'mind', 'news', 'book', 'set']) { await page.evaluate((t) => __ML__.app.openSheet(t), t); await sleep(600); await page.screenshot({ path: `${out}-${t}.png` }); }
    await page.evaluate(() => document.querySelector('[data-act="edit-fx"]')?.click() ?? document.querySelector('#ml-full [data-act]')?.click()); await sleep(400);
} finally { await close(); }
