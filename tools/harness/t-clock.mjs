// 🕐 시간 적는 법: 시간대(예전 그대로) · 24시간 · 오전/오후 · 시간대 + 시각 — AI가 어떻게 적어도 고른 모양으로 · 안 고르면 글자 하나 안 바뀜
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'map', 'calendar', 'wallet']);
    const cal = () => page.evaluate(() => { const c = window.__SS_TEST__.api.app.current.state.data.calendar; return { time: c.time, clock: c.clock, d: c.d, has: 'clock' in c }; });
    const ai = async (body) => { await page.evaluate(() => window.__addUser('go')); await page.evaluate((b) => window.__addAI(`t.\n<meatball>\n${b}\n</meatball>`), body); await sleep(250); };
    const keys = () => page.evaluate(async () => (await import('/ext/src/engine.js')).tagKeysFor((await import('/ext/src/core.js')).getMeta()));
    const adj = (ops) => page.evaluate(async (ops) => { await (await import('/ext/src/engine.js')).addAdjust({ ops, label: 'x' }); }, ops).then(() => sleep(250));
    await ai('time: 저녁');
    check((await cal()).time === '저녁' && !(await cal()).has, '안 고르면 예전 그대로 (시간대 낱말 · clock 열쇠 없음)');
    check(/period \(one of the time slots/.test(await keys()), 'AI 안내도 예전 그대로');
    await ai('time: 오후 2시 반');
    check((await cal()).time === '오후 2시 반', '시간대 달력은 AI가 적은 글 그대로');
    await adj([['_clock', '24']]);
    check((await cal()).time === '14:30' && (await cal()).clock === '24', '24시간으로 바꾸면 지금 시간도 옮겨짐 (14:30)');
    check(/period \(the clock time now, 24-hour HH:MM/.test(await keys()), 'AI에게 시각으로 적으라고 안내');
    await ai('time: 저녁 7시 10분'); check((await cal()).time === '19:10', 'AI 「저녁 7시 10분」 → 19:10');
    await ai('time: 9:05 PM'); check((await cal()).time === '21:05', 'AI 「9:05 PM」 → 21:05');
    await ai('time: 밤'); check((await cal()).time === '22:00', 'AI가 낱말만 적어도 시각으로 (밤 → 22:00)');
    await adj([['_clock', '12']]); check((await cal()).time === '오후 10:00', '오전 · 오후 모양');
    await adj([['_clock', 'both']]); check((await cal()).time === '밤 · 22:00', '시간대 + 시각 모양');
    await ai('time: 23:40'); const d0 = (await cal()).d;
    // 다음 시간(1시간 뒤) 단추: 자정을 넘기면 날짜도
    await page.evaluate(() => { window.__SS_TEST__.api.app.openSheet('calendar'); }); await sleep(300);
    check(await page.evaluate(() => !!document.querySelector('dialog .ss-panel .ss-clockrow .ss-seg button.on')), '달력 탭에 「시간 적는 법」 고르기');
    await page.evaluate(() => document.querySelector('dialog .ss-panel [data-act="timenext"]').click()); await sleep(400);
    check((await cal()).time === '심야 · 00:40' && (await cal()).d === d0 + 1, '1시간 뒤 단추: 자정을 넘기면 하루가 넘어감', JSON.stringify(await cal()));
    // 지도 이동: 한 칸에 1시간
    const t0 = await cal();
    await page.evaluate(async () => { const st = window.__SS_TEST__.api.app.current.state, m = st.data.map; const to = m.places.find(p => p.name !== m.here && m.places.find(q => q.name === m.here).links.includes(p.name)); await (await import('/ext/src/engine.js')).addAdjust({ ops: [['_travel', to.name]], label: 'go' }); }); await sleep(300);
    check((await cal()).time === '심야 · 01:40', '지도 이동 한 칸 = 1시간', `${t0.time} → ${(await cal()).time}`);
    check(await page.evaluate(async () => { const { dayFrac, timeWords } = await import('/ext/src/core.js'); return Math.abs(dayFrac({ time: '18:00', times: [] }) - 0.75) < 1e-9 && /밤/.test(timeWords({ time: '22:10' })) && timeWords({ time: '낮' }) === '낮'; }), '하루의 어디쯤인지 · 밤낮을 시각에서 읽음');
    await adj([['_clock', '']]);
    check((await cal()).time === '심야' && !(await cal()).has, '시간대로 되돌리면 낱말로 · clock 열쇠가 사라짐');
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 500));
} finally { await close(); }
