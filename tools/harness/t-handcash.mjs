// ✋ 소지품에서 직접 고친 돈은 가계부 · 답 밑 칩에 안 들어감 (이야기에서 쓴 돈만)
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => { const m = __ML__.getMeta(); for (const k of Object.keys(m.mods)) m.mods[k] = true; __ML__.app.refresh?.(true); });
    await page.evaluate(() => window.__addUser('.')); await page.evaluate(() => window.__addAI('a\n<meatball>\nbuy: 빵 | 3\n</meatball>')); await sleep(300);
    await page.evaluate(async () => { const t = await import('/ext/src/ui/tabs.js'); await t.hand('cash: 500', '계산이 틀림'); }); await sleep(400);
    const L = await page.evaluate(async () => { const T = await import('/ext/src/rules/thread.js'); const r = __ML__.fold(); const G = T.ledger(r, 7); return { spend: G.spend, earn: G.earn, cash: r.S.cash }; });
    check(L.cash === 500, '직접 고친 값은 그대로 들어감', JSON.stringify(L));
    check(L.spend === 3 && L.earn === 0, '가계부엔 이야기에서 쓴 돈만 (빵 3) · 직접 고침은 빠짐', JSON.stringify(L));
    const chip = await page.evaluate(() => [...document.querySelectorAll('.ml-msg')].map(x => x.textContent).join(' | '));
    check(!/500/.test(chip), '답 밑 칩에 직접 고침이 안 붙음', chip);
    const rec = await page.evaluate(async () => { __ML__.app.openSheet('rec'); await new Promise(r => setTimeout(r, 400)); return document.querySelector('#ml-full')?.innerText ?? ''; });
    check(/✋/.test(rec), '기록 타임라인엔 ✋로 남음', '');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
