// 🏎 긴 채팅 부하 (dev t-perf와 같은 모양): 메시지 N쌍 · 칩 · 상태창 열어 둔 채 한 턴
import { open, sleep } from './lib.mjs';
const N = Number(process.env.N || 600);
const { page, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async (N) => {
        const st = window.__st; let t0 = Date.UTC(2026, 0, 1);
        const ops = ['buy: 빵 | 3', 'ate: 빵', 'act: Leon | 칭찬', 'got: 꽃', 'loc: 시장', 'time: +1h', 'status: 감기 | 1d', 'promise: 약속 | 2d'];
        for (let i = 0; i < N; i++) {
            st.chat.push({ name: 'Me', is_user: true, mes: `turn ${i}`, send_date: String(t0 += 60000), extra: {} });
            const body = `Story ${i}. `.repeat(30) + `\n<meatball>\n${ops[i % ops.length]}\n${ops[(i * 3) % ops.length]}\n</meatball>`;
            st.chat.push({ name: 'Leon', is_user: false, mes: body, send_date: String(t0 += 60000), swipe_id: 0, swipes: [body], swipe_info: [{ extra: {} }], extra: {} });
        }
        window.__renderAll(); await SillyTavern.getContext().eventSource.emit('chat_changed');
    }, N);
    await sleep(600);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(300);
    const r = await page.evaluate(async () => {
        const { resetCache, fold } = await import('/ext/src/rules/engine.js');
        const t = (fn, n = 5) => { const a = performance.now(); for (let k = 0; k < n; k++) fn(); return +((performance.now() - a) / n).toFixed(2); };
        const out = {};
        out.foldFull = t(() => { resetCache(); fold(); }, 3);
        out.foldQuick = t(() => fold(), 20);
        out.inject = t(() => __ML__.inject(), 10);
        // 한 턴 전체: 답 받기 → 계산 → 그리기 (상태창 · HUD · 칩)
        let calls = 0; const o = window.__ai; window.__ai = (...a) => { calls++; return o(...a); };
        const a = performance.now();
        await window.__addAI('Story end.\n<meatball>\ncash: +1\n</meatball>');
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        out.fullTurn = +(performance.now() - a).toFixed(1);
        const P = window.__prompts, len = (k) => String(P[k]?.value ?? '').length;
        // A: 10턴 (태그 6번 · 빠짐 4번) — 추가 호출 0회
        for (let k = 0; k < 10; k++) await window.__addAI(k % 3 === 0 ? 'no tag here' : 'x\n<meatball>\ncash: +1\n</meatball>');
        out.A = { calls10: calls, injChars: len('meatlite_rule') + len('meatlite_facts') + len('meatlite_hint'), rule: len('meatlite_rule') };
        // B: 분류 모델 (가짜) — 10턴 태그 없이
        const st = await import('/ext/src/base/st.js'), C = await import('/ext/src/rules/classify.js');
        st.settings().mode = 'B'; st.settings().clsProfile = 'p-flash'; window.__sent = [];
        window.__cls = () => '<meatball>\nact: Leon | 칭찬\ntime: +1h\n</meatball>';
        const tok0 = C.clsStats.tok, c0 = C.clsStats.calls;
        for (let k = 0; k < 10; k++) { await window.__addAI(`Story b${k}. `.repeat(30)); for (let w = 0; w < 100 && !C.idle(); w++) await new Promise(r => setTimeout(r, 10)); }
        __ML__.inject();
        out.B = { calls10: C.clsStats.calls - c0, clsTokAvg: Math.round((C.clsStats.tok - tok0) / Math.max(1, C.clsStats.calls - c0)), injChars: len('meatlite_rule') + len('meatlite_facts') + len('meatlite_hint'), rule: len('meatlite_rule') };
        out.chips = document.querySelectorAll('.ml-msg').length; out.mes = window.__st.chat.length;
        return out;
    });
    console.log(JSON.stringify(r));
} finally { await close(); }
