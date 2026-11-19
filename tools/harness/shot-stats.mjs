import { open, sleep } from './lib.mjs';
const { page, close } = await open({ width: 1440, height: 900 });
try {
    await page.addStyleTag({ content: 'input[type="range"]{width:100%}' });
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(() => window.__addUser('일하자'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\nworked: 9h | +40\n체력: -15 | 넘어짐\nwear: 가죽 장갑\nstatus: 감기 | 2d\nfate: 행운 +1 | 3d\nroll: 상인 설득\nbgm: Moon River - Audrey Hepburn\n</meatball>'));
    await sleep(300);
    for (const [w, tag] of [[1440, 'lap'], [390, 'ph']]) {
        await page.setViewportSize({ width: w, height: w > 500 ? 900 : 844 });
        await page.evaluate(() => __ML__.app.openSheet('now')); await sleep(200); await page.screenshot({ path: `/tmp/st-${tag}.png` });
        await page.evaluate(() => document.querySelector('.ml-body').scrollTo(0, 700)); await sleep(100); await page.screenshot({ path: `/tmp/st-${tag}2.png` });
        await page.evaluate(() => __ML__.app.openSheet('dice')); await sleep(200); await page.screenshot({ path: `/tmp/dc-${tag}.png` });
    }
    console.log(await page.evaluate(() => window.__errors.join('\n') || 'no errors'));
} finally { await close(); }
