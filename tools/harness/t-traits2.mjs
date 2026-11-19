// 🧬 특성 확장: 반대가 끌림 · 치명적인 매력 · 나만의 특성(조건) · 함께 못 가짐 · 야망 20+ · 나만의 야망 · 원하는 것 3개 · 바뀜
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    const d = await page.evaluate(async () => {
        const T = await import('/ext/data/traits.js'), st = await import('/ext/src/base/st.js'), { normBook } = await import('/ext/src/rules/book.js'), e = await import('/ext/src/rules/engine.js');
        const m = st.getMeta();
        m.book.me.traitIds = ['neat', 'irresistible'];
        m.book.me.customTraits = [{ name: '야행성', icon: '🦇', fx: 'dice', attr: '감각', pow: 2, when: 'night' }, { name: '억지 강함', fx: 'mood', pow: 2, when: 'always' }];
        m.book.people[0].traits = ['slob']; m.book.people[0].day = ''; m.book.me.day = '';
        m.book.people.push({ ...m.book.people[0], name: 'Mia', traits: ['unflirty'], aka: [] });
        m.book = normBook(m.book); const cid = m.book.me.customTraits[0].id; m.book.me.traitIds = [...m.book.me.traitIds, cid]; m.book = normBook(m.book); st.saveMeta();
        const L = e.matchOf(m.book, 'Leon'), M = e.matchOf(m.book, 'Mia');
        return { n: T.TRAITS.length, asp: T.ASPIRES.length, L, M, strong: m.book.me.customTraits.map(c => c.pow), ids: m.book.me.traitIds, conflict: T.conflictOf('slob', ['neat']), noC: T.conflictOf('kind', ['neat']) };
    });
    console.log(JSON.stringify(d));
    check(d.n >= 70, `특성 ${d.n}개`);
    check(d.asp >= 20, `야망 ${d.asp}개`);
    check(d.L.mul > 1 && d.L.mulT < d.L.mul && d.L.tc.opp.length === 1, '반대가 끌림: 깔끔쟁이 ⇄ 털털함 → 애정 궁합 + · 우정 궁합은 낮음');
    check(d.L.tc.why.some(w => w.includes('매력')), '치명적인 매력 → 궁합 가중치');
    check(d.M.mul < d.L.mul, '철벽 상대에겐 매력이 덜 먹힘');
    check(d.strong[0] === 2 && d.strong[1] === 1, '나만의 특성: 조건 있으면 「강」 · 조건 없이 「강」은 「약」으로');
    check(d.ids.length === 3 && d.conflict === 'neat' && !d.noC, '나만의 특성 장착 · 반대 특성 함께 못 가짐');
    // 조건: 밤에만 감각 +2
    await page.evaluate(() => window.__addUser('안녕'));
    await page.evaluate(() => window.__addAI('<meatball>\ntime: 14:00\n</meatball>')); await sleep(300);
    const day = await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); const R = __ML__.fold(); return e.diceParts(R.book, R.S, '감각').map(p => p.why); });
    await page.evaluate(() => window.__addAI('<meatball>\ntime: 22:00\n</meatball>')); await sleep(300);
    const night = await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); const R = __ML__.fold(); return e.diceParts(R.book, R.S, '감각').map(p => p.why); });
    check(!day.some(w => w.includes('야행성')) && night.some(w => w.includes('야행성')), '켜지는 조건: 밤에만 판정 보너스', JSON.stringify({ day, night }));
    // 원하는 것: 늘 3개 · 출처가 섞임 · 시간이 지나면 바뀜
    const w1 = await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); const R = __ML__.fold(); return e.wantsOf(R.book, R.S).map(w => `${w.srcName}:${w.text}`); });
    const seen = new Set(w1);
    for (let k = 0; k < 4; k++) { await page.evaluate(() => window.__addAI('<meatball>\ntime: +5h\nate: 빵\n</meatball>')); await sleep(250); (await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); const R = __ML__.fold(); return e.wantsOf(R.book, R.S).map(w => `${w.srcName}:${w.text}`); })).forEach(x => seen.add(x)); }
    console.log(w1, [...seen]);
    check(w1.length === 3, '원하는 것 3개');
    check(seen.size > 4, `시간이 지나면 바뀜 (${seen.size}가지)`);
    // 야망: 큰손(쓴 돈) · 나만의 야망(직접 체크)
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const m = st.getMeta(); m.book.me.aspire = 'luxury'; st.saveMeta(); });
    await page.evaluate(() => window.__addAI('<meatball>\nearn: 900 | 상금\nbuy: 반지 | 150\n</meatball>')); await sleep(300);
    const ty = await page.evaluate(() => { const R = __ML__.fold(); return { spent: R.S.tally?.spent, step: R.S.aspStep, gifts: R.S.tally?.gifts }; });
    check(ty.spent >= 150 && ty.step >= 1, '호화로운 생활: 번 돈 누적 → 단계 · 쓴 돈도 셈', JSON.stringify(ty));
    await page.evaluate(() => __ML__.app.openSheet('traits')); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="tr-asp"]')?.click()); await sleep(200);
    const nAsp = await page.evaluate(() => document.querySelectorAll('[data-act="tr-asp-set"]').length);
    check(nAsp >= 21, `야망 시트 ${nAsp}개 버튼`);
    await page.screenshot({ path: '/tmp/asp.png' });
    await page.evaluate(() => document.querySelector('.ml-bs')?.remove());
    await page.evaluate(() => document.querySelector('[data-act="tr-pick"], .ml-trait.add')?.click()); await sleep(200);
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const m = st.getMeta(); m.book.me.traitIds = m.book.me.traitIds.slice(0, 2); st.saveMeta(); __ML__.app.refresh?.(true); }); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="tr-pick"]')?.click()); await sleep(250);
    const off = await page.evaluate(() => document.querySelectorAll('.ml-bs .ml-trait.off').length);
    check(off >= 1, `함께 못 가지는 특성은 흐리게 (${off})`);
    await page.screenshot({ path: '/tmp/pick.png' });
    await page.evaluate(() => document.querySelector('.ml-bs')?.remove());
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'), { normBook } = await import('/ext/src/rules/book.js'); const m = st.getMeta(); m.book.me.aspireCustom = { name: '최고의 기사', icon: '🗡️', base: 'manual', steps: '1, 2, 4' }; m.book.me.aspire = 'custom'; m.book = normBook(m.book); st.saveMeta(); __ML__.app.refresh?.(true); }); await sleep(250);
    await page.evaluate(() => document.querySelector('[data-act="tr-asp-tick"][data-v="나|1"]')?.click()); await sleep(300);
    const cu = await page.evaluate(() => __ML__.fold().S.aspLv?.['나']);
    check(cu === 1, '나만의 야망 · 직접 +1 (이야기 진척)', String(cu));
    // 인물 야망: AI 태그 → 단계 · 소식 · 본편 주입에 목표 문장
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'), { normBook } = await import('/ext/src/rules/book.js'); const m = st.getMeta(); m.book.people[0].aspire = 'rockstar'; m.book = normBook(m.book); st.saveMeta(); });
    await page.evaluate(() => window.__addAI('<meatball>\nwith: Leon\naspire: Leon | +3 | 첫 무대\n</meatball>')); await sleep(300);
    const np = await page.evaluate(async () => { const R = __ML__.fold(), inj = await import('/ext/src/rules/inject.js'); return { lv: R.S.aspLv?.Leon, step: R.changes.at(-1).some(c => c.f === 'aspire.Leon'), news: R.S.news.some(n => n.text.includes('록스타')), fact: inj.factText(R, []).facts, rule: inj.ruleText(R.book) }; });
    console.log(np.fact);
    check(np.lv === 3 && np.step && np.news, '인물 야망: aspire 태그 → Lv · 단계 · 소식', JSON.stringify({ lv: np.lv, step: np.step, news: np.news }));
    check(/lifetime wishes/.test(np.fact) && /rock star/.test(np.fact) && /aspire:/.test(np.rule), '본편: 평생 소원 목표 문장(영어) · aspire 키');
    await page.evaluate(() => __ML__.app.refresh?.(true)); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="tr-asp"][data-v="Leon"]')?.click()); await sleep(250);
    const pn = await page.evaluate(() => [...document.querySelectorAll('.ml-bs [data-act="tr-asp-set"]')].filter(b => b.dataset.v.startsWith('Leon|')).length);
    check(pn >= 50, `인물 야망 시트 (${pn}개)`);
    await page.screenshot({ path: '/tmp/pasp.png' });
    await page.evaluate(() => document.querySelector('.ml-bs')?.remove());
    await page.evaluate(() => document.querySelector('.ml-body').scrollTo(0, 0)); await sleep(100); await page.screenshot({ path: '/tmp/tv1.png' });
    await page.evaluate(() => document.querySelector('.ml-body').scrollTo(0, 9999)); await sleep(100); await page.screenshot({ path: '/tmp/tv2.png' });
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
