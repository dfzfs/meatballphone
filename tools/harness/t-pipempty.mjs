// 🧪 칩 점검 (검수): 빈 <meatball></meatball>(= 바뀐 것 없음)에 「안 썼어요 — 씹혔어요」 🔍가 붙던 것 · 깨진 블록은 그대로 알림
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel']);
    const r = await page.evaluate(async () => {
        const app = window.__SS_TEST__.api.app, pip = await import('/ext/src/pip.js'), core = await import('/ext/src/core.js'), wait = (ms) => new Promise(x => setTimeout(x, ms)), out = {};
        let calls = 0; window.__ai = () => { calls++; return '{}'; };
        for (const sync of ['tagPlus', 'tag']) {
            core.settings().sync = sync; core.saveSettings();
            for (const [k, body] of [['empty', 's\n<meatball></meatball>'], ['none', 's\n<meatball>\n(변화 없음)\n</meatball>'], ['broken', 's\n<meatball>\ncash +5\n</meatball>'], ['notag', 'just a story'], ['ok', 's\n<meatball>\ncash: +5\n</meatball>']]) {
                const c0 = calls; await window.__addUser('u'); await window.__addAI(body); await wait(500);
                const i = app.current.lastAI; out[`${sync}:${k}`] = { code: app.pipDiag(i)?.code, badge: !!pip.pipWanted(i, window.__st.chat[i]), ai: calls - c0 };
            }
        }
        return out;
    });
    for (const sync of ['tagPlus', 'tag']) {
        check(r[`${sync}:empty`].code === 'nochange' && !r[`${sync}:empty`].badge && !r[`${sync}:empty`].ai, `[${sync}] 빈 블록 = 바뀐 것 없음 · 🔍 없음 · AI 0회`, JSON.stringify(r[`${sync}:empty`]));
        check(r[`${sync}:none`].code === 'nochange' && !r[`${sync}:none`].badge, `[${sync}] 「(변화 없음)」 블록도`, JSON.stringify(r[`${sync}:none`]));
        check(r[`${sync}:ok`].code === 'shown' && !r[`${sync}:ok`].badge, `[${sync}] 바른 블록은 칩`, JSON.stringify(r[`${sync}:ok`]));
    }
    check(r['tag:broken'].code === 'malformed' && r['tag:broken'].badge, '[태그만] 깨진 블록(「cash +5」)은 🔍로 알림', JSON.stringify(r['tag:broken']));
    check(r['tagPlus:broken'].ai === 1, '[A+B] 깨진 블록은 따로 분석 (AI 1회)', JSON.stringify(r['tagPlus:broken']));
    check(r['tag:notag'].code === 'notag' && r['tag:notag'].badge, '[태그만] 블록을 안 쓴 답은 🔍로 알림', JSON.stringify(r['tag:notag']));
    const pe = logs.filter(l => /pageerror|TypeError/.test(l)); check(!pe.length, 'no page errors', pe.join('\n').slice(0, 300));
} finally { await close(); }
