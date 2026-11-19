// 화면 찍기 (지금 · 소지품 · 관계 · 지도 · HUD/미니바) — PC · 휴대폰
import { open, sleep } from './lib.mjs';
const { page, close } = await open();
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(() => window.__addUser('시장 가자'));
    await page.evaluate(() => window.__addAI('Leon이 웃었다.\n<meatball>\nloc: 시장\nwith: Leon\nbuy: 빵 | 3\nact: Leon | 칭찬\ngift: Leon | 꽃\ntime: +5h\nstatus: 감기 | 1d\n</meatball>'));
    await sleep(400);
    for (const [w, h, tag] of [[1300, 900, 'pc'], [390, 844, 'ph']]) {
        await page.setViewportSize({ width: w, height: h }); await sleep(150);
        await page.screenshot({ path: `/tmp/s-chat-${tag}.png` });
        for (const t of ['now', 'bag', 'rel', 'map']) { await page.evaluate((t) => __ML__.app.openSheet(t), t); await sleep(150); await page.screenshot({ path: `/tmp/s-${t}-${tag}.png` }); }
        await page.evaluate(() => __ML__.app.closeSheet());
    }
} finally { await close(); }
