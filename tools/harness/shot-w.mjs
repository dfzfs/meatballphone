// 홈 위젯: 지금 할 수 있는 일 · 곧 일어날 일 · 앱 배지 / 주사위 대성공 · 대실패
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js');
        const m = st.getMeta();
        const L = m.book.people[0];
        Object.assign(L, { face: '🛡️', likes: ['꽃'], routine: [{ at: '저녁', place: '식당' }] });
        m.book.people.push({ ...L, name: 'Mia', face: '🦊', routine: [{ at: '아침', place: '식당' }], likes: [], aka: [] });
        st.saveMeta();
    });
    await page.evaluate(() => window.__addUser('시장')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\nwith: Leon\ngot: 꽃\ntaste: Leon | +꽃\ntime: +4h\npromise: Leon과 저녁 | 5h\nstatus: 감기 | 3h\nlife: Mia | 빵을 굽다 손을 데었다\nroll: 상인 설득\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200);
    const w = await page.evaluate(() => ({
        doable: [...document.querySelectorAll('.ml-do b')].map((x) => x.textContent),
        soon: [...document.querySelectorAll('.ml-w')].find((x) => x.textContent.includes('곧 일어날 일'))?.textContent,
        badges: Object.fromEntries(
            [...document.querySelectorAll('.ml-app')]
                .filter((a) => a.querySelector('.ml-badge'))
                .map((a) => [a.dataset.v, a.querySelector('.ml-badge').textContent]),
        ),
    }));
    console.log(JSON.stringify(w));
    check(w.doable.some(t => t.includes('사기')) && w.doable.some(t => t.includes('Leon에게')), '지금 할 수 있는 일 (가게 · 선물)');
    check(/감기 풀림/.test(w.soon) && /Leon과 저녁/.test(w.soon), '곧 일어날 일 (딱지 · 약속)');
    check(w.badges.news && w.badges.dice && w.badges.cal, '앱 배지 (소식 · 주사위 · 달력)');
    await page.screenshot({ path: '/tmp/w-home.png' });
    await page.evaluate(() => document.querySelector('.ml-app[data-v="news"]').click()); await sleep(150);
    await page.evaluate(() => document.querySelector('.ml-top .back').click()); await sleep(150);
    check(await page.evaluate(() => !document.querySelector('.ml-app[data-v="news"] .ml-badge')), '앱을 열면 배지 사라짐');
    // 대성공 · 대실패
    for (const d of [20, 1]) {
        await page.evaluate((d) => { Math.random = () => (d - 1) / 20 + 0.001; }, d);
        await page.evaluate(() => __ML__.app.openSheet('dice')); await sleep(100);
        await page.evaluate(() => document.querySelector('.ml-dbtn').click()); await sleep(800);
        await page.screenshot({ path: `/tmp/w-dice${d}.png`, clip: { x: 960, y: 60, width: 480, height: 170 } });
        check(await page.evaluate((d) => !!document.querySelector(d === 20 ? '.ml-d20.crit' : '.ml-d20.fumble .crack'), d), d === 20 ? '대성공 연출' : '대실패 연출');
    }
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
