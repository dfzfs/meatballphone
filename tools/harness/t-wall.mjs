// 🖼 배경 사진은 설정 밖(브라우저 저장소)에 · 옛 설정 속 사진은 옮김 · 화면엔 그대로
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await page.evaluate(async (img) => { const st = await import('/ext/src/base/st.js'); __ML__.app.closeSheet?.(); st.settings().look.wallImg = img; st.settings().look.wall = 'img'; }, img);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(700);
    const r = await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); return { set: st.settings().look.wallImg, idb: (window.__lf.get('meatballphone-wall') ?? '').slice(0, 22), bg: getComputedStyle(document.querySelector('#ml-full .ml-home, #ml-full [class*="wall"], #ml-full') ).backgroundImage.slice(0, 30), html: document.querySelector('#ml-full').innerHTML.includes('data:image/png') }; });
    check(r.set === 'idb' && r.idb.startsWith('data:image/png'), '옛 설정 속 사진 → 브라우저 저장소로 · 설정엔 표시만', JSON.stringify(r));
    check(r.bg.includes('data:image/png'), '화면엔 사진 그대로', JSON.stringify(r));
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
