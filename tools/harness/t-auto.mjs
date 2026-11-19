// 저절로 생기는 것 · 알림 · 토큰 계기판 · 본문 글자만으로는 아무것도 짐작하지 않음 (장면 인식 · 어긋남 감지는 지움)
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => { __ML__.app.refresh(); }); 
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('Leon과 함께 시장으로 갔다. Leon이 웃었다.\n<meatball>\npromise: Leon과 저녁 | 10h\n</meatball>')); await sleep(400);
    const a = await page.evaluate(() => { const R = __ML__.fold(); return { loc: R.S.loc, with: R.S.with, toasts: document.querySelectorAll('.ml-toast').length }; });
    check(a.loc !== '시장' && !a.with.length, '본문에 이름 · 장소가 나와도 짐작하지 않음 (태그 · 분류만)', JSON.stringify(a));
    check(await page.evaluate(() => [...document.querySelectorAll('.ml-toast')].some(t => t.textContent.includes('Leon과 저녁'))), '하루 전 알림');
    // 오래 굶김 → 허기 위험 → 「허기짐」 딱지 · Leon이 알아챔
    await page.evaluate(() => window.__addAI('…\n<meatball>\ntime: +20h\nwith: Leon\n</meatball>')); await sleep(400);
    const b = await page.evaluate(() => { __ML__.inject(); const R = __ML__.fold(); return { st: R.S.status.map(s => s.name), facts: window.__prompts.meatlite_facts?.value ?? '' }; });
    check(b.st.includes('허기짐'), '위험 → 딱지 저절로', JSON.stringify(b.st));
    check(/notices/.test(b.facts), '인물이 알아채고 반응 (본편)', b.facts);
    // 먹으면 딱지 풀림
    await page.evaluate(() => window.__addAI('…\n<meatball>\nate: 정식\nate: 빵\n</meatball>')); await sleep(300);
    check(await page.evaluate(() => !__ML__.fold().S.status.some(s => s.name === '허기짐')), '회복하면 딱지 풀림');
    // 확인 필요는 줄(conflict:)로만 — 본문 훑기는 없음
    await page.evaluate(() => window.__addAI('…\n<meatball>\ngone: Leon | 떠남\n</meatball>')); await sleep(200);
    await page.evaluate(() => window.__addAI('그때 Leon이 다시 나타났다.')); await sleep(400);
    check(await page.evaluate(() => !(__ML__.fold().flags.at(-1) ?? []).length), '본문만으로는 확인 필요가 안 뜸');
    await page.evaluate(() => window.__addAI('…\n<meatball>\nconflict: 떠난 Leon이 다시 나옴\n</meatball>')); await sleep(300);
    check(await page.evaluate(() => __ML__.fold().flags.at(-1).some(f => f.text.includes('떠난 Leon'))), 'conflict: 줄 → 확인 필요');
    check(await page.evaluate(() => !!document.querySelector('#ml-hud .meter')), '토큰 계기판 (HUD)');
    // 한 구절: AI가 고른 구절이 바뀐 턴에만 본편에 한 번 (영향력 1부터)
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().influence.by.quote = -1; st.saveSettings(); });
    await page.evaluate(() => window.__addAI('…\n<meatball>\nquote: 천 리 길도 한 걸음부터 | 한국 속담 | | 시작이 반\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.inject());
    check(await page.evaluate(() => /weave this line once[^\n]*천 리 길도/.test(window.__prompts.meatlite_hint?.value ?? '')), '한 구절이 바뀐 턴에 본편에 한 번');
    await page.evaluate(() => window.__addAI('…')); await sleep(300); await page.evaluate(() => __ML__.inject());
    check(await page.evaluate(() => !/weave this line/.test(window.__prompts.meatlite_hint?.value ?? '')), '다음 턴엔 안 들어감');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
