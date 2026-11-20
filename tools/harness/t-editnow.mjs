// ✏️ 지금 값 한 화면 (수치 · 소지품 · 관계 · 지도) → ✋ 줄 · 📘 규칙 버튼 · ✨ 미리 보기가 읽히는 글
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 390, height: 844 });
const edit = async (app, fill) => {
    await page.evaluate((a) => __ML__.app.openSheet(a), app); await sleep(150);
    await page.evaluate(() => document.querySelector('.ml-tools2 [data-act="t-edit"]').click()); await sleep(200);
    await page.evaluate((f) => { for (const [k, v] of Object.entries(f)) { const el = document.querySelector(`.ml-bs #mlf-${k}`); if (el) el.value = v; else { const b = document.querySelector(`.ml-bs .ml-picks[data-k="${k}"] [data-pick="${v}"]`); b?.click(); } } document.querySelector('.ml-bs [data-bs="ok"]').click(); }, fill); await sleep(300);
};
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('hi')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\nwith: Leon\nbuy: 빵 | 3\nstatus: 감기 | 1d\n</meatball>')); await sleep(300);
    await edit('now', { n0: '30', a0: '2', st: '기분 좋음', why: '테스트' });
    let r = await page.evaluate(() => { const R = __ML__.fold(); return { h: R.S.needs.hunger, a: Object.values(R.S.attrs)[0], st: R.S.status.map(s => s.name), hand: R.changes.at(-1).filter(c => c.src === 'hand').length }; });
    check(r.h === 30 && r.a === 2 && r.st.join() === '기분 좋음' && r.hand >= 3, '수치: 허기 30 · 능력치 +2 · 딱지 감기 풀림/기분 좋음 붙음 (✋)', JSON.stringify(r));
    await edit('bag', { cash: '100', i0: '0', add: '우산, 사과 ×3' });
    r = await page.evaluate(() => { const S = __ML__.fold().S; return { cash: S.cash, items: S.items.map(i => `${i.name}${i.n}`).join() }; });
    check(r.cash === 100 && r.items === '우산1,사과3', '소지품: 돈 100 · 빵 0개(없앰) · 새 물건', JSON.stringify(r));
    await edit('rel', { ra0: '45', rt0: '30' });
    r = await page.evaluate(() => { const x = __ML__.fold().S.rel.Leon; return { a: x.aff, t: x.trust }; });
    check(r.a === 45 && r.t === 30, '관계: 애정 45 · 우정 30 (보정 없이 그대로)', JSON.stringify(r));
    await edit('map', { loc: '집', with: '' });
    r = await page.evaluate(() => { const S = __ML__.fold().S; return { loc: S.loc, w: S.with.length }; });
    check(r.loc === '집' && r.w === 0, '지도: 장소 집 · 혼자', JSON.stringify(r));
    // 📘 규칙 버튼 → 설정집 칸 목록
    await page.evaluate(() => __ML__.app.openSheet('now')); await sleep(100);
    await page.evaluate(() => document.querySelector('.ml-tools2 [data-act="t-edit"]').click()); await sleep(200);
    await page.evaluate(() => document.querySelector('.ml-bs [data-act="t-rules"]').click()); await sleep(250);
    check(await page.evaluate(() => !!document.querySelector('.ml-bs [data-act="e-need"]')), '📘 규칙 고치기 → 욕구 규칙 목록');
    await page.evaluate(() => document.querySelectorAll('.ml-bs').forEach(x => x.remove()));
    // ✨ 미리 보기: 사람이 읽는 글
    await page.evaluate(() => { window.__ai = () => '<meatball>\naff: Leon -10 | 아직 연인 아님\ncash: +5\n</meatball>'; });
    await page.evaluate(() => __ML__.app.openSheet('rel')); await sleep(100);
    await page.evaluate(() => document.querySelector('.ml-tools2 [data-act="t-ai"]').click()); await sleep(150);
    await page.evaluate(() => { document.querySelector('.ml-bs #mlf-say').value = '아직 연인 아냐'; document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(400);
    const pv = await page.evaluate(() => document.querySelector('.ml-bs')?.textContent ?? '');
    check(/애정/.test(pv) && /Leon -10/.test(pv) && !/aff:/.test(pv), '✨ 미리 보기: 「💗 애정 Leon -10」 (aff: 줄 아님)', pv.slice(0, 120));
    const errs = await page.evaluate(() => window.__errors);
    check(!errs.length && !logs.some(l => /pageerror/.test(l)), '오류 없음', [...errs, ...logs].join('\n'));
} finally { await close(); }
