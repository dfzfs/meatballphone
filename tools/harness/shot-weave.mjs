import { open, sleep } from './lib.mjs';
const { page, close } = await open({ width: 420, height: 860 });
const turn = async (b) => { await page.evaluate(() => window.__addUser('.')); await page.evaluate((b) => window.__addAI(`a\n<meatball>\n${b}\n</meatball>`), b); await sleep(200); };
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const { A, P0, P1 } = await page.evaluate(() => { const m = __ML__.getMeta(); for (const k of Object.keys(m.mods)) m.mods[k] = true; m.book.people[0].likes = ['딸기우유']; __ML__.app.refresh?.(true); return { A: m.book.people[0].name, P0: m.book.world.places[0].name, P1: m.book.world.places[1].name }; });
    await turn(`loc: ${P0}\nwith: ${A}\nact: ${A} | 기쁘게 함\ngot: 딸기우유\nmind: ${A} | 기분 좋다`);
    await turn(`time: +6h\nloc: ${P1}\nwith: 없음\nrest: 1h`);
    await turn(`time: +1d\nwith: ${A}\nact: ${A} | 기쁘게 함\nstatus: 감기 | 2d`);
    await turn(`time: +4d\nwith: 없음\nloc: ${P0}\nloc: ${P1}`);
    for (const [t, f] of [['rel', 'w-rel'], ['now', 'w-now'], ['rec', 'w-rec'], ['home', 'w-home'], ['map', 'w-map'], ['cal', 'w-cal']]) { await page.evaluate((t) => __ML__.app.openSheet(t), t); await sleep(500); await page.screenshot({ path: `/tmp/${f}.png` }); }
} finally { await close(); }
