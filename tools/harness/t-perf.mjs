// 🏎 긴 채팅 부하 (dev t-perf와 같은 모양): 메시지 N쌍 · 칩 · 상태창 열어 둔 채 한 턴
import { open, sleep } from './lib.mjs';
const N = Number(process.env.N || 600);
const { page, close } = await open();
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
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
        // 10턴 (태그 6번 · 빠짐 4번) 동안 미트볼 AI 호출
        for (let k = 0; k < 10; k++) await window.__addAI(k % 3 === 0 ? 'no tag here' : 'x\n<meatball>\ncash: +1\n</meatball>');
        out.calls10 = calls;
        const P = window.__prompts, tok = (s) => Math.ceil(String(s ?? '').length / 3);
        out.injChars = ['meatlite_rule', 'meatlite_facts', 'meatlite_hint'].reduce((q, k) => q + String(P[k]?.value ?? '').length, 0);
        out.injFactsHint = ['meatlite_facts', 'meatlite_hint'].reduce((q, k) => q + String(P[k]?.value ?? '').length, 0);
        out.chips = document.querySelectorAll('.ml-msg').length; out.mes = window.__st.chat.length;
        return out;
    });
    console.log(JSON.stringify(r));
} finally { await close(); }
