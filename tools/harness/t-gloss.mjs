// 🌐 용어집(표기 고정): 낱말로만 바꿈 · 이 채팅 것이 먼저 · 띄어쓰기/하이픈/대소문자 같게 · 화면 · AI에는 나온 말만 · 화면 번역은 없음
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const r = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'), G = await import('/ext/src/base/gloss.js');
        st.settings().glossary = [{ from: 'Leo', to: '레오' }, { from: 'Sky Tower', to: '하늘탑' }, { from: 'leo', to: '틀림' }];
        st.getMeta().glossary = [{ from: 'Leon', to: '레온' }, { from: 'LEO', to: '레오(채팅)' }];
        const out = {};
        out.text = G.glossText('Leon met Leo at the sky-tower. Leonard? leopard');
        out.list = G.glossList().map(g => g.to);
        out.ai = G.gloss('Leon went home'); out.aiAll = G.gloss();
        out.tr = typeof (await import('/ext/src/base/st.js')).settings().saveLang;
        return out;
    });
    check(r.text === '레온 met 레오(채팅) at the 하늘탑. Leonard? leopard', '낱말로만 · 이 채팅 것이 먼저 · 하이픈 같게', r.text);
    check(r.list.length === 3 && !r.list.includes('틀림'), '같은 말은 하나만 (이 채팅 → 모든 채팅)', JSON.stringify(r.list));
    check(r.ai === 'Glossary (always use the right side): Leon=레온', 'AI에는 그 글에 나온 말만', r.ai);
    check(/Sky Tower=하늘탑/.test(r.aiAll), '글을 안 주면 모두', r.aiAll);
    check(r.tr === 'undefined', '화면 번역 설정 없음', r.tr);
    // 화면: 소지품 이름에 용어집이 입혀짐 · 입력칸은 안 건드림
    await page.evaluate(() => window.__addUser('가자'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\ngot: Sky Tower ticket\nwith: Leon\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(400);
    const body = await page.evaluate(() => document.querySelector('.ml-body')?.textContent ?? '');
    check(body.includes('하늘탑 ticket') && !body.includes('Sky Tower ticket'), '화면 글에 용어집', body.slice(0, 200));
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(300);
    check(!logs.filter(l => !/404/.test(l)).length, '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
