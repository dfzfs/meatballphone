// 🪙 화폐 여러 개 · 환전 · 🤝 흥정
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const fill = (vals) => page.evaluate((vals) => { for (const [k, v] of Object.entries(vals)) document.querySelector(`#mlf-${k}`).value = v; document.querySelector('.ml-bs [data-bs="ok"]').click(); }, vals);
const S = () => page.evaluate(() => { const { S } = __ML__.fold(); return { cash: S.cash, coins: S.coins, haggle: S.haggle, loc: S.loc }; });
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    const shop = await page.evaluate(() => { const m = __ML__.getMeta(); const p = m.book.world.places.find(x => x.goods?.length); return p ? { name: p.name, g: p.goods[0] } : null; });
    check(!!shop, '견본에 가게 있음', JSON.stringify(shop));
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(150);
    await page.evaluate(() => document.querySelector('[data-act="coin-add"]').click()); await sleep(200);
    await fill({ name: '은화', rate: '0.5' }); await sleep(300);
    check(await page.evaluate(() => __ML__.getMeta().book.world.coins?.[0]?.name === '은화'), '화폐 더하기');
    await page.evaluate(() => window.__addUser('1')); await page.evaluate((p) => window.__addAI(`a\n<meatball>\ncash: 100\ncash: +4 은화\nloc: ${p}\n</meatball>`), shop.name); await sleep(250);
    let s = await S(); check(s.cash === 100 && s.coins['은화'] === 4, '은화 4개 받음 · 기본 돈 그대로', JSON.stringify(s));
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(150);
    await page.evaluate(() => document.querySelector('[data-act="coin-x"][data-v="은화"]').click()); await sleep(200);
    await fill({ n: '10' }); await sleep(300);
    s = await S(); check(s.coins['은화'] === 14 && Math.abs(s.cash - (100 - 5.25)) < 0.01, '환전: 은화 10 = 5 + 수수료 5%', JSON.stringify(s));
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(150);
    check(await page.evaluate(() => !!document.querySelector('[data-act="haggle"]')), '가게에 흥정 버튼');
    await page.evaluate(() => { Math.random = () => 0.99; document.querySelector('[data-act="haggle"]').click(); }); await sleep(900);
    s = await S(); check(s.haggle?.pct === -30 && s.haggle.place === shop.name, '흥정 대성공 -30%', JSON.stringify(s.haggle));
    const before = s.cash; await page.evaluate((g) => window.__addAI(`b\n<meatball>\nbuy: ${g.name}\n</meatball>`), shop.g); await sleep(250);
    s = await S(); const paid = Math.round((before - s.cash) * 100) / 100;
    check(paid <= Math.round(shop.g.price * 0.7) + 1, '산 값에 흥정 반영', `${paid} vs ${shop.g.price}`);
    check(!(await page.evaluate(() => !!document.querySelector('[data-act="haggle"]'))), '오늘은 다시 흥정 못 함');
    const inj = await page.evaluate(() => JSON.stringify(window.__prompts ?? {}));
    check(/은화/.test(inj) && /haggled/.test(inj), '본편: 은화 · 흥정 결과만', '');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
