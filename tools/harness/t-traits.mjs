// 🧬 특성 · 별자리 · 궁합 · 야망 · 원하는 것 · 주사위 보정 (날씨 · 운세 · 특성)
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'), { normBook } = await import('/ext/src/rules/book.js'); const m = st.getMeta();
        m.book.me.traitIds = ['romantic', 'glutton', 'brave']; m.book.me.day = '8월 1일'; m.book.me.aspire = 'rockstar';
        m.book.people[0].day = '4월 1일'; m.book.people[0].traits = ['romantic']; m.book.people.push({ ...m.book.people[0], name: 'Mia', day: '2월 1일', traits: ['stoic'], aka: [] });
        m.book = normBook(m.book); st.saveMeta(); });
    await page.evaluate(() => window.__addUser('안녕')); await page.evaluate(() => window.__addAI('…\n<meatball>\nwith: Leon, Mia\naff: Leon +4 | 웃음\naff: Mia +4 | 웃음\nweather: 맑음\n</meatball>')); await sleep(300);
    const r = await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); const R = __ML__.fold(); return { leon: R.S.rel.Leon.aff, mia: R.S.rel.Mia.aff, mL: e.matchOf(R.book, 'Leon'), mM: e.matchOf(R.book, 'Mia'), parts: e.diceParts(R.book, R.S, '힘', { rolled: true, stars: 5, tier: '' }) }; });
    console.log(JSON.stringify(r));
    check(r.mL.sign?.name === '양자리' && r.mL.mul > 1, '별자리 · 궁합 (사자 ↔ 양 · 로맨틱 둘)');
    check(r.mM.mul < 1, '궁합 나쁨 (로맨틱 ↔ 무덤덤 · 불 ↔ 공기는 보통)');
    check(r.leon > r.mia, '같은 행동이라도 궁합 좋은 쪽이 더 오름');
    check(r.parts.some(x => x.why.includes('용감함')) && r.parts.some(x => x.why.includes('운세')), '주사위 보정: 특성 · 운세');
    // 먹보: 허기가 빨리 줆
    const hunger = await page.evaluate(() => { window.__addAI('<meatball>\ntime: +5h\n</meatball>'); return new Promise(res => setTimeout(() => res(__ML__.fold().S.needs.hunger), 300)); });
    check(hunger < 80 - 4 * 5, `먹보: 5시간에 허기 ${80 - hunger} 줆 (보통 20)`);
    // 원하는 것: 허기 낮음 → 먹기 → 이루면 기분 +
    const w = await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); return e.wantsOf(__ML__.fold().book, __ML__.fold().S).map(x => x.text); });
    console.log(w);
    await page.evaluate(() => window.__addAI('<meatball>\nate: 수프\n</meatball>')); await sleep(300);
    const done = await page.evaluate(() => __ML__.fold().changes.at(-1).some(c => c.f.startsWith('want.')));
    check(w.some(t => t.includes('먹기')) && done, '원하는 것 → 이룸 → 기분 +8');
    // 야망: 사랑꾼 20 넘으면 1단계
    await page.evaluate(() => window.__addAI('<meatball>\naff: Leon +8 | 꽃\naspire: +3 | 첫 무대\n</meatball>')); await sleep(300);
    const asp = await page.evaluate(() => { const R = __ML__.fold(); return { step: R.S.aspStep, proud: R.S.status.some(s => s.name === '뿌듯함') }; });
    check(asp.step >= 1 && asp.proud, '야망 단계 → 뿌듯함 딱지', JSON.stringify(asp));
    await page.evaluate(() => __ML__.app.openSheet('traits')); await sleep(200); await page.screenshot({ path: '/tmp/tr.png' });
    await page.evaluate(() => document.querySelector('.ml-body').scrollTo(0, 9999)); await sleep(100); await page.screenshot({ path: '/tmp/tr2.png' });
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
