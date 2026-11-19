// 📏 정리 전 · 후 비교용: 특성 3개를 켠 채팅에서 한 턴 주입 토큰 (v0.25에선 지운 칸들도 같이 켜서 쟀음)
import { open, sleep } from './lib.mjs';
const { page, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => {
        const T = await import('/ext/data/traits.js'); const m = __ML__.getMeta();
        m.book.me.traitIds = T.TRAITS.slice(0, 3).map(t => t.id);
        m.mods.mind = true; __ML__.app.refresh?.(true);
    });
    await page.evaluate(() => window.__addUser('시장 가자'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\nwith: Leon\nact: Leon | 칭찬\nmind: Leon | 귀엽네\ncash: +5\n</meatball>')); await sleep(200);
    await page.evaluate(() => window.__addUser('빵 사자'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\nate: 빵\ntime: +1h\n</meatball>')); await sleep(200);
    await page.evaluate(() => window.__addUser('다음'));
    const o = await page.evaluate(() => {
        const P = window.__prompts,
            g = (k) => String(P[k]?.value ?? '');
        return {
            rule: __ML__.tokens(g('meatlite_rule')),
            facts: __ML__.tokens(g('meatlite_facts')),
            hint: __ML__.tokens(g('meatlite_hint')),
            chars: ['meatlite_rule', 'meatlite_facts', 'meatlite_hint'].reduce((q, k) => q + g(k).length, 0),
        };
    });
    o.total = o.rule + o.facts + o.hint;
    console.log(JSON.stringify(o)); if (process.argv[2]) console.log(await page.evaluate(() => Object.entries(window.__prompts).map(([k, v]) => `--- ${k}\n${v.value}`).join("\n")));
} finally { await close(); }
