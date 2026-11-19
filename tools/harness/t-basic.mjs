// 💞 설정집에 딱 맞는 행동이 없어도 기본 행동(기쁘게 함 +2 · 상처 줌 −3)으로 반영 · 분류 목록에도 들어감
import { open, sleep, check } from './lib.mjs';
const { page, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const who = await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); return st.getMeta().book.people[0]?.name; });
    await page.evaluate(() => window.__addUser('미안해'));
    const a0 = await page.evaluate((w) => __ML__.fold().S.rel[w]?.aff, who);
    await page.evaluate((w) => window.__addAI(`…\n<meatball>\nact: ${w} | 상처 줌\n</meatball>`), who); await sleep(300);
    const a1 = await page.evaluate((w) => __ML__.fold().S.rel[w]?.aff, who);
    check(a1 === a0 - 3, `규칙에 없는 큰일 → 상처 줌 −3 (${who})`, `${a0}→${a1}`);
    await page.evaluate(() => window.__addUser('선물이야'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\nnpc: 강민석 | 신입생\nact: 강민석 | 기쁘게 함\n</meatball>')); await sleep(300);
    const m = await page.evaluate(() => __ML__.fold().S.rel['강민석']);
    check(m && m.aff > 0, '설정집에 아직 없는 새 인물도 기쁘게 함으로 오름', JSON.stringify(m?.aff));
    const L = await page.evaluate(async () => { const c = await import('/ext/src/rules/classify.js'); const r = __ML__.fold(); return c.actionsOf(r.book, { ...r.S, with: ['강민석'] }, ''); });
    check(L.some(x => x.name === '강민석' && x.up.includes('기쁘게 함') && x.down.includes('상처 줌')), '분류 목록: 규칙 없는 인물도 기본 행동 두 개', JSON.stringify(L));
} finally { await close(); }
