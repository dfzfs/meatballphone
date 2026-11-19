// 🧬 특성 · 궁합(반대가 끌림) · 원하는 것 · 주사위 보정 (날씨 · 운세 · 특성) · 증상 속도
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'), { normBook } = await import('/ext/src/rules/book.js'); const m = st.getMeta();
        m.book.me.traitIds = ['romantic', 'glutton', 'brave'];
        m.book.people[0].traits = ['romantic']; m.book.people.push({ ...m.book.people[0], name: 'Mia', traits: ['stoic'], aka: [] });
        m.book = normBook(m.book); st.saveMeta(); });
    await page.evaluate(() => window.__addUser('안녕')); await page.evaluate(() => window.__addAI('…\n<meatball>\nwith: Leon, Mia\naff: Leon +4 | 웃음\naff: Mia +4 | 웃음\nweather: 맑음\n</meatball>')); await sleep(300);
    const r = await page.evaluate(async () => {
        const e = await import('/ext/src/rules/engine.js');
        const R = __ML__.fold();
        return {
            leon: R.S.rel.Leon.aff,
            mia: R.S.rel.Mia.aff,
            mL: e.matchOf(R.book, 'Leon'),
            mM: e.matchOf(R.book, 'Mia'),
            parts: e.diceParts(R.book, R.S, '힘', { rolled: true, stars: 5, tier: '' }),
        };
    });
    check(r.mL.mul > 1, '궁합 좋음 (로맨틱 ↔ 로맨틱)', JSON.stringify(r.mL));
    check(r.mM.mul < 1, '궁합 나쁨 (로맨틱 ↔ 무덤덤)', JSON.stringify(r.mM));
    check(r.leon > r.mia, '같은 행동이라도 궁합 좋은 쪽이 더 오름');
    check(r.parts.some(x => x.why.includes('용감함')) && r.parts.some(x => x.why.includes('운세')), '주사위 보정: 특성 · 운세');
    // 먹보: 허기가 빨리 줆 (증상 속도)
    const hunger = await page.evaluate(() => { window.__addAI('<meatball>\ntime: +5h\n</meatball>'); return new Promise(res => setTimeout(() => res(__ML__.fold().S.needs.hunger), 300)); });
    check(hunger < 80 - 4 * 5, `먹보: 5시간에 허기 ${80 - hunger} 줆 (보통 20)`);
    // 원하는 것: 허기 낮음 → 먹기 → 이루면 기분 +
    const w = await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); return e.wantsOf(__ML__.fold().book, __ML__.fold().S).map(x => x.text); });
    await page.evaluate(() => window.__addAI('<meatball>\nate: 수프\n</meatball>')); await sleep(300);
    const done = await page.evaluate(() => __ML__.fold().changes.at(-1).some(c => c.f.startsWith('want.')));
    check(w.length === 3 && w.some(t => t.includes('먹기')) && done, '원하는 것 3개 → 이룸 → 기분 +8', w.join(' / '));
    await page.evaluate(() => __ML__.app.openSheet('traits')); await sleep(200);
    const t = await page.evaluate(() => document.querySelector('.ml-body').textContent);
    check(t.includes('내 특성') && t.includes('지금 원하는 것') && t.includes('궁합'), '특성 화면');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
