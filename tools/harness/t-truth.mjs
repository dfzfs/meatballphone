// 🕵 최면 어플 (v2.7.23): 연락의 어두운 판 — 따로 쌓이고 · 본편 AI에게 안 가고 · 연락 대화는 안 건드린다
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const eng = await import('/ext/src/engine.js'); const shell = await import('/ext/src/shell.js'); const ct = await import('/ext/src/contact.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const st = () => app.current.state, out = {};
        await window.__addUser('hi'); await window.__addAI('s'); await wait(150);
        { const nd = core.clone(st().data.contact); nd.mode = 'phone'; nd.threads.Leon = [{ id: 'n1', from: 'me', text: 'normal-chat-line', at: 0, arrive: 0, kind: 'text' }]; await eng.commit('contact', nd, ''); await wait(150); }
        shell.openSheet('contact'); await wait(300);
        const el = [...shell.panels].find(p => p.isConnected && p._ss?.tab === 'contact');
        out.button = !!el.querySelector('[data-act="ctruth"]');
        el.querySelector('[data-act="ctruth"]').click(); await wait(300);
        out.darkList = !!el.querySelector('.ss-truth .ss-ct-row') && el.querySelector('.ss-truth').textContent.includes('최면 어플');
        el.querySelector('.ss-truth .ss-ct-row[data-arg="Leon"]').click(); await wait(300);
        out.darkThread = !!el.querySelector('.ss-truth .ss-phone') && !el.querySelector('.ss-truth .ss-phone-att') && !el.textContent.includes('normal-chat-line');
        el.querySelector('.ss-cin').value = '나 좋아해?';
        await ct.CONTACT_ACTIONS.csend(el, '', el.querySelector('[data-act="csend"]'), st()); await wait(500);
        const c = st().data.contact;
        out.stored = c.truth?.Leon?.length >= 2 && c.truth.Leon[0].text === '나 좋아해?' && c.truth.Leon.at(-1).from === 'them';
        out.normalUntouched = c.threads.Leon.length === 1;
        const inj = Object.values(eng.buildInjection(app.current, { full: true })).filter(v => typeof v === 'string').join('\n');
        out.notToMainAI = !inj.includes('나 좋아해?');
        out.prompt = (window.__lastGen?.systemPrompt ?? '').includes('HYPNOSIS APP') || window.__lastGen === undefined;
        // 지우기 · 돌아가기
        const mid = c.truth.Leon[0].id;
        await ct.CONTACT_ACTIONS.cmsgdel(el, mid, null, st()); await wait(300);
        out.delWorks = !st().data.contact.truth.Leon.some(m => m.id === mid) && st().data.contact.threads.Leon.length === 1;
        el.querySelector('[data-act="cback"]').click(); await wait(200);
        out.backToTruthList = !!el.querySelector('.ss-truth .ss-ct-list');
        el.querySelector('[data-act="ctruth"]').click(); await wait(200);
        out.backToContact = !el.querySelector('.ss-truth') && !!el.querySelector('.ss-ct');
        out.oneRecord = core.getMeta().adjust.filter(a => a.set?.mod === 'contact').length === 1;
        el.querySelector('[data-act="ctruth"]').click(); await wait(200); el.querySelector('.ss-truth .ss-ct-row[data-arg="Leon"]').click(); await wait(300);
        // ── 🔕 상대가 알아서 연락 꺼 두기 (기본 연락) ──
        el.querySelector('[data-act="cback"]').click(); await wait(150); el.querySelector('[data-act="ctruth"]').click(); await wait(200); // 연락으로
        ct.CONTACT_ACTIONS.copen(el, 'Leon'); await wait(250);
        let calls = 0; const sys = [];
        window.__ai = (p, sp) => { calls++; sys.push(sp); return calls === 1 ? '됐어. 말 걸지 마.\n(OFFLINE: 화남 | 2)' : '…알았어. 미안.'; };
        const say = async (t) => { el.querySelector('.ss-cin').value = t; await ct.CONTACT_ACTIONS.csend(el, '', el.querySelector('[data-act="csend"]'), st()); await wait(450); };
        const leonC = () => st().data.contact.contacts.find(x => x.name === 'Leon');
        await say('뭐해?');
        out.awayRule = sys[0].includes('GOING OFFLINE') && sys[0].includes('STAY REMOTE');
        out.awaySet = leonC().away?.why === '화남' && st().data.contact.threads.Leon.at(-1).text === '됐어. 말 걸지 마.' && !JSON.stringify(st().data.contact.threads.Leon).includes('OFFLINE');
        out.awayBar = !!el.querySelector('.ss-csum.ss-away') && el.querySelector('.ss-csum.ss-away').textContent.includes('화남');
        await say('야'); await say('답 좀 해');
        out.awayNoAI = calls === 1 && st().data.contact.threads.Leon.at(-1).text === '답 좀 해' && st().data.contact.threads.Leon.at(-1).read === false;
        // 그래도 불러내기 → AI 1회 · 풀림
        await ct.CONTACT_ACTIONS.cwake(el, 'Leon', null, st()); await wait(450);
        out.wake = calls === 2 && !leonC().away && st().data.contact.threads.Leon.at(-1).text === '…알았어. 미안.';
        // 다시 꺼 두고 → 이야기 시간이 흐르면 풀림
        calls = 0; await say('근데 있잖아'); const until = leonC().away?.until;
        const times = st().data.calendar.times, i0 = Math.max(0, times.indexOf(st().data.calendar.time));
        for (const k of [1, 2]) { await window.__addUser('u'); await window.__addAI(`s\n<meatball>\nperiod: ${times[(i0 + k) % times.length]}\n</meatball>`); await wait(220); }
        out.awayExpires = until > 0 && core.nowTick(st()) >= until;
        await say('이제 됐어?');
        out.afterExpire = calls === 2 && !st().data.contact.contacts.find(x => x.name === 'Leon').away?.why?.includes('화남') ;
        // 끄면 규칙을 안 붙이고 표시 줄도 무시
        core.settings().contactAway = false; sys.length = 0; window.__ai = (p, sp) => { sys.push(sp); return '응.\n(OFFLINE: 잠 | 3)'; };
        await say('자?');
        out.offNoRule = !sys[0].includes('GOING OFFLINE') && !leonC().away && st().data.contact.threads.Leon.at(-1).text === '응.';
        core.settings().contactAway = true;
        // ✍ 연락처마다 추가 지시: 그 사람의 답장에만 붙는다
        { const nd = core.clone(st().data.contact); nd.contacts.find(x => x.name === 'Leon').prompt = '반말로 짧게 DIRECTIVE-XYZ'; nd.contacts.push({ name: 'Mira' }); await eng.commit('contact', nd, ''); await wait(200); }
        const seen = []; window.__ai = (p, sp) => { seen.push(p); return '응'; };
        await say('지시 확인');
        out.dirKept = st().data.contact.contacts.find(x => x.name === 'Leon').prompt === '반말로 짧게 DIRECTIVE-XYZ';
        out.dirSent = seen.at(-1).includes('DIRECTIVE-XYZ') && seen.at(-1).includes("USER'S DIRECTION");
        ct.CONTACT_ACTIONS.copen(el, 'Mira'); await wait(250); await say('안녕');
        out.dirOnlyThatPerson = !seen.at(-1).includes('DIRECTIVE-XYZ');
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, k);
    check(!logs.length, '콘솔 오류 없음', logs.slice(0, 3).join(' / '));
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
} finally { await close(); }
