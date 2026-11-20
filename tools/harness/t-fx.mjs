// 💱 환율을 적으면 물가 · 가진 돈이 그 환율에 맞춰지는지 (빵 30원처럼 어긋나지 않게)
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => { const m = __ML__.getMeta(); m.book.world.currency = '은화'; m.book.world.meal = 10; m.book.world.places[0].goods = [{ name: '빵', price: 3, fx: { hunger: 20 } }]; __ML__.app.refresh?.(true); });
    await page.evaluate(() => window.__addUser('.')); await page.evaluate(() => window.__addAI('a\n<meatball>\ncash: 50\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(300);
    await page.evaluate(() => document.querySelector('[data-act="edit-fx"]').click()); await sleep(300);
    await page.evaluate(() => { document.querySelector('#mlf-rate').value = '10'; document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(500);
    const w = await page.evaluate(() => { const r = __ML__.fold(); return { meal: r.book.world.meal, bread: r.book.world.places[0].goods[0].price, cash: r.S.cash, fx: r.book.world.fx }; });
    check(w.fx.rate === 10, '환율 저장', JSON.stringify(w));
    check(w.meal * 10 >= 5000 && w.meal * 10 <= 15000, '식사 한 끼가 현실 값으로 (≈ 9,000원)', JSON.stringify(w));
    check(w.bread === 270, '빵도 같은 비율로 (3 → 270)', JSON.stringify(w));
    check(w.cash === 4500, '가진 돈도 같은 비율로 (50 → 4,500)', JSON.stringify(w));
    // 환율만 바꾸면 현실 값이 그대로 남게
    await page.evaluate(() => document.querySelector('[data-act="edit-fx"]').click()); await sleep(300);
    await page.evaluate(() => { document.querySelector('#mlf-rate').value = '1'; document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(500);
    const w2 = await page.evaluate(() => { const r = __ML__.fold(); return { meal: r.book.world.meal, cash: r.S.cash }; });
    check(w2.meal === w.meal * 10 && w2.cash === 45000, '10원 → 1원이면 숫자 ×10', JSON.stringify(w2));
    // 이미 환율을 적어 둔 채 물가가 어긋난 채팅 (빵 30원) → 같은 환율로 다시 저장하면 맞춤
    await page.evaluate(() => { const m = __ML__.getMeta(); m.book.world.fx = { rate: 10, unit: '원' }; m.book.world.meal = 10; __ML__.app.refresh?.(true); }); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="edit-fx"]').click()); await sleep(300);
    await page.evaluate(() => { document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(500);
    const w3 = await page.evaluate(() => __ML__.fold().book.world.meal);
    check(w3 * 10 >= 5000, '같은 환율로 다시 저장해도 어긋난 물가는 맞춤', String(w3));
    const inj = await page.evaluate(async () => (await import('/ext/src/rules/book.js')).bookText?.(__ML__.getMeta().book) ?? '');
    check(!inj || /1 은화 ≈ 10원/.test(inj), '설정집 줄에 환율', inj.slice(0, 120));
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
