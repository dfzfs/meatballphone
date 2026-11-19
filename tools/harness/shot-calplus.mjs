// 📅 달력 더하기 스크린샷: W=390 (휴대폰) · W=1440 (노트북)
import { open, sleep } from './lib.mjs';
const W = Number(process.env.W || 390);
const { page, close } = await open({ width: W, height: W < 600 ? 844 : 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => {
        const m = __ML__.getMeta();
        m.cal = { dday: [{ id: 'a', name: '우리 100일', day: 12, pin: true }, { id: 'b', name: '시험', day: 20 }], todo: [{ id: 't', text: '선물 사기', day: 9, done: false }, { id: 'u', text: '방 청소', day: null, done: true }],
            cycle: { on: true, starts: [-2], len: 28, dur: 5, tell: true }, notes: { 4: { text: '하 누구 짜증나\n내일은 쉬자', show: true, at: 1 } }, peek: true };
        __ML__.app.openSheet('cal');
    }); await sleep(250);
    await page.evaluate(() => document.querySelector('[data-act="c-day"][data-v="5"]').click()); await sleep(200);
    await page.evaluate(() => document.querySelector('.ml-cptabs')?.scrollIntoView()); await sleep(100);
    await page.screenshot({ path: `/tmp/calplus-cal-${W}.png` });
    await page.evaluate(() => document.querySelector('.ml-cpcy')?.scrollIntoView({ block: 'center' })); await sleep(100);
    await page.screenshot({ path: `/tmp/calplus-cy-${W}.png` });
    await page.evaluate(() => document.querySelector('.ml-cptabs [data-v="dday"]').click()); await sleep(200);
    await page.screenshot({ path: `/tmp/calplus-dday-${W}.png` });
    await page.evaluate(() => document.querySelector('.ml-cptabs [data-v="todo"]').click()); await sleep(200);
    await page.screenshot({ path: `/tmp/calplus-todo-${W}.png` });
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(250);
    await page.evaluate(() => document.querySelector('.ml-cppin')?.scrollIntoView({ block: 'center' })); await sleep(100);
    await page.screenshot({ path: `/tmp/calplus-home-${W}.png` });
    console.log(await page.evaluate(() => { const g = document.querySelector('.ml-calg'); return g ? 0 : 'no grid'; }));
} finally { await close(); }
