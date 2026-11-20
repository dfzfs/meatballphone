// ✏️ 편집(새 화면) — 관계: 지금 애정 · 우정은 ✋ 그대로 · 인물 설명 · 레벨 / 지도: 지금 장소 · 혼자 · 장소 설명
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const ai = async (b) => { await page.evaluate(() => window.__addUser('.')); await page.evaluate((b) => window.__addAI(`a\n<meatball>\n${b}\n</meatball>`), b); await sleep(220); };
const edit = async (app, fn) => { await page.evaluate((app) => __ML__.app.openSheet(app), app); await sleep(150); await page.evaluate(() => document.querySelector('[data-act="t-edit"]').click()); await sleep(300); await page.evaluate(fn); await sleep(100); await page.evaluate(() => document.querySelector('.ml-bs [data-bs="ok"]').click()); await sleep(400); };
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const A = await page.evaluate(() => __ML__.getMeta().book.people[0].name);
    await ai(`loc: 시장\nwith: ${A}`);
    await edit('rel', () => { const d = document.querySelector('.ml-ed-sec[data-sec="people"] .ml-ed-it'); d.querySelector('[data-f="na"]').value = '45'; d.querySelector('[data-f="nt"]').value = '30'; d.querySelector('[data-f="line"]').value = '무뚝뚝하지만 다정함'; });
    const r1 = await page.evaluate((A) => { const r = __ML__.fold(true); return { a: r.S.rel[A].aff, t: r.S.rel[A].trust, line: __ML__.getMeta().book.people[0].line, hand: r.changes.flat().some(c => c?.hand) }; }, A);
    check(r1.a === 45 && r1.t === 30 && r1.hand, '관계: 애정 45 · 우정 30 (보정 없이 그대로 · ✋)', JSON.stringify(r1));
    check(r1.line === '무뚝뚝하지만 다정함', '인물 설명 저장', r1.line);
    await edit('rel', () => { const d = document.querySelector('.ml-ed-sec[data-sec="people"] .ml-ed-it'); d.querySelector('[data-f="lv"]').value = '2'; d.querySelector('[data-f="na"]').value = '20'; });
    const r2 = await page.evaluate((A) => { const x = __ML__.fold(true).S.rel[A]; return { lv: x.lv, a: x.aff }; }, A);
    check(r2.lv === 2 && r2.a === 20, '관계 레벨 직접 (Lv.2 · 연인 애정 20)', JSON.stringify(r2));
    const home = await page.evaluate(() => __ML__.getMeta().book.world.places.find(p => p.kind === 'home')?.name);
    await edit('map', () => { const s = document.querySelector('.ml-ed-top [data-f="loc"]'); s.value = [...s.options].find(o => o.value !== '시장')?.value; document.querySelector('.ml-ed-top [data-f="with"]').value = ''; document.querySelector('.ml-ed-sec[data-sec="places"] .ml-ed-it [data-f="note"]').value = '조용한 곳'; });
    const m = await page.evaluate(() => { const r = __ML__.fold(true); return { loc: r.S.loc, w: r.S.with.length, note: __ML__.getMeta().book.world.places[0].note }; });
    check(m.loc !== '시장' && m.w === 0 && m.note === '조용한 곳', '지도: 장소 바꿈 · 혼자 · 장소 설명', JSON.stringify({ ...m, home }));
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
