// 🧬 특성 30개 이하 · 반대가 끌림 · 나만의 특성(조건) · 함께 못 가짐 · 지운 특성 옮기기 · 원하는 것 3개 · 바뀜
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const d = await page.evaluate(async () => {
        const T = await import('/ext/data/traits.js'), st = await import('/ext/src/base/st.js'), { normBook } = await import('/ext/src/rules/book.js'), e = await import('/ext/src/rules/engine.js');
        const m = st.getMeta();
        // 옛 특성 이름(지운 것) → 가장 가까운 남은 특성으로
        m.book.me.traitIds = ['neat', 'erratic'];
        m.book.me.customTraits = [{ name: '야행성', icon: '🦇', fx: 'dice', attr: '감각', pow: 2, when: 'night' }, { name: '억지 강함', fx: 'mood', pow: 2, when: 'always' }];
        m.book.people[0].traits = ['slob', 'geek'];
        m.book.people.push({ ...m.book.people[0], name: 'Mia', traits: ['unflirty'], aka: [] });
        m.book = normBook(m.book); const cid = m.book.me.customTraits[0].id; m.book.me.traitIds = [...m.book.me.traitIds, cid]; m.book = normBook(m.book); st.saveMeta();
        const L = e.matchOf(m.book, 'Leon'), M = e.matchOf(m.book, 'Mia');
        const keys = new Set(T.TRAITS.flatMap(t => Object.keys(t)));
        return { n: T.TRAITS.length, L, M, keys: [...keys], strong: m.book.me.customTraits.map(c => c.pow), ids: m.book.me.traitIds, leon: m.book.people[0].traits, conflict: T.conflictOf('slob', ['perfectionist']), noC: T.conflictOf('kind', ['perfectionist']) };
    });
    check(d.n <= 30, `특성 ${d.n}개 (30개 이하)`);
    const OK = new Set(['id', 'cat', 'icon', 'name', 'desc', 'dice', 'rate', 'aff', 'affDown', 'trust', 'trustDown', 'early', 'late', 'one', 'shy', 'jealousy', 'jealousSelf', 'wx', 'luck', 'noFumble', 'fumble']);
    check(d.keys.every(k => OK.has(k)), '효과는 주사위 · 관계 폭 · 증상 속도에 쓰이는 것만', d.keys.filter(k => !OK.has(k)).join(','));
    check(d.ids[0] === 'perfectionist' && d.ids.length === 2 && d.leon.join() === 'slob,bookworm', '지운 특성 → 가장 가까운 것 · 없으면 조용히 뺌', JSON.stringify({ ids: d.ids, leon: d.leon }));
    check(d.L.mul > 1 && d.L.mulT < d.L.mul && d.L.tc.opp.length === 1, '반대가 끌림: 완벽주의 ⇄ 털털함 → 애정 궁합 + · 우정 궁합은 낮음', JSON.stringify(d.L));
    check(d.strong[0] === 2 && d.strong[1] === 1, '나만의 특성: 조건 있으면 「강」 · 조건 없이 「강」은 「약」으로');
    check(d.conflict === 'perfectionist' && !d.noC, '반대 특성 함께 못 가짐');
    // 조건: 밤에만 감각 +2
    await page.evaluate(() => window.__addUser('안녕'));
    await page.evaluate(() => window.__addAI('<meatball>\ntime: 14:00\n</meatball>')); await sleep(300);
    const day = await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); const R = __ML__.fold(); return e.diceParts(R.book, R.S, '감각').map(p => p.why); });
    await page.evaluate(() => window.__addAI('<meatball>\ntime: 22:00\n</meatball>')); await sleep(300);
    const night = await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); const R = __ML__.fold(); return e.diceParts(R.book, R.S, '감각').map(p => p.why); });
    check(!day.some(w => w.includes('야행성')) && night.some(w => w.includes('야행성')), '켜지는 조건: 밤에만 판정 보너스', JSON.stringify({ day, night }));
    // 원하는 것: 늘 3개 · 시간이 지나면 바뀜
    const w1 = await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); const R = __ML__.fold(); return e.wantsOf(R.book, R.S).map(w => `${w.srcName}:${w.text}`); });
    const seen = new Set(w1);
    for (let k = 0; k < 4; k++) {
        await page.evaluate(() => window.__addAI('<meatball>\ntime: +5h\nate: 빵\n</meatball>'));
        await sleep(250);
        (
            await page.evaluate(async () => {
                const e = await import('/ext/src/rules/engine.js');
                const R = __ML__.fold();
                return e.wantsOf(R.book, R.S).map((w) => `${w.srcName}:${w.text}`);
            })
        ).forEach((x) => seen.add(x));
    }
    check(w1.length === 3, '원하는 것 3개');
    check(seen.size > 4, `시간이 지나면 바뀜 (${seen.size}가지)`);
    await page.evaluate(() => __ML__.app.openSheet('traits')); await sleep(200);
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const m = st.getMeta(); m.book.me.traitIds = m.book.me.traitIds.slice(0, 1); st.saveMeta(); __ML__.app.refresh?.(true); }); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="tr-pick"]')?.click()); await sleep(250);
    const pick = await page.evaluate(() => ({ off: document.querySelectorAll('.ml-bs .ml-trait.off').length, all: document.querySelectorAll('.ml-bs [data-act="tr-add"]').length }));
    check(pick.off >= 1 && pick.all <= 32, `고르기 시트: 함께 못 가지는 특성은 흐리게 (${pick.off}) · ${pick.all}개`);
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
