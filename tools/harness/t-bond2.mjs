// 📏 act 크기(big · small) · 💤 거절 뒤 하루 쉼 · 📌 사귄 날 D-day · 💍 관계 흐름 · ⚠ 모르는 행동 표시 · 🔍 분류 점검 · ✏️ 달력 · 내 탭 편집
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const ai = async (b) => { await page.evaluate(() => window.__addUser('.')); await page.evaluate((b) => window.__addAI(`a\n<meatball>\n${b}\n</meatball>`), b); await sleep(250); };
const hand = (l) => page.evaluate(async (l) => { const t = await import('/ext/src/ui/tabs.js'); await t.hand(l, '직접'); }, l);
const aff = (A) => page.evaluate((A) => __ML__.fold(true).S.rel[A].aff, A);
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const A = await page.evaluate(() => __ML__.getMeta().book.people[0].name);
    await ai(`with: ${A}`);
    let a0 = await aff(A); await ai(`act: ${A} | pleased | big`); const big = (await aff(A)) - a0;
    a0 = await aff(A); await ai(`act: ${A} | hurt | small`); const small = (await aff(A)) - a0;
    check(big === 3 && small === -2, '큰 장면 ×1.5 · 사소함 ×0.5', JSON.stringify({ big, small }));
    await ai(`act: ${A} | 우주비행`);
    check(await page.evaluate(() => { const r = __ML__.fold(true); return (r.flags[r.changes.length - 1] ?? []).some(f => /목록에 없는 행동/.test(f.text)); }), '⚠ 목록에 없는 행동은 표시', '');
    await hand(`aff: ${A} +100`); await sleep(200);
    await ai(`confess: ${A} | no`);
    const rt = await page.evaluate(async () => { const m = await import('/ext/src/rules/inject.js'); return m.ruleText(__ML__.getMeta().book); });
    await hand(`aff: ${A} +100`); await sleep(200);
    const rt2 = await page.evaluate(async () => { const m = await import('/ext/src/rules/inject.js'); return m.ruleText(__ML__.getMeta().book); });
    check(!/confess:/.test(rt2), '💤 거절당한 뒤 하루는 고백 키 안 감', '');
    await ai('time: +1d'); await ai('pass: 1d');
    const rt3 = await page.evaluate(async () => { const m = await import('/ext/src/rules/inject.js'); return m.ruleText(__ML__.getMeta().book); });
    check(/confess:/.test(rt3), '하루 지나면 다시', '');
    await ai(`confess: ${A}`);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(300); await page.evaluate(() => document.querySelector('[data-act="bond-ans"][data-v$="|yes"]').click()); await sleep(600);
    check(await page.evaluate((A) => (__ML__.getMeta().cal?.dday ?? []).some(d => d.name.includes(A) && /사귄 날/.test(d.name)), A), '📌 사귄 날이 D-day에', JSON.stringify(await page.evaluate(() => __ML__.getMeta().cal?.dday)));
    const th = await page.evaluate(async (A) => { const T = await import('/ext/src/ui/threadui.js'); return T.personThread(__ML__.fold(), A); }, A);
    check(/관계 흐름/.test(th) && /연인/.test(th), '💍 인물 카드에 관계 흐름', '');
    // 🔍 분류 점검: 가짜 분류 모델이 다른 줄을 돌려줌 → 다른 줄만 보임 · 새 결과로
    const au = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); st.settings().mode = 'B'; st.settings().clsProfile = 'p-flash';
        window.__cls = () => '<meatball>\nloc: 편의점\n</meatball>';
        const C = await import('/ext/src/rules/classify.js'); const A = await C.audit(2);
        return A.map(a => ({ i: a.i, added: a.added, gone: a.gone.length }));
    });
    check(au.length === 2 && au.every(a => a.added.includes('loc: 편의점')), '🔍 분류 점검: 다시 분류한 결과와 다른 줄', JSON.stringify(au));
    // ✏️ 달력 편집: D-day 추가 · 달 이름
    await page.evaluate(() => __ML__.app.openSheet('cal')); await sleep(150);
    page.evaluate(async () => { const t = await import('/ext/src/ui/tools.js'); t.editApp('cal'); }); await sleep(400);
    await page.evaluate(() => { document.querySelector('[data-ed="add"][data-sec="dday"]').click(); const L = document.querySelectorAll('.ml-ed-sec[data-sec="dday"] .ml-ed-it'); const d = L[L.length - 1]; d.querySelector('[data-f="name"]').value = '축제'; d.querySelector('[data-f="date"]').value = '12/25'; document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(400);
    check(await page.evaluate(() => (__ML__.getMeta().cal?.dday ?? []).some(d => d.name === '축제')), '✏️ 달력 편집: D-day 추가', '');
    // ✏️ 내 탭 편집
    await page.evaluate(() => { __ML__.getMeta().custom = [{ name: '수련', icon: '🌀', fields: [{ name: '마력', max: 100, stages: [30, 70] }] }]; });
    page.evaluate(async () => { const t = await import('/ext/src/ui/tools.js'); t.editApp('custom'); }); await sleep(400);
    await page.evaluate(() => { const d = document.querySelector('.ml-ed-sec[data-sec="tabs"] .ml-ed-it'); d.querySelector('[data-f="fields"]').value = '마력 | 100 | 40\n칭호 | | 견습'; d.querySelector('[data-f="note"]').value = '마법 수련'; document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(500);
    const cu = await page.evaluate(() => ({ t: __ML__.getMeta().custom[0], v: __ML__.fold(true).S.custom['수련'] }));
    check(cu.t.fields.length === 2 && cu.t.note === '마법 수련' && String(cu.v?.['마력']) === '40' && cu.v?.['칭호'] === '견습', '✏️ 내 탭: 칸 추가 · 설명 · 지금 값', JSON.stringify(cu));
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
