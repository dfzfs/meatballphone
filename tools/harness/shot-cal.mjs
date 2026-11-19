import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const m = st.getMeta(); m.book.people[0].day = '3월 9일 생일'; m.book.me.day = '3월 20일'; st.saveMeta(); });
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\npromise: Leon과 저녁 | 3/4\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('cal')); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="c-day"][data-v="4"]').click()); await sleep(200);
    await page.screenshot({ path: '/tmp/cal.png' });
    await page.evaluate(() => document.querySelector('[data-act="c-time"][data-v="+1d"]').click()); await sleep(300);
    check(await page.evaluate(() => { const S = __ML__.fold().S; return Math.floor(S.t / 1440) === 1 && S.t % 1440 === 480 && S.needs.energy > 50; }), '다음 날 아침 (자고 나서)');
    await page.evaluate(() => __ML__.app.openSheet('gauge')); await sleep(200);
    await page.evaluate(() => document.querySelector('.ml-body').scrollTo(0, 9999)); await sleep(100);
    await page.screenshot({ path: '/tmp/gauge.png' });
    check(await page.evaluate(() => document.querySelectorAll('.ml-inj').length) >= 2, '본편에 가는 글 보임');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
