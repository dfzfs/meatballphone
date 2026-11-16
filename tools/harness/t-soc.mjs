// 💗 연락 · 방명록에서 호감 반영 (선택 · socialAff): 끄면 [FEEL] 줄만 떼고 숫자는 그대로 · 켜면 답장에 따라 호감이 움직이고 · 그 말풍선/글을 지우면 되돌아옴 · 본편 AI에게 가는 글은 안 바뀜
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 850 });
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const eng = await import('/ext/src/engine.js'); const ct = await import('/ext/src/contact.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms)), S = core.settings(), out = {}, st = () => app.current.state;
        await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +10\ntrust: Mira +5\n</meatball>'); await wait(300);
        const c = structuredClone(st().data.contact); c.mode = 'phone'; if (!c.contacts.some(x => x.name === 'Mira')) c.contacts.push({ name: 'Mira' }); await eng.commit('contact', c, ''); await wait(200);
        const rel = () => st().data.rel.user.find(x => x.name === 'Mira'), thread = () => st().data.contact.threads.Mira ?? [];
        let sys = ''; window.__ai = (p, s2) => { sys = s2 || p; return '고마워, 덕분에 기분 좋아졌어\n[FEEL +2]'; };
        app.openSheet('contact'); await wait(300);
        const el = document.querySelector('dialog .ss-panel'); const send = async (t) => { el._ss.ui = { who: 'Mira' }; app.renderPanel(el); el.querySelector('.ss-cin').value = t; el.querySelector('[data-act="csend"]').click(); await wait(900); };
        // ── 끔: 규칙도 안 붙고 · 숫자 그대로 ──
        const a0 = rel().aff; await send('안녕');
        out.offNoEffect = !sys.includes('[FEEL') && rel().aff === a0 && app.socRule === undefined; // 꺼져 있으면 AI에게 규칙을 안 가르치고 숫자도 그대로
        // ── 켬 ──
        S.socialAff = true; await app.loadAddons(true); await wait(200);
        const P4 = () => JSON.stringify(Object.fromEntries(Object.entries(window.__prompts ?? {}).map(([k, v]) => [k, v?.value ?? ''])));
        await send('오늘 고마웠어');
        const last = thread().at(-1);
        out.onRule = sys.includes('[FEEL +1]');
        out.onApplies = last.text === '고마워, 덕분에 기분 좋아졌어' && rel().aff === a0 + 2 && core.getMeta().adjust.some(a => a.soc === `ct:Mira|${last.id}`);
        window.__autoPopup = 'ok'; await ct.CONTACT_ACTIONS.cmsgdel(el, last.id, null, st()); await wait(500);
        out.deleteReverts = rel().aff === a0 && !core.getMeta().adjust.some(a => typeof a.soc === 'string');
        window.__ai = () => '그런 말은 좀 서운하네\n[FEEL -1]'; await send('너 좀 귀찮아'); out.minus = rel().aff === a0 - 1;
        // ── 방명록: 남기면 우정 +1 (하루 한 번) · 답글의 FEEL · 지우면 되돌아감 ──
        S.guestbook = true; const mh = await import('/ext/src/minihome.js'); const t0 = rel().trust, a1 = rel().aff;
        const n1 = mh.sendNote('Mira', '놀러 왔다 가'); await wait(400); const n2 = mh.sendNote('Mira', '또 왔어'); await wait(400);
        out.noteTrust = rel().trust === t0 + 1;
        window.__ai = () => '와 줘서 고마워!\n[FEEL +1]'; await mh.noteReplyAI(n1.id); await wait(400);
        out.noteFeel = rel().aff === a1 + 1 && mh.myNotes('Mira').find(x => x.id === n1.id).reply === '와 줘서 고마워!';
        mh.deleteMyNote(n1.id); await wait(400);
        out.noteDeleteReverts = rel().trust === t0 && rel().aff === a1;
        // ── 본편 AI에게 가는 글에는 따로 붙는 것이 없다 ──
        app.refreshNow?.(); await wait(200); out.noInject = !P4().includes('FEEL') && !P4().includes('놀러 왔다');
        mh.deleteMyNote(n2.id);
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, `soc ${k}`, v === true ? '' : JSON.stringify(v));
    check(!logs.some(l => /pageerror|TypeError/.test(l)), 'soc: 오류 없음', logs.slice(0, 2).join(' | '));
} finally { await close(); }
