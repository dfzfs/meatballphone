// 🗺 지도: 자동 배치 · 장소 숨기기 / 다시 보이기 · 핀 인물 고르기 · 길 안내
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 집\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('map')); await sleep(150);
    const n = await page.evaluate(() => ({ nodes: document.querySelectorAll('.ml-map .node').length, places: __ML__.getMeta().book.world.places.length, edges: document.querySelectorAll('.ml-map .edges .ln').length }));
    check(n.nodes === n.places && n.edges > 0, '자동 배치: 장소마다 역 · 노선', JSON.stringify(n));
    check(await page.evaluate(() => !document.querySelector('[data-act="map-edit"]') && !document.querySelector('.ml-mapwrap.editing')), '꾸미기 모드 없음');
    // 다른 장소 고르기 → 길 안내 · 숨기기
    await page.evaluate(() => document.querySelector('.node[data-v="목욕탕"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(200);
    check(await page.evaluate(() => document.querySelector('.ml-place')?.textContent.includes('목욕탕')), '역 누르면 그 장소 카드');
    await page.evaluate(() => document.querySelector('.ml-place [data-act="map-hide"]').click()); await sleep(200);
    check(await page.evaluate(() => !document.querySelector('.node[data-v="목욕탕"]') && !!document.querySelector('[data-act="map-unhide"]')), '장소 숨기기 (다시 보이기 버튼)');
    await page.evaluate(() => document.querySelector('[data-act="map-unhide"]').click()); await sleep(200);
    check(await page.evaluate(() => !!document.querySelector('.node[data-v="목욕탕"]')), '다시 보이기');
    // 핀 인물 고르기
    await page.evaluate(() => document.querySelector('[data-act="map-pins"]').click()); await sleep(200);
    await page.evaluate(() => { const c = document.querySelector('.ml-bs input[data-pin]'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(200);
    check(await page.evaluate(() => Array.isArray(__ML__.getMeta().mapPins)), '핀 인물 고르기 저장');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
