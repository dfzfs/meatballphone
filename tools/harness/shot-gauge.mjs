// 영향력 탭 (실리태번처럼 슬라이더 width:100% 규칙을 넣고) — 노트북 · 휴대폰
import { open, sleep } from './lib.mjs';
const { page, close } = await open({ width: 1440, height: 900 });
try {
    await page.addStyleTag({ content: 'input[type="range"]{width:100%;margin:0}' });
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('gauge')); await sleep(200);
    await page.screenshot({ path: '/tmp/g-laptop.png' });
    await page.setViewportSize({ width: 390, height: 844 }); await sleep(150);
    await page.screenshot({ path: '/tmp/g-phone.png' });
} finally { await close(); }
