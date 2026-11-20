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
    // 설정집 만들기: 용어집(한국어 표기)은 안 보내고 · 마지막에 「값은 영어로」 · 그래도 한국어로 오면 한 번 더 영어로
    const fb = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); st.settings().glossary = [{ from: 'Leon', to: '레온' }];
        const sent = []; window.__askStub = true;
        const ctx = SillyTavern.getContext(); const orig = ctx.generateRaw;
        let n = 0; ctx.generateRaw = async ({ prompt, systemPrompt }) => { sent.push(prompt); n++; return n === 1 ? '{"world":{"genre":"판타지","places":[{"name":"Market","kind":"shop","note":"시끄러운 곳"}]},"me":{"name":"Me","needs":[{"key":"hunger","name":"허기"}]},"people":[{"name":"Leon","line":"다정함","start":{"aff":90,"trust":10},"official":"-"}]}' : '{"world":{"genre":"Fantasy","places":[{"name":"Market","kind":"shop","note":"noisy place"}]},"me":{"name":"Me","needs":[{"key":"hunger","name":"Hunger"}]},"people":[{"name":"Leon","line":"kind","start":{"aff":75,"trust":10},"official":"-"}]}'; };
        st.settings().profile = '';
        const a = await import('/ext/src/rules/ai.js'); const { book } = await a.fillBook(null, ['first']);
        ctx.generateRaw = orig;
        return { first: sent[0] ?? '', calls: sent.length, book };
    });
    check(!/레온|Glossary/.test(fb.first) && /LANGUAGE: the story is in English/.test(fb.first), '설정집 만들기: 용어집 안 보냄 · 영어로 지시', fb.first.slice(0, 200));
    check(fb.calls === 2 && fb.book?.world?.genre === 'Fantasy' && fb.book?.people?.[0]?.name === 'Leon' && fb.book?.lang === 'en', '한국어로 오면 한 번 더 영어로 · 이름 그대로', JSON.stringify(fb.book).slice(0, 200));
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().saveLang = 'ko'; __ML__.app.refresh?.(true); });
    const ruleKo = await page.evaluate(async () => (await import('/ext/src/rules/inject.js')).ruleText(__ML__.getMeta().book));
    check(ko(ruleKo), '한국어로 고르면 한국어 그대로', '');
    // 자동: 사용자는 한국어로 쳐도 AI 답이 영어면 영어 이야기
    const auto = await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().saveLang = 'auto'; const c = SillyTavern.getContext(); c.chat.push({ name: 'Me', is_user: true, mes: '시장에 같이 가자. 오늘은 빵을 사고 싶어. 날씨가 정말 좋다. 오늘 하루는 어땠어? 나는 아침부터 바빴어.', extra: {} }); const L = await import('/ext/src/rules/lang.js'); return L.storyLang(); });
    check(auto === 'en', '자동: 사용자 한국어 + AI 영어 → 영어', auto);
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
