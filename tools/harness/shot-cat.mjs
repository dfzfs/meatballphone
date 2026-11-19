import { open, sleep } from './lib.mjs';
const { page, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200); await page.screenshot({ path: '/tmp/c-home.png', clip: { x: 960, y: 0, width: 480, height: 300 } });
    await page.evaluate(() => document.querySelector('.ml-app[data-v="cat"]').click()); await sleep(300);
    await page.evaluate(() => document.querySelector('.ml-catbig .ss-mascot').click()); await sleep(150);
    await page.screenshot({ path: '/tmp/c-cat.png' });
    console.log(await page.evaluate(() => window.__errors.join('\n') || 'no errors'));
} finally { await close(); }
