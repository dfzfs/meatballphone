// 💍 고백해야 연인: Lv.1 애정 100 → 고백(예 · 아니오) → Lv.2 연인(새 애정) → 청혼 → Lv.3 부부 · 헤어지면 Lv.1 애정 30
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const ai = async (b) => { await page.evaluate(() => window.__addUser('.')); await page.evaluate((b) => window.__addAI(`a\n<meatball>\n${b}\n</meatball>`), b); await sleep(250); };
const rel = (A) => page.evaluate((A) => { const r = __ML__.fold(true), x = r.S.rel[A]; return { lv: x.lv, aff: x.aff, ex: x.ex, ask: r.S.asks?.[A] ?? null }; }, A);
const hand = (l) => page.evaluate(async (l) => { const t = await import('/ext/src/ui/tabs.js'); await t.hand(l, '직접'); }, l);
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const A = await page.evaluate(() => __ML__.getMeta().book.people[0].name);
    await ai(`with: ${A}`);
    const L1 = await page.evaluate(async (A) => { const e = await import('/ext/src/rules/engine.js'); return e.stagesOf(__ML__.getMeta().book, A, 1).map(s => s.name); }, A);
    check(!L1.some(n => /연인|Lover/.test(n)) && L1.at(-1) === '고백 직전', 'Lv.1 단계엔 연인이 없고 맨 위는 고백 직전', JSON.stringify(L1));
    await ai(`aff: ${A} +8`); await ai(`aff: ${A} +8`);
    check((await rel(A)).lv === 1, '애정이 올라도 고백 없이는 Lv.1', '');
    await hand(`aff: ${A} +100`); await sleep(200);
    check((await rel(A)).aff === 100, '애정 100', '');
    const rt = await page.evaluate(async () => { const m = await import('/ext/src/rules/inject.js'); return m.ruleText(__ML__.getMeta().book); });
    check(/confess:/.test(rt), '애정 100이면 본편 적는 법에 confess 키', '');
    await ai(`confess: ${A}`);
    const r1 = await rel(A);
    check(r1.lv === 1 && r1.ask?.kind === 'confess', '고백 → 대답 기다림 (아직 연인 아님)', JSON.stringify(r1));
    check(await page.evaluate(() => !!document.querySelector('.ml-cat [data-cat="yes"]')), '🐱 수상한 고양이 알림에 예 · 아니오', '');
    await page.evaluate(() => document.querySelector('.ml-cat [data-cat="yes"]').click()); await sleep(500);
    const r2 = await rel(A);
    check(r2.lv === 2 && r2.aff === 0 && !r2.ask, '예 → Lv.2 연인 · 새 애정 0', JSON.stringify(r2));
    check(await page.evaluate(() => /축하/.test(document.querySelector('.ml-cat')?.textContent ?? '')), '🐱 축하 알림', '');
    await ai(`aff: ${A} +5`);
    check((await rel(A)).aff > 0 && (await rel(A)).lv === 2, '연인 애정이 따로 쌓임', '');
    await ai(`breakup: ${A} | 다툼`);
    const r3 = await rel(A);
    check(r3.lv === 1 && r3.aff === 30 && r3.ex === '전 연인', '헤어짐 → Lv.1 · 애정 30 · 전 연인', JSON.stringify(r3));
    await ai(`confess: ${A} | yes`);
    check((await rel(A)).lv === 1, '애정 100 전 고백은 안 이루어짐', '');
    await hand(`aff: ${A} +100`); await sleep(200);
    await ai(`confess: ${A} | no`);
    const r4 = await rel(A);
    check(r4.lv === 1 && r4.aff === 85, '이야기에서 거절 → 애정 −15', JSON.stringify(r4));
    await hand(`aff: ${A} +100`); await sleep(200);
    await ai(`confess: ${A} | yes`);
    check((await rel(A)).lv === 2, '이야기에서 받아들임(| yes) → 바로 연인', '');
    await hand(`aff: ${A} +100`); await sleep(200);
    await ai(`propose: ${A}`);
    await page.evaluate(() => document.querySelector('.ml-cat [data-cat="yes"]')?.click()); await sleep(500);
    check((await rel(A)).lv === 3, '청혼 예 → Lv.3 부부', JSON.stringify(await rel(A)));
    // 연락 앱 API
    const api = await page.evaluate(() => MeatballPhone.people()[0]);
    check(api.love === true && api.bond === 3, '연락 앱에 보이는 관계 = 진짜 레벨', JSON.stringify(api));
    // 대답은 다시 계산해도 그대로
    await page.evaluate(() => __ML__.resetCache?.()); 
    check((await rel(A)).lv === 3, '다시 계산해도 그대로', '');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
