// 🌐 영어 이야기: AI에게 가는 말(본편 적는 법 · 사실 · 분류 · 설정집 견본)이 영어 · 계산은 같음
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const ko = (t) => /[가-힣]/.test(t);
try {
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().saveLang = 'en'; });
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const b = await page.evaluate(async () => { const a = await import('/ext/src/rules/ai.js'); return a.templateBook(); });
    check(b.lang === 'en' && b.me.needs[0].name === 'Hunger' && b.stages.at(-1).name === 'Lover', '영어 틀: 욕구 · 단계 영어', JSON.stringify([b.lang, b.me.needs[0].name, b.stages.at(-1)]));
    await page.evaluate(async () => { const a = await import('/ext/src/rules/ai.js'); const m = __ML__.getMeta(); m.book = a.templateBook(); for (const k of Object.keys(m.mods)) m.mods[k] = true; __ML__.app.refresh?.(true); });
    await page.evaluate(() => window.__addUser('Hi there, how are you doing today?')); await page.evaluate(() => window.__addAI('Leon smiles and walks with you to the market, chatting happily about the weather.\n<meatball>\nloc: Market\nwith: Leon\nact: Leon | pleased\nbuy: Bread | 3\n</meatball>')); await sleep(300);
    const r = await page.evaluate(() => { const r = __ML__.fold(); return { aff: Object.values(r.S.rel)[0]?.aff, cash: r.S.cash, loc: r.S.loc }; });
    check(r.loc === 'Market' && r.aff > 10, '영어 기본 행동 「pleased」도 계산', JSON.stringify(r));
    const rule = await page.evaluate(async () => (await import('/ext/src/rules/inject.js')).ruleText(__ML__.getMeta().book));
    check(!ko(rule), '본편 적는 법 영어 (한글 0)', rule.match(/[^\n]*[가-힣][^\n]*/)?.[0] ?? '');
    await page.evaluate(() => __ML__.inject()); const facts = await page.evaluate(() => window.__prompts.meatlite_facts?.value ?? '');
    check(facts && !ko(facts), '본편 사실 영어 (한글 0)', facts.slice(0, 300));
    const cls = await page.evaluate(async () => { const c = await import('/ext/src/rules/classify.js'); const P = c.buildPrompt?.((SillyTavern.getContext().chat.length - 1)); return P ? P.system + '\n' + P.user : ''; });
    check(cls && /Write every value in English/.test(cls) && /pleased/.test(cls), '분류 지시 영어 · 기본 행동 pleased', cls.slice(0, 200));
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().saveLang = 'ko'; __ML__.app.refresh?.(true); });
    const ruleKo = await page.evaluate(async () => (await import('/ext/src/rules/inject.js')).ruleText(__ML__.getMeta().book));
    check(ko(ruleKo), '한국어로 고르면 한국어 그대로', '');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
