// 💞 인물마다 관계 단계 · 🔗 인물끼리 · 루트 비교
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    const people = await page.evaluate(() => __ML__.getMeta().book.people.map(p => p.name));
    const A = people[0], B = 'Mia';
    // A만 다른 단계
    await page.evaluate((A) => { const m = __ML__.getMeta(); const p = m.book.people.find(x => x.name === A); p.stages = [{ at: 0, name: '원수', call: '', act: '' }, { at: 20, name: '경쟁자', call: '', act: '' }, { at: 50, name: '맞수', call: '', act: '' }]; __ML__.app.refresh?.(true); }, A);
    await page.evaluate(() => window.__addUser('1'));
    await page.evaluate(([A, B]) => window.__addAI(`a\n<meatball>\nnpc: ${B} | 차가운 기사\nwith: ${A}, ${B}\npair: ${A} | ${B} | -12 | 자리 다툼\npair: ${A} | ${B} | 라이벌\n</meatball>`), [A, B]); await sleep(250);
    const pr = await page.evaluate(() => __ML__.fold().S.pairs);
    const k = [A, B].sort().join('|');
    check(pr[k]?.v === -12 && pr[k]?.label === '라이벌', '인물끼리 저장', JSON.stringify(pr));
    await page.evaluate(() => __ML__.app.openSheet('rel')); await sleep(150);
    const card = await page.evaluate((A) => [...document.querySelectorAll('.ml-rc')].find(x => x.textContent.includes(A))?.textContent ?? '', A);
    check(/원수|경쟁자|맞수/.test(card), 'A 카드에 A만의 단계', card.slice(0, 80));
    await page.evaluate(() => document.querySelector('.ml-seg[data-seg="relv"] [data-v="route"]').click()); await sleep(150);
    const rt = await page.evaluate(() => document.querySelectorAll('.ml-rt').length);
    check(rt >= 2, '루트 비교 줄', String(rt));
    await page.evaluate(() => document.querySelector('.ml-seg[data-seg="relv"] [data-v="pair"]').click()); await sleep(150);
    const pv = await page.evaluate(() => document.querySelector('.ml-pair')?.textContent ?? '');
    check(pv.includes('라이벌') && pv.includes('자리 다툼'), '인물끼리 화면', pv.slice(0, 80));
    const inj = await page.evaluate(() => __ML__.inject?.() ?? '');
    const facts = await page.evaluate(() => JSON.stringify(window.__prompts ?? {}));
    check(/↔/.test(facts), '본편 결과 줄에 A↔B', facts.slice(0, 200));
    await page.evaluate(() => document.querySelector('.ml-seg[data-seg="relv"] [data-v="card"]').click()); await sleep(100);
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
