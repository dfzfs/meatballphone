// 🧆 고른 대로 채우기 · 만들기의 AI 횟수 (v2.9.1): 묶음으로 한 번씩 · 요청 자체가 실패하면 칸마다 또 부르지 않음 · 깨진 JSON이면 빠진 칸만 따로
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ auto: true });
const Q = (f, a) => page.evaluate(f, a);
const run = async (mode, size = 'normal') => { await Q(async (z) => { (await import('/ext/src/core.js')).settings().genBatchSize = z; }, size); if (mode !== 'ok') { await Q((id) => window.__changeChat(id), `chat-${mode}-${size}`); await sleep(2500); } return Q(async (mode) => {
    const core = await import('/ext/src/core.js');
    const n = { group: 0, single: 0 };
    window.__ai = (p) => {
        const keys = [...String(p).matchAll(/--- PANEL "(\w+)"/g)].map(m => m[1]);
        if (keys.length) n.group++; else n.single++;
        if (/world core/.test(String(p)) && !keys.length) return JSON.stringify({ title: 'T', genre: 'modern', rules: [] });
        if (mode === 'hard') throw new Error('429 Too Many Requests');
        if (mode === 'bad' && keys.length) return '{ "profile": {';
        return keys.length ? JSON.stringify(Object.fromEntries(keys.map(k => [k, {}]))) : '{}';
    };
    const m = core.getMeta(true); if (m.auto) m.auto.world = true; // 세계관은 이미 맞춘 것으로
    const todo = (await import('/ext/src/autostart.js')).fillTodo(window.__SS_TEST__.api.app.current.state, core.getMeta()).length;
    const before = window.__toasts.length;
    await (await import('/ext/src/autostart.js')).fillChosen(null, { asked: true });
    const errs = window.__toasts.slice(before).filter(t => t.kind === 'error' || t.kind === 'warning').length;
    return { ...n, errs, todo };
}, mode); };
try {
    await sleep(2500);
    const ok = await run('ok');
    check(ok.group === 2 && ok.single === 2, '추천 6칸 = 묶음 2번 + 혼자인 칸 2번 (칸마다 6번 아님)', JSON.stringify(ok));
    // 다시 채우게 틀로 되돌리기
    const hard = await run('hard');
    check(hard.todo === 6 && hard.group + hard.single === 1 && hard.errs === 1, '요청 실패(429): 칸마다 다시 안 부르고 · 멈추고 · 알림 1번', JSON.stringify(hard));
    const bad = await run('bad');
    check(bad.todo === 6 && bad.errs <= 1 && bad.single >= 2, '깨진 JSON: 빠진 칸만 따로 받고 · 알림은 끝에 1번', JSON.stringify(bad));
    const one = await run('one', 'one');
    check(one.todo === 6 && one.group === 1 && one.single === 0, '묶음 크기 「한 번에」: 6칸을 AI 1번', JSON.stringify(one));
    const big = await run('big', 'big');
    check(big.todo === 6 && big.group + big.single === 1, '묶음 크기 「크게」: 6칸까지 한 묶음', JSON.stringify(big));
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
