// 저절로 생기는 것 · 알림 · 어긋남 · 장면 인식 · 토큰 계기판
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(() => { __ML__.app.refresh(); }); 
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('Leon과 함께 시장으로 갔다. Leon이 웃었다.\n<meatball>\npromise: Leon과 저녁 | 10h\n</meatball>')); await sleep(400);
    const a = await page.evaluate(() => { const R = __ML__.fold(); return { loc: R.S.loc, with: R.S.with, toasts: document.querySelectorAll('.ml-toast').length }; });
    check(a.loc === '시장' && a.with.includes('Leon'), '장면 자동 인식 (태그 없이 장소 · 같이 있는 사람)', JSON.stringify(a));
    check(await page.evaluate(() => [...document.querySelectorAll('.ml-toast')].some(t => t.textContent.includes('Leon과 저녁'))), '하루 전 알림');
    // 오래 굶김 → 허기 위험 → 「허기짐」 딱지 · Leon이 알아챔
    await page.evaluate(() => window.__addAI('…\n<meatball>\ntime: +20h\nwith: Leon\n</meatball>')); await sleep(400);
    const b = await page.evaluate(() => { __ML__.inject(); const R = __ML__.fold(); return { st: R.S.status.map(s => s.name), facts: window.__prompts.meatlite_facts?.value ?? '' }; });
    check(b.st.includes('허기짐'), '위험 → 딱지 저절로', JSON.stringify(b.st));
    check(/notices/.test(b.facts), '인물이 알아채고 반응 (본편)', b.facts);
    // 먹으면 딱지 풀림
    await page.evaluate(() => window.__addAI('…\n<meatball>\nate: 정식\nate: 빵\n</meatball>')); await sleep(300);
    check(await page.evaluate(() => !__ML__.fold().S.status.some(s => s.name === '허기짐')), '회복하면 딱지 풀림');
    // 어긋남: 빠진 사람 등장
    await page.evaluate(() => window.__addAI('…\n<meatball>\ngone: Leon | 떠남\n</meatball>')); await sleep(200);
    await page.evaluate(() => window.__addAI('그때 Leon이 다시 나타났다.')); await sleep(400);
    check(await page.evaluate(() => __ML__.fold().flags.at(-1).some(f => f.text.includes('빠진'))), '어긋남 감지 (빠진 사람)');
    check(await page.evaluate(() => !!document.querySelector('#ml-hud .meter')), '토큰 계기판 (HUD)');
    // 한 구절: 영향력 1 → 힌트
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().influence.by.quote = -1; st.saveSettings(); __ML__.inject(); });
    check(await page.evaluate(() => /weave this line/.test(window.__prompts.meatlite_hint?.value ?? '')), '한 구절 (영향력 1부터 본편에 한 번)');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
