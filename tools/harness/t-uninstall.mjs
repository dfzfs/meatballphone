// 🗑 앱을 지우면(마켓 🗑): 그 앱 글이 본편에 0 · 분류 목록에도 0 · 화면에도 없음 (기록은 남아도 영향 없음)
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\nnewsline: 소문 | 시장에 도둑이 있대\nbgm: Love Poem - IU | 잔잔 | 장면\n</meatball>')); await sleep(400);
    const R = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'), inj = await import('/ext/src/rules/inject.js'), cls = await import('/ext/src/rules/classify.js'), eng = await import('/ext/src/rules/engine.js');
        const meta = st.getMeta(), out = {};
        const cal = (meta.cal ??= {}); cal.dday = [{ name: '우리 100일', day: Math.floor(eng.fold().S.t / 1440) }]; cal.peek = true; cal.cycle = { on: true, tell: true, starts: [Math.floor(eng.fold().S.t / 1440)], len: 28, dur: 5 };
        const text = () => { const r = eng.fold(); const f = inj.factText(r); return [inj.ruleText(r.book), f.facts, f.hint].join('\n'); };
        out.before = text();
        for (const k of Object.keys(meta.mods)) meta.mods[k] = false;
        st.saveMeta();
        out.after = text();
        out.allow = [...cls.ALLOW()].join(',');
        return out;
    });
    check(/우리 100일/.test(R.before) && /period/.test(R.before), '깔려 있을 때: D-day · 생리 줄이 들어감 (시험 준비 확인)', R.before.slice(0, 200));
    const words = ['100일', 'period', 'newsline', 'feed', 'life:', 'meddle', 'bgm', 'quote', 'mind', 'buy:', 'ate:', 'act:', 'roll', 'noted', 'weather'];
    const left = words.filter(w => R.after.includes(w));
    check(left.length === 0, '앱을 모두 지우면: 그 앱들 글이 본편에 0', left.join(',') + ' | ' + R.after.slice(0, 300));
    check(!/newsline|feed|meddle|bgm|quote|mind|noted/.test(R.allow), '분류 목록에도 지운 앱 키 없음', R.allow);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(300);
    const icons = await page.evaluate(() => [...document.querySelectorAll('.ml-app')].map(a => a.dataset.app).filter(x => !['book', 'gauge', 'cat', 'look', 'market', 'set'].includes(x)));
    check(icons.length === 0, '홈에도 지운 앱 없음', icons.join(','));
    check(!logs.some((l) => /error/i.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
