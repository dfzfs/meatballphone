// 💭 속마음 모드: 모양(카모지) · 말투 → 적는 법 · 뜰 때 알림 · 지난 속마음
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const fill = (vals) => page.evaluate((vals) => { for (const [k, v] of Object.entries(vals)) document.querySelector(`#mlf-${k}`).value = v; document.querySelector('.ml-bs [data-bs="ok"]').click(); }, vals);
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(() => { const m = __ML__.getMeta(); m.mods.mind = true; __ML__.app.refresh?.(true); });
    await page.evaluate(() => __ML__.app.openSheet('mind')); await sleep(150);
    await page.evaluate(() => document.querySelector('.ml-seg[data-seg="mindmode"] [data-v="kaomoji"]').click()); await sleep(150);
    await page.evaluate(() => document.querySelector('[data-act="mind-tone"]').click()); await sleep(150); await fill({ t: '반말 · 툭툭' }); await sleep(200);
    await page.evaluate(() => window.__addUser('1')); await sleep(100);
    const rule = await page.evaluate(() => window.__prompts?.meatlite_rule?.value ?? '');
    check(/카모지 하나/.test(rule) && /반말 · 툭툭/.test(rule) && /예: \(/.test(rule), '적는 법: 카모지 · 말투 · 견본', rule.split('\n').filter(l => /mind|말투|카모지/.test(l)).join(' / '));
    await page.evaluate(() => window.__addAI('a\n<meatball>\nmind: Leon | (￣ヘ￣) 또 늦네\n</meatball>')); await sleep(700);
    const t = await page.evaluate(() => [...document.querySelectorAll('.ml-toast.mind')].map(x => x.textContent));
    check(t.some(x => x.includes('또 늦네')), '뜰 때 알림', t.join('|'));
    await page.evaluate(() => window.__addAI('b\n<meatball>\nmind: Leon | (｡>﹏<｡) 고마워\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('mind')); await sleep(150);
    const txt = await page.evaluate(() => document.querySelector('#ml-full')?.textContent ?? '');
    check(txt.includes('지난 속마음') && txt.includes('또 늦네') && txt.includes('고마워'), '지난 속마음 목록');
    await page.evaluate(() => document.querySelector('[data-act="mind-pop"]').click()); await sleep(100);
    check(await page.evaluate(() => __ML__.getMeta().mindPop === 'off'), '알림 끄기');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
