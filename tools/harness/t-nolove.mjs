// 💔 애정 꺼 둔 인물이 연락 같은 앱(API) · 프롬프트 · 관계 화면에서 「연인」으로 안 나오는지
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const A = await page.evaluate(() => __ML__.getMeta().book.people[0].name);
    // 애정 끄기 전에 애정을 맨 위까지 올려 둔 상태 (실제로 애정을 끄기 전 높았던 경우)
    await page.evaluate((A) => window.__addUser('1'), A);
    await page.evaluate((A) => window.__addAI(`a\n<meatball>\nwith: ${A}\n</meatball>`), A); await sleep(200);
    await page.evaluate((A) => { const m = __ML__.getMeta(); const p = m.book.people.find(x => x.name === A); p.start = { aff: 95, trust: 30 }; p.noLove = true; __ML__.app.refresh?.(true); }, A); await sleep(300);
    const r = await page.evaluate((A) => { const x = __ML__.fold().S.rel[A]; return { aff: x.aff, trust: x.trust }; }, A);
    const pp = await page.evaluate((A) => globalThis.MeatballPhone.people().find(p => p.name === A), A);
    check(pp && pp.stage === '친구' && pp.noLove === true && pp.love === false, 'API 단계 = 친구', JSON.stringify(pp) + ' rel ' + JSON.stringify(r));
    check(pp.aff === pp.trust, 'API 막대는 우정으로', `${pp.aff} / ${pp.trust}`);
    await page.evaluate(() => window.__addUser('2')); await page.evaluate((A) => window.__addAI(`b\n<meatball>\nwith: ${A}\n</meatball>`), A); await sleep(250);
    const inj = await page.evaluate(() => Object.values(window.__prompts).map(x => x.value).join('\n'));
    const line = inj.split('\n').filter(l => l.includes(A)).join(' / ');
    check(!/연인|애칭/.test(line), '프롬프트에 연인 없음', line);
    await page.evaluate(() => __ML__.app.openSheet('rel')); await sleep(200);
    const card = await page.evaluate((A) => [...document.querySelectorAll('.ml-rc')].find(x => x.textContent.includes(A))?.textContent ?? '', A);
    check(card.includes('친구') && !/연인|애칭/.test(card), '관계 카드에 연인 없음', card.slice(0, 160));
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
