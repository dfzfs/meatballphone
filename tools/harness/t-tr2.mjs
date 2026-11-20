// 🌐 새 상태창 번역: 종류 고르기 · 용어집 먼저 · 한 번에 묶어 보내기 · 저장 · 다시 안 물음 · 숫자 안 보냄 · 오류면 멈춤 · 다시 번역 · 직접 고침
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    // 가짜 실리태번 기본 번역: [[n]] 줄마다 「KO:」를 붙여 돌려줌 · 부른 횟수 셈
    await page.evaluate(async () => {
        window.__trCalls = []; window.__trFail = false;
        SillyTavern.getContext().SlashCommandParser.addCommandObject({ name: 'translate', callback: async (args, text) => {
            window.__trCalls.push({ args, text });
            if (window.__trFail) throw new Error('429 Too Many Requests');
            return String(text).split('\n').map(l => l.replace(/^\[\[(\d+)\]\]\s*(.*)$/, (m, n, t) => `[[${n}]] KO:${t}`)).join('\n');
        } });
        const st = await import('/ext/src/base/st.js');
        Object.assign(st.settings(), { trMode: 'free', trSent: true, trPhrase: true, trPlace: false, trName: false, trUnit: false });
        st.settings().glossary = [{ from: 'Leon', to: '레온' }];
    });
    await page.evaluate(() => window.__addUser('go'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: Old Market\nwith: Leon\nstatus: Sleepy | 1d\nweather: Rain\ngot: Rusty Sword\nlife: Leon | Leon is tired today\n</meatball>'));
    await sleep(1500);
    const a = await page.evaluate(async () => { const T = await import('/ext/src/extra/tr.js'); return { calls: window.__trCalls.length, sent: window.__trCalls[0]?.text ?? '', dict: T.dict() }; });
    check(a.calls === 1, '새 말을 한 번에 묶어서 1회', String(a.calls));
    check(/Sleepy/.test(a.sent) && /Rain/.test(a.sent) && /레온 is tired today/.test(a.sent), '단어 · 문장 · 보낼 때 용어집 먼저 입힘', a.sent);
    check(!/Old Market/.test(a.sent) && !/Rusty Sword/.test(a.sent), '끈 종류(장소 · 명칭)는 안 보냄', a.sent);
    check(!/\[\[\d+\]\] 레온\s*$/m.test(a.sent) && !/\]\] Leon\s*$/m.test(a.sent), '용어집으로 다 바뀌는 글(「Leon」)은 안 보냄', a.sent);
    check(a.dict['Sleepy']?.t === 'KO:Sleepy' && a.dict['Leon is tired today']?.t === 'KO:레온 is tired today', '받은 번역을 저장', JSON.stringify(a.dict));
    // 화면: 번역 · 용어집이 입혀짐
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(500); // 딱지는 홈 위젯에 (수치 앱엔 수치만)
    const body = await page.evaluate(() => document.querySelector('.ml-body')?.textContent ?? '');
    check(body.includes('KO:Sleepy'), '화면에 번역', body.slice(0, 300));
    // 같은 것 다시: 새로 고쳐 그려도 다시 안 물음 · 숫자 단위는 안 보냄
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); __ML__.app.refresh(true); }); await sleep(1200);
    check(await page.evaluate(() => window.__trCalls.length) === 1, '이미 번역한 건 다시 안 물음');
    await page.evaluate(() => window.__addUser('more'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\nstatus: 18.7ms\n</meatball>')); await sleep(1200);
    check(await page.evaluate(() => window.__trCalls.length) === 1, '「18.7ms」 같은 숫자 · 단위는 안 보냄');
    // 오류: 바로 멈춤 · 한 번만 · 그 말은 남겨 둠
    await page.evaluate(() => { window.__trFail = true; });
    await page.evaluate(() => window.__addAI('…\n<meatball>\nstatus: Hungry\nstatus: Cold\n</meatball>')); await sleep(1500);
    const e = await page.evaluate(async () => { const T = await import('/ext/src/extra/tr.js'); return { calls: window.__trCalls.length, err: T.trStats.lastError, has: !!T.dict()['Hungry'] }; });
    check(e.calls === 2 && /429/.test(e.err) && !e.has, '오류면 1회만 부르고 쉼 (남은 건 안 보냄)', JSON.stringify(e));
    // 다시 번역: 종류 · 하나 · 직접 고친 건 「전부 다시」에서 빠짐
    const r = await page.evaluate(async () => {
        const T = await import('/ext/src/extra/tr.js');
        T.setTr('Rain', '비가 옴');
        const n = T.retranslate({ cat: 'phrase' });
        return { n, rain: T.dict()['Rain']?.t, sleepy: !!T.dict()['Sleepy'] };
    });
    check(r.rain === '비가 옴' && !r.sleepy && r.n >= 1, '종류별 다시 번역 · 직접 고친 건 남음', JSON.stringify(r));
    await page.evaluate(async () => { const T = await import('/ext/src/extra/tr.js'); T.retranslate({ src: 'Rain' }); return T.dict()['Rain']; });
    check(!(await page.evaluate(async () => !!(await import('/ext/src/extra/tr.js')).dict()['Rain'])), '하나만 다시 번역 (직접 고친 것도)');
    // 제대로(AI): 한 번에 · 그 묶음에 나온 용어만 지시에 · 번호로 맞춤
    const ai = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'), T = await import('/ext/src/extra/tr.js');
        st.settings().trMode = 'ai'; window.__trFail = false; window.__aiSent = [];
        window.__ai = (p, sys) => { window.__aiSent.push({ p, sys }); return String(p).split('\n').map(l => l.replace(/^\[\[(\d+)\]\]\s*(.*)$/, (m, n, t) => `[[${n}]] AI:${t}`)).reverse().join('\n'); };
        await new Promise(r => setTimeout(r, 61000 - 0)); // 오류 뒤 1분 쉼이 끝나게
        T.retranslate({ cat: 'sent' }); await new Promise(r => setTimeout(r, 800));
        const w = window.__aiSent.find(x => /tired/.test(x.p)); return { n: window.__aiSent.length, sys: w?.sys ?? '', other: window.__aiSent.find(x => !/tired/.test(x.p))?.sys ?? '', d: T.dict()['Leon is tired today']?.t, hungry: T.dict()['Hungry']?.t };
    });
    check(ai.n === 2 && ai.hungry === 'AI:Hungry', '쉼이 끝나면 오류 때 남은 말을 한 번에', JSON.stringify(ai));
    check(/Leon=레온/.test(ai.sys) && !/Leon=/.test(ai.other) && ai.d === 'AI:레온 is tired today', 'AI: 나온 용어만 지시에 · 순서가 섞여도 번호로 맞춤', JSON.stringify(ai));
    // 끄면 화면에 안 입힘 · 안 보냄
    await page.evaluate(async () => { (await import('/ext/src/base/st.js')).settings().trMode = 'off'; __ML__.app.refresh(); }); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(300);
    check(!logs.filter(l => !/404|429|번역 실패/.test(l)).length, '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
