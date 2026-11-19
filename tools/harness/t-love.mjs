// 💗 연인 업데이트: 맨 위 단계면 마켓 배지 · 업데이트 카드 → 받으면 하트 아이콘 · 홈 하트 · 되돌리기 / 📅 시작 날짜 바꾸기 / 📅 달력은 늘 기본부터
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const who = await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const b = st.getMeta().book; const p = b.people[0]; p.start = { aff: 95, trust: 50 }; st.saveMeta(); return p.name; });
    await page.evaluate(() => window.__addUser('안녕')); await page.evaluate(() => window.__addAI('…')); await sleep(400);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(300);
    check(await page.evaluate(() => document.querySelector('.ml-app[data-app="market"] .ml-badge')?.textContent === '⬆'), '맨 위 단계면 마켓에 ⬆ 배지');
    await page.evaluate(() => __ML__.app.openSheet('market')); await sleep(200);
    check(await page.evaluate((w) => !!document.querySelector(`[data-act="love-up"][data-v="${w}"]`), who), '마켓 맨 위에 「관계 앱 업데이트」');
    await page.evaluate((w) => document.querySelector(`[data-act="love-up"][data-v="${w}"]`).click(), who); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(300);
    const h = await page.evaluate(() => ({ icon: document.querySelector('.ml-app[data-app="rel"]')?.className, txt: document.querySelector('.ml-app[data-app="rel"] i')?.textContent, hearts: !!document.querySelector('.ml-hearts'), badge: !!document.querySelector('.ml-app[data-app="market"] .ml-badge') }));
    check(/love/.test(h.icon) && /💗/.test(h.txt) && h.hearts && !h.badge, '받으면: 관계 아이콘 💗 · 홈 하트 · 배지 사라짐', JSON.stringify(h));
    check(await page.evaluate((w) => globalThis.MeatballPhone.people().find(p => p.name === w)?.love === true, who), '통로 people()에도 love');
    await page.evaluate(() => __ML__.app.openSheet('market')); await sleep(200);
    await page.evaluate((w) => document.querySelector(`[data-act="love-down"][data-v="${w}"]`).click(), who); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200);
    check(await page.evaluate(() => !document.querySelector('.ml-app.love') && !document.querySelector('.ml-hearts')), '되돌리면 원래대로 (다운그레이드)');
    // 📅 달력: D-day 탭을 봤다가 다시 열면 기본 달력 · 설정은 접혀 있음
    await page.evaluate(() => __ML__.app.openSheet('cal')); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="cp-tab"][data-v="dday"]')?.click()); await sleep(200);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(150);
    await page.evaluate(() => document.querySelector('.ml-app[data-app="cal"]').click()); await sleep(250);
    check(await page.evaluate(() => document.querySelector('.ml-cptabs .on')?.dataset.v === 'cal' && !!document.querySelector('[data-act="cp-set"]') && !document.querySelector('[data-act="cp-peek"]')), '달력은 늘 기본 달력부터 · 설정은 ⚙ 안에');
    check(!logs.some((l) => /error/i.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
