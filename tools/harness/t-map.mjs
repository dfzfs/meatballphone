// 🎨 노선 꾸미기: 끌어서 옮기기 · 노선 색 · 역 모양 · 숨기기 · 핀 인물
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
const pick = (k, v) => page.evaluate(([k, v]) => document.querySelector(`.ml-picks[data-k="${k}"] [data-pick="${v}"]`).click(), [k, v]);
const ok = () => page.evaluate(() => document.querySelector('.ml-bs [data-bs="ok"]').click());
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 집\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('map')); await sleep(150);
    await page.evaluate(() => document.querySelector('[data-act="map-edit"]').click()); await sleep(200);
    // 끌기: 시장 역을 오른쪽 아래로
    const box = await page.evaluate(() => { const r = document.querySelector('.node[data-v="시장"] .stn').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 40, box.y + 60, { steps: 6 }); await page.mouse.up(); await sleep(300);
    const pos = await page.evaluate(async () => (await import('/ext/src/base/st.js')).getMeta().mapStyle?.pos?.['시장']);
    check(pos && Number.isFinite(pos.x), '역 끌어서 옮기기 → 자리 저장', JSON.stringify(pos));
    // 노선 색
    await page.evaluate(() => document.querySelector('.ln.hit').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(200);
    await pick('c', '#8b5bd6'); await pick('w', 'thick'); await pick('bend', 'curve'); await ok(); await sleep(300);
    check(await page.evaluate(() => [...document.querySelectorAll('.edges .ln:not(.hit)')].some(p => p.getAttribute('style')?.includes('#8b5bd6'))), '노선 색 · 굵기 · 꺾임');
    // 역 모양 + 숨기기
    await page.evaluate(() => document.querySelector('.node[data-v="목욕탕"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(200);
    await pick('shape', 'diamond'); await pick('hide', 'hide'); await ok(); await sleep(300);
    check(await page.evaluate(() => !document.querySelector('.node[data-v="목욕탕"]') && !!document.querySelector('[data-act="map-unhide"]')), '장소 숨기기 (다시 보이기 버튼)');
    await page.evaluate(() => document.querySelector('[data-act="map-unhide"]').click()); await sleep(200);
    check(await page.evaluate(() => !!document.querySelector('.node[data-v="목욕탕"] polygon.stn')), '역 모양 (마름모)');
    await page.screenshot({ path: '/tmp/map-edit.png' });
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
