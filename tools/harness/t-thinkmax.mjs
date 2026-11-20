// 🔓 답 길이 제한 없음(32000 · 모델 최대) · 서버가 너무 크다고 하면 그때만 8192 → 4096으로 줄여 다시 · 그 연결은 그 값으로 기억 · 빈 답이면 한 번 더
import { open, sleep, check } from './lib.mjs';
const { page, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const r = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'), C = await import('/ext/src/rules/classify.js'), K = await import('/ext/src/rules/clsconn.js');
        st.settings().mode = 'B'; st.settings().clsProfile = 'p-flash';
        const out = {}; K.resetThink();
        // 1) 보통: 32000 한 번
        window.__max = []; window.__cls = (p, info) => { window.__max.push(info.max); return '<meatball>\nloc: 편의점\n</meatball>'; };
        const t0 = await C.testConnection(); out.t0 = { ok: t0.ok, max: [...window.__max] };
        // 2) 서버가 「max_tokens is too large」 → 8192로 다시 → 성공 · 다음부턴 8192 한 번에
        K.resetThink(); window.__max = []; window.__cls = (p, info) => { window.__max.push(info.max); return info.max > 8192 ? new Error('max_tokens: 32000 > 8192, which is the maximum allowed number of output tokens') : '<meatball>\nloc: 편의점\n</meatball>'; };
        const t1 = await C.testConnection(); out.t1 = { ok: t1.ok, max: [...window.__max], cap: K.connStats.cap };
        window.__max = []; const t2 = await C.testConnection(); out.t2 = { ok: t2.ok, max: [...window.__max] };
        // 3) 빈 글로 오면 한 번 더
        K.resetThink(); let n = 0; window.__max = []; window.__cls = (p, info) => { window.__max.push(info.max); return n++ ? '<meatball>\nloc: 편의점\n</meatball>' : ''; };
        const t3 = await C.testConnection(); out.t3 = { ok: t3.ok, max: [...window.__max] };
        // 4) 계속 비면 「빈 답」 오류 그대로
        K.resetThink(); window.__cls = () => ''; const t4 = await C.testConnection(); out.t4 = { ok: t4.ok, err: t4.error };
        out.preset = C.presetText();
        // 5) 설정집 만들기(ask)도: 너무 크다고 하면 8192로 다시
        const A = await import('/ext/src/rules/ai.js'), c = SillyTavern.getContext(), g0 = c.generateRaw, seen = []; st.settings().profile = '';
        c.generateRaw = async ({ responseLength }) => { seen.push(responseLength); if (responseLength > 8192) throw new Error('max_tokens is too large: 32000. This model supports at most 8192 completion tokens'); return 'ok'; };
        out.ask = { text: await A.ask('hi', 'sys'), seen }; c.generateRaw = g0;
        // 6) 📏 사용자가 정한 답 길이: 그 값 그대로 (줄이거나 늘리지 않음)
        K.resetThink(); st.settings().clsMax = '4096'; window.__max = []; window.__cls = (p, info) => { window.__max.push(info.max); return '<meatball>\nloc: 편의점\n</meatball>'; };
        await C.testConnection(); out.u1 = [...window.__max];
        const seen2 = []; st.settings().askMax = '16000'; c.generateRaw = async ({ responseLength }) => { seen2.push(responseLength); return 'ok'; }; await A.ask('hi', 'sys'); c.generateRaw = g0; out.u2 = seen2;
        st.settings().clsMax = 'auto'; st.settings().askMax = 'auto';
        return out;
    });
    check(r.u1.join() === '4096' && r.u2.join() === '16000', '📏 설정에서 정한 답 길이 그대로', JSON.stringify([r.u1, r.u2]));
    check(r.t0.ok && r.t0.max.join() === '32000', '보통은 답 길이 32000 (제한 없음) 한 번', JSON.stringify(r.t0));
    check(r.t1.ok && r.t1.max.join() === '32000,8192' && r.t1.cap === 8192, '너무 크다고 하면 8192로 다시 · 성공', JSON.stringify(r.t1));
    check(r.t2.ok && r.t2.max.join() === '8192', '다음 요청은 처음부터 8192 (두 번 안 부름)', JSON.stringify(r.t2));
    check(r.t3.ok && r.t3.max.length === 2, '빈 글 답 → 한 번 더', JSON.stringify(r.t3));
    check(!r.t4.ok && /빈 답/.test(r.t4.err), '계속 비면 빈 답 오류', JSON.stringify(r.t4));
    check(r.ask.text === 'ok' && r.ask.seen.join() === '32000,8192', '설정집 만들기도: 너무 크면 8192로 다시', JSON.stringify(r.ask));
    check(/자동/.test(r.preset) && /권장/.test(r.preset), '설정엔 「자동 · 💡 권장」 (답 길이는 설정에서 정함)', r.preset);
} finally { await close(); }
