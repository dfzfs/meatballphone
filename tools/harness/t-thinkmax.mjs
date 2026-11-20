// 🧠 생각을 못 끄는 모델: 생각이 답 길이(1000)를 다 써서 빈 답 · 「Candidate text empty」 오류 → 답 길이를 늘려 한 번 더 · 다음부터 늘린 채로
import { open, sleep, check } from './lib.mjs';
const { page, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const r = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'), C = await import('/ext/src/rules/classify.js'), K = await import('/ext/src/rules/clsconn.js');
        st.settings().mode = 'B'; st.settings().clsProfile = 'p-flash';
        const out = {};
        // 1) 서버가 빈 답을 오류로 (Vertex 「Candidate text empty」)
        window.__max = []; window.__cls = (p, info) => { window.__max.push(info.max); return info.max < 2000 ? new Error('API request failed', { cause: { message: 'Google Vertex AI Candidate text empty' } }) : '<meatball>\nloc: 편의점\n</meatball>'; };
        const t1 = await C.testConnection(); out.t1 = { ok: t1.ok, max: [...window.__max], big: K.connStats.bigMax };
        // 2) 다음 요청은 처음부터 늘린 채로 (한 번에)
        window.__max = []; const t2 = await C.testConnection(); out.t2 = { ok: t2.ok, max: [...window.__max] };
        // 3) 빈 글로 오는 경우 (오류 아님)
        K.resetThink(); window.__max = []; window.__cls = (p, info) => { window.__max.push(info.max); return info.max < 2000 ? '' : '<meatball>\nloc: 편의점\n</meatball>'; };
        const t3 = await C.testConnection(); out.t3 = { ok: t3.ok, max: [...window.__max] };
        // 4) 늘려도 비면 예전처럼 「빈 답」 오류
        K.resetThink(); window.__cls = () => ''; const t4 = await C.testConnection(); out.t4 = { ok: t4.ok, err: t4.error, big: K.connStats.bigMax };
        out.preset = C.presetText();
        return out;
    });
    check(r.t1.ok && r.t1.max.join() === '1000,4000' && r.t1.big, 'Candidate text empty → 4000으로 한 번 더 · 성공', JSON.stringify(r.t1));
    check(r.t2.ok && r.t2.max.join() === '4000', '다음 요청은 처음부터 4000 (두 번 안 부름)', JSON.stringify(r.t2));
    check(r.t3.ok && r.t3.max.join() === '1000,4000', '빈 글 답 → 4000으로 한 번 더', JSON.stringify(r.t3));
    check(!r.t4.ok && /빈 답/.test(r.t4.err) && !r.t4.big, '늘려도 비면 빈 답 오류 그대로', JSON.stringify(r.t4));
} finally { await close(); }
