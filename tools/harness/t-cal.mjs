// 📅 판타지 달력 · 시간 적는 법: 설정집 세계 폼 → 달 이름 · 요일 · 연호 · 오전/오후, 날짜 태그로 이동
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const fill = (vals, picks = {}) =>
    page.evaluate(
        ([vals, picks]) => {
            for (const [k, v] of Object.entries(vals)) document.querySelector(`#mlf-${k}`).value = v;
            for (const [k, v] of Object.entries(picks)) document.querySelector(`.ml-picks[data-k="${k}"] [data-pick="${v}"]`).click();
            document.querySelector('.ml-bs [data-bs="ok"]').click();
        },
        [vals, picks],
    );
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('book')); await sleep(150);
    const has = await page.evaluate(() => !!document.querySelector('[data-act="bk-world"]'));
    check(has, '세계 편집 버튼');
    await page.evaluate(() => document.querySelector('[data-act="bk-world"]').click()); await sleep(200);
    await fill({ start: '1024-2-15', months: '서리달 30, 불꽃달 28, 바람달 31', week: '해, 달, 불, 물, 나무', era: '왕국력' }, { kind: 'custom', style: '12' }); await sleep(300);
    const cal = await page.evaluate(() => __ML__.getMeta().book.world.start.cal);
    check(cal.months?.length === 3 && cal.months[1].days === 28 && cal.week.length === 5 && cal.era === '왕국력' && cal.style === '12', '달력 저장', JSON.stringify(cal));
    await page.evaluate(() => window.__addUser('1')); await page.evaluate(() => window.__addAI('a\n<meatball>\ntime: 오후 2:30\n</meatball>')); await sleep(200);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200);
    const hero = await page.evaluate(() => document.querySelector('.ml-hero')?.textContent ?? '');
    check(hero.includes('불꽃달') && hero.includes('오후 2:30'), '홈: 달 이름 · 오전/오후', hero.slice(0, 120));
    await page.evaluate(() => window.__addAI('b\n<meatball>\ndate: 바람달 2일\n</meatball>')); await sleep(200);
    const S = await page.evaluate(() => __ML__.fold().S.t);
    check(Math.floor(S / 1440) === 15, '날짜 태그 → 바람달 2일 (16일째)', String(S));
    await page.evaluate(() => __ML__.app.openSheet('cal')); await sleep(200);
    const c = await page.evaluate(() => ({ h: document.querySelector('.ml-calh b')?.textContent, w: [...document.querySelectorAll('.ml-cw')].map(x => x.textContent).join(''), n: document.querySelectorAll('.ml-cc:not(.x)').length }));
    check(c.h === '왕국력 1024년 바람달' && c.w === '해달불물나무' && c.n === 31, '달력: 연호 · 요일 · 31칸', JSON.stringify(c));
    const rule = await page.evaluate(() => __ML__.app.lastInj?.() ?? '');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
