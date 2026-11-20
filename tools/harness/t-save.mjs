// 💾 저장 겹침 막기: 스트리밍 중 저장 0회 · 끝나고 1초 뒤 한 번 · saveChat 하나만 · 글(mes)은 끝난 뒤 한 번만 고침
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const saves = () => page.evaluate(() => window.__saves ?? []);
try {
    await page.evaluate(() => window.__quickStart()); await sleep(1500);
    await page.evaluate(() => { window.__saves = []; });

    // A 모드: 태그가 붙은 답을 스트리밍 · 그 사이에 저장을 부르는 일(설정집 고침 · 상태 저장)을 일부러 일으킴
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().mode = 'A'; st.saveSettings(); });
    await page.evaluate(() => window.__addUser('시장에 가자'));
    const mesLog = [];
    await page.evaluate(() => window.__stream('Leon과 시장으로 갔다. 사과를 샀다.\n<meatball>\nloc: 시장\n</meatball>', {
        during: async () => {
            const st = await import('/ext/src/base/st.js'); st.getMeta().note = 'x'; st.saveMeta(); st.saveChatSoon(); st.saveMeta();
            __ML__.app.refresh(true);
        },
    }));
    const atEnd = await saves();
    check(atEnd.filter(x => x.gen).length === 0, '스트리밍 중 저장 호출 0회', JSON.stringify(atEnd));
    check(atEnd.filter(x => x.fn !== 'st-own').length === 0, '끝난 직후(실리태번 자체 저장 때)엔 아직 안 부름', JSON.stringify(atEnd));
    await sleep(1400);
    const after = (await saves()).filter(x => x.fn !== 'st-own');
    const ended = await page.evaluate(() => window.__ended);
    check(after.length === 1 && after[0].fn === 'saveChat' && after[0].at - ended >= 900, `답 하나에 저장 요청 한 번 · 끝나고 ≈1초 뒤 (${after.map(x => Math.round(x.at - ended)).join(',')}ms)`, JSON.stringify(after));
    check(!(await saves()).some(x => /saveMetadata/.test(x.fn)), 'saveMetadata를 따로 안 부름 (saveChat 하나로 메타까지)');
    const m = await page.evaluate(() => { const c = SillyTavern.getContext().chat; return c[c.length - 1].mes; });
    check(!/meatball/.test(m) && /사과를 샀다/.test(m) && await page.evaluate(() => __ML__.fold().S.loc) === '시장', '태그는 끝난 뒤 한 번 떼고 사건은 읽힘', m);

    // B 모드: 앞 답의 분류가 다음 답 스트리밍 중에 끝나도 저장은 기다림
    await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); st.settings().mode = 'B'; st.settings().clsProfile = 'p-flash'; st.saveSettings();
        window.__cls = async () => { await new Promise(r => setTimeout(r, 500)); return '<meatball>\nloc: 집\n</meatball>'; };
        window.__saves = [];
    });
    await page.evaluate(() => window.__addUser('집에 가자'));
    await page.evaluate(() => window.__stream('집으로 돌아왔다.', { parts: 3, ms: 50 }));
    // 분류(0.5초)가 도는 사이 다음 답 스트리밍 시작
    await sleep(100);
    await page.evaluate(() => window.__addUser('잘 자'));
    await page.evaluate(() => window.__stream('불을 껐다. 조용한 밤이었다.', { parts: 6, ms: 250 }));
    let all = await saves();
    check(all.filter(x => x.gen).length === 0, 'B: 분류가 스트리밍 중에 끝나도 저장 0회', JSON.stringify(all));
    await sleep(2200); // 마지막 답의 분류(0.5초) 결과까지 합쳐 한 번
    all = (await saves()).filter(x => x.fn !== 'st-own');
    const lastEnd = await page.evaluate(() => window.__ended);
    check(all.filter(x => x.at > lastEnd).length === 1, 'B: 끝나고 한 번만 (분류 결과 저장까지 합침)', JSON.stringify(all.map(x => Math.round(x.at - lastEnd))));
    // 겹침 없음: 우리 저장 요청끼리 1초 안에 두 번 없음 · 실리태번 자체 저장 1초 안에 없음
    const every = await saves();
    const ours = every.filter(x => x.fn === 'saveChat').map(x => x.at), own = every.filter(x => x.fn === 'st-own').map(x => x.at);
    const close1 = ours.some((t, k) => k && t - ours[k - 1] < 900) || ours.some(t => own.some(o => t >= o && t - o < 900));
    check(!close1, '저장 요청이 서로 · 실리태번 저장과 1초 안에 겹치지 않음', JSON.stringify({ ours, own }));
    check(await page.evaluate(() => __ML__.fold().S.loc) === '집', '분류 결과는 그대로 들어감');
    check(!logs.length, '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
