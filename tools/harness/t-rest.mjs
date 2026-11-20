// 💤 옛 미트볼 상태창이 켜져 있으면 쉬되, 확장 탭에 「쉬는 중」 서랍과 바꾸기 버튼은 보임
import { chromium } from './pw.mjs';
import { serve } from './server.mjs';
import { check, sleep } from './lib.mjs';
const srv = await serve(0), browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${srv.address().port}/?old=1`); await page.waitForFunction(() => window.__ready === true);
    await sleep(300);
    const r = await page.evaluate(() => ({ drawer: document.querySelector('#extensions_settings2 .ml-set')?.textContent ?? '', btn: !!document.querySelector('[data-ml-rest="switch"]'), hud: !!document.getElementById('ml-hud') }));
    check(/쉬는 중/.test(r.drawer) && r.btn && !r.hud, '확장 탭에 「쉬는 중」 서랍 · 바꾸기 버튼 · 폰은 안 돎', JSON.stringify(r).slice(0, 160));
} finally { await browser.close(); srv.close(); }
