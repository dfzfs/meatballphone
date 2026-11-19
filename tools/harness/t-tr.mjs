// 🌐 상태창 번역: 영어 저장 → 화면만 한국어 · 모르는 말은 모아서 AI 1회 · 고치기 · 용어집이 먼저
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().saveLang = 'en'; st.saveSettings(); });
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => { (await import('/ext/src/base/st.js')).settings().trEngine = 'ai'; }); // 시험장엔 실리 번역 확장이 없어서 AI 길로
    let calls = 0;
    await page.exposeFunction('__count', () => { calls++; });
    await page.evaluate(() => { window.__ai = (p) => { window.__count(); return JSON.stringify({ 'Rusty Sword': '녹슨 검', 'Old Tavern': '낡은 선술집', 'Cold': '감기' }); }; });
    await page.evaluate(() => window.__addUser('go')); await page.evaluate(() => window.__addAI('...\n<meatball>\ngot: Rusty Sword\nstatus: Cold | 2d\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(2200);
    const t = await page.evaluate(() => document.querySelector('.ml-body').textContent);
    check(t.includes('녹슨 검') && !t.includes('Rusty Sword'), '화면만 한국어로 (소지품)', t.slice(0, 200));
    check(calls === 1, `모아서 AI 1회 (${calls})`);
    check(await page.evaluate(() => __ML__.fold().S.items.some(i => i.name === 'Rusty Sword')), '저장은 영어 그대로');
    // 고치기 → 용어집 고정
    await page.evaluate(() => document.querySelector('[data-act="t-gloss"]').click()); await sleep(200);
    await page.evaluate(() => document.querySelector('.ml-bs [data-act="tr-edit"][data-v="Rusty Sword"]').click()); await sleep(200);
    await page.evaluate(() => { document.querySelector('#mlf-to').value = '낡은 칼'; document.querySelector('.ml-picks[data-k="how"] [data-pick="fix"]').click(); document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(400);
    await page.evaluate(() => document.querySelector('.ml-bs [data-bs="x"]')?.click()); await sleep(200);
    check(await page.evaluate(() => document.querySelector('.ml-body').textContent.includes('낡은 칼')), '번역 고치기 → 용어집 고정');
    check(!logs.filter(l => !/404/.test(l)).length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join(' | '));
} finally { await close(); }
