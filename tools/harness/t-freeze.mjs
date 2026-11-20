// 🧊 애정 · 우정 동결: 고정한 뒤 답부터 안 움직임 · 앞 답은 그대로 · 직접 고침은 됨 · 풀면 다시
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const ai = async (b) => { await page.evaluate(() => window.__addUser('.')); await page.evaluate((b) => window.__addAI(`a\n<meatball>\n${b}\n</meatball>`), b); await sleep(220); };
const rel = (A) => page.evaluate((A) => { const x = __ML__.fold().S.rel[A]; return { aff: x.aff, trust: x.trust }; }, A);
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const A = await page.evaluate(() => __ML__.getMeta().book.people[0].name);
    await ai(`with: ${A}\naff: ${A} +5\ntrust: ${A} +3`);
    const r0 = await rel(A);
    await page.evaluate(() => __ML__.app.openSheet('rel')); await sleep(300);
    await page.evaluate((A) => document.querySelector(`[data-act="rel-freeze"][data-v="${A}|aff"]`).click(), A); await sleep(300);
    await ai(`aff: ${A} +5\ntrust: ${A} +3`);
    const r1 = await rel(A);
    check(r1.aff === r0.aff && r1.trust > r0.trust, '애정 고정 뒤: 애정은 그대로 · 우정은 움직임', JSON.stringify([r0, r1]));
    await page.evaluate(async (A) => { const t = await import('/ext/src/ui/tabs.js'); await t.hand(`aff: ${A} +10`, '직접'); }, A); await sleep(300);
    check((await rel(A)).aff === r0.aff + 10, '직접 고침은 됨', '');
    await page.evaluate(() => __ML__.app.openSheet('rel')); await sleep(300);
    await page.evaluate((A) => document.querySelector(`[data-act="rel-freeze"][data-v="${A}|aff"]`).click(), A); await sleep(300);
    await ai(`aff: ${A} +5`);
    check((await rel(A)).aff > r0.aff + 10, '풀면 다시 움직임', '');
    check((await rel(A)).aff !== undefined && r0.aff > 10, '고정 전 답은 그대로', JSON.stringify(r0));
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
