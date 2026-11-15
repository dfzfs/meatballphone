// 📦 따로 보관 (v2.7.23): 연락 · 피드에서 한 일은 기록으로 쌓이지 않고 · 채팅을 지워도 남고 · 「방금 한 일」로 AI에게 안 간다
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact', 'gossip', 'news']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const eng = await import('/ext/src/engine.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const ctx = window.SillyTavern.getContext(), set = core.settings();
        const st = () => app.current.state, meta = () => core.getMeta();
        const th = () => (st().data.contact.threads.Leon ?? []).map(m => m.text);
        const send = async (text) => { const nd = core.clone(st().data.contact); (nd.threads.Leon ??= []).push({ id: core.uid(), from: 'me', text, date: '', at: 0, arrive: 0, kind: 'text', read: false }); await eng.commit('contact', nd, `편지로 Leon에게: ${text}`); await wait(120); };
        const inj = () => { const x = eng.buildInjection(app.current, { full: true }); return Object.values(x).filter(v => typeof v === 'string').join('\n'); };
        const nCt = () => meta().adjust.filter(a => a.set?.mod === 'contact').length;
        const delLast = async () => { ctx.chat.pop(); document.querySelector('#chat .mes:last-child')?.remove(); await ctx.eventSource.emit(ctx.event_types.MESSAGE_DELETED, ctx.chat.length); await wait(250); };
        const out = {};
        out.defaultSeparate = eng.sideOn('contact') && eng.sideOn('news') && !eng.sideOn('wallet');
        await window.__addUser('hi'); await window.__addAI('s1'); await wait(150);
        for (let k = 0; k < 12; k++) await send(`m${k}`);
        out.oneRecord = nCt() === 1 && meta().adjust.length === 1;
        out.dataKept = th().length === 12;
        out.noRecentLeak = !/Since the last reply[^\n]*m11/.test(inj()) && st().recent.length === 0;
        // 채팅을 지워도 연락은 그대로
        await window.__addUser('u2'); await window.__addAI('s2'); await wait(150); await send('after');
        await delLast(); await delLast();
        out.keptAfterDelete = th().includes('after') && th().length === 13;
        // 덩어리 뒤에 온 AI 답의 연락은 그 위에 더해진다
        await window.__addUser('u3'); await window.__addAI('s3\n<meatball>\nmsg: Leon | AI가 보낸 말\n</meatball>'); await wait(250);
        out.aiAppends = th().at(-1) === 'AI가 보낸 말' && th().length === 14;
        // 되돌리기는 덩어리를 건드리지 않는다
        await eng.addAdjust({ ops: [['cash', '+5']], label: 'x' }); await wait(120);
        await eng.undoLast(); await wait(150);
        out.undoSkips = th().length === 14 && nCt() === 1;
        // 바뀐 게 없으면 다시 저장하지 않는다
        { const t0 = meta().adjust.find(a => a.side === 'contact').t; await eng.commit('contact', core.clone(st().data.contact), ''); await wait(120); out.noChangeNoWrite = meta().adjust.find(a => a.side === 'contact').t === t0; }
        // 다시 생성한 답: 옛 스와이프가 올린 소문은 빠지고 새 것만
        await window.__addUser('u4'); await window.__addAI('s4\n<meatball>\nrumor: Old Phantom | old body\n</meatball>'); await wait(250);
        { const nd = core.clone(st().data.gossip); nd.name = 'Renamed Tabloid'; await eng.commit('gossip', nd, ''); await wait(150); }
        const titles = () => st().data.gossip.issues.map(x => x.title);
        out.rumorIn = titles().includes('Old Phantom') && st().data.gossip.name === 'Renamed Tabloid';
        await window.__swipeNew?.('s4b\n<meatball>\nrumor: Blue Phantom | new body\n</meatball>');
        if (!window.__swipeNew) { const m = ctx.chat.at(-1); m.swipes = [m.mes, 's4b']; m.swipe_info = [{ extra: structuredClone(m.extra ?? {}), gen_started: m.gen_started, send_date: m.send_date }, { extra: {}, gen_started: new Date(Date.now() + 5000).toISOString(), send_date: m.send_date }]; m.swipe_id = 1; m.mes = 's4b\n<meatball>\nrumor: Blue Phantom | new body\n</meatball>'; m.extra = {}; await ctx.eventSource.emit(ctx.event_types.MESSAGE_SWIPED, ctx.chat.length - 1); }
        await wait(400);
        out.regenWins = titles().includes('Blue Phantom') && !titles().includes('Old Phantom') && st().data.gossip.name === 'Renamed Tabloid';
        out._titles = titles().join('|');
        // 「채팅에 붙이기」를 켠 칸은 예전처럼 기록으로 쌓이고, 다시 끄면 덩어리 하나로 정리된다
        set.bindContact = true; core.saveSettings();
        await send('bound1'); await send('bound2');
        out.boundRecords = nCt() === 3 && /Since the last reply[^\n]*bound2/.test(inj());
        set.bindContact = false; core.saveSettings(); app.refreshNow(); await wait(100);
        out.sweep = app.sideSweep() === 1; await wait(200);
        out.sweptOne = nCt() === 1 && th().includes('bound2') && !/Since the last reply[^\n]*bound2/.test(inj());
        return out;
    });
    for (const [k, v] of Object.entries(r)) if (!k.startsWith('_')) check(v === true, k, k === 'regenWins' ? r._titles : '');
    check(!logs.length, '콘솔 오류 없음', logs.slice(0, 3).join(' / '));
} finally { await close(); }
