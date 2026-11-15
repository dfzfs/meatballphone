// ✉ 편지 (v2.7.23): 💨 퀵 (시간대 · 빠를수록 요금) · 답장도 퀵으로 · 보통 배달은 며칠 · 동봉한 것 돌려받기
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const eng = await import('/ext/src/engine.js'); const shell = await import('/ext/src/shell.js'); const ct = await import('/ext/src/contact.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const st = () => app.current.state, out = {};
        await window.__addUser('hi'); await window.__addAI('s\n<meatball>\nitem: +꽃 2 | 예쁜 꽃\ncash: +2000\n</meatball>'); await wait(200);
        const N = st().data.calendar.times.length, base = st().data.contact.express.fee;
        shell.openSheet('contact'); await wait(300);
        const el = [...shell.panels].find(p => p.isConnected && p._ss);
        ct.CONTACT_ACTIONS.copen(el, 'Leon'); await wait(300);
        const th = () => st().data.contact.threads.Leon ?? [];
        const items = () => (st().data.wallet.items ?? []).map(i => `${i.name}:${i.qty}`).join(','), cash = () => st().data.wallet.cash;
        const send = async ({ quick = '', express = false, rush = false, enc = [] } = {}) => {
            ct.CONTACT_ACTIONS.copen(el, 'Leon'); await wait(200);
            el._ss.ui.enc = enc; el._ss.ui.express = express;
            el.querySelector('.ss-cin').value = '안녕'; if (quick) el.querySelector('.ss-lwhen').value = quick;
            el.querySelector('.ss-lrush').checked = rush;
            await ct.CONTACT_ACTIONS.csend(el, '', el.querySelector('[data-act="csend"]'), st()); await wait(400);
        };
        out.opts = [...el.querySelectorAll('.ss-lwhen option')].length === 4 && !el.querySelector('.ss-cour.express b')?.textContent.includes(st().data.contact.express.name);
        // 보통 배달: 며칠 걸리고(바로 안 옴) 퀵 요금이 안 붙는다
        const c0 = cash(), now0 = core.nowTick(st());
        await send();
        { const m = th().at(-2), rp = th().at(-1); out.normalDays = m.arrive >= Math.floor(now0) && Number.isInteger(m.arrive) && rp.pending && rp.arrive >= m.arrive && cash() === c0 - (m.fee || 0); }
        // 퀵 2시간대 뒤: 요금 = 기본 ×2 · 도착 = 지금 + 2/N
        const c1 = cash(), now1 = core.nowTick(st());
        await send({ quick: 's2', express: true });
        { const m = th().at(-2); out.quickFee = c1 - cash() === base * 2 && m.fee === base * 2 && m.express === true; out.quickArrive = Math.abs(m.arrive - (now1 + 2 / N)) < 1e-9; }
        // 퀵 바로 + 답장도 퀵으로: 요금 = 기본 ×4 두 번 · 내 편지도 답장도 지금
        const c2 = cash(), now2 = core.nowTick(st());
        await send({ quick: 'now', express: true, rush: true });
        { const m = th().at(-2), rp = th().at(-1); out.nowBoth = c2 - cash() === base * 8 && m.arrive === now2 && rp.pending && rp.arrive === now2 && eng.dueLetters(st()).some(x => x.m.id === rp.id); }
        out.remembered = core.settings().letterQuick === 'now';
        // 동봉한 선물 · 돈: 지우면서 돌려받기 (요금은 안 돌아옴)
        const i0 = items(), c3 = cash();
        await send({ quick: 's3', express: true, enc: [{ kind: 'gift', text: '꽃', label: '꽃' }, { kind: 'money', amount: 300, label: '300' }] });
        out.encTaken = items() !== i0 && c3 - cash() === base + 300;
        const my = th().filter(m => m.from === 'me').at(-1), n0 = th().length;
        setTimeout(() => document.querySelector('[data-choice="refund"]')?.click(), 500);
        await ct.CONTACT_ACTIONS.cmsgdel(el, my.id, null, st()); await wait(400);
        out.encBack = items() === i0 && cash() === c3 - base && th().length === n0 - 2;
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, k);
    check(!logs.length, '콘솔 오류 없음', logs.slice(0, 3).join(' / '));
} finally { await close(); }
