// 🧪 실험실 (v2.8): 전부 끄면 흔적 없음 · 창이 열리고 모든 장치 화면이 그려짐 · 장치마다 주입 · 저장 · 단추 · 다시 끄면 빈 글
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const eng = await import('/ext/src/engine.js'); const lab = await import('/ext/src/lab.js'); const win = await import('/ext/src/labwin.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const st = () => app.current.state, out = {}, L = () => lab.labData(true), inj = () => lab.labInjection();
        const ev = SillyTavern.getContext().eventSource;
        const P4 = () => window.__prompts.statussim_lab?.value ?? null;
        await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +5\naff: Leon +30\ntrust: Leon +10\n</meatball>'); await wait(200);
        const main0 = Object.values(eng.buildInjection(app.current, { full: true })).filter(v => typeof v === 'string').join('\n');
        // ── 전부 끔 ──
        out.offEmpty = inj() === '' && (P4() === '' || P4() === null) && !core.getMeta().lab;
        // ── 창 열기 · 전부 켜기 ──
        window.__autoPopup = null;
        win.openLab(); await wait(300);
        const box = document.querySelector('.ss-lab');
        out.winOpens = !!box && box.querySelectorAll('.ss-lab-f').length === lab.LAB.length;
        for (const f of lab.LAB) { const c = box.querySelector(`[data-lab-toggle="${f.id}"]`); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); await wait(20); }
        await wait(300);
        out.allOn = lab.LAB.every(f => lab.labOn(f.id)) && box.querySelectorAll('.ss-lab-f.on').length === lab.LAB.length;
        out.allDrawn = !box.textContent.includes('그리지 못했어요') ? true : [...box.querySelectorAll('.ss-lab-f')].filter(x => x.textContent.includes('그리지 못했어요')).map(x => x.dataset.f + ':' + x.querySelector('.ss-lab-b')?.textContent).join(' | ');
        const click = async (f, a, ms = 350) => { const b = box.querySelector(`.ss-lab-f[data-f="${f}"] [data-lab="${a}"]`); if (!b) return false; b.click(); await wait(ms); return true; };
        const sec = (f) => box.querySelector(`.ss-lab-f[data-f="${f}"]`);
        window.__ai = (p, s = '') => (s.includes('story ledgers') ? '{"facts":[{"text":"유저는 왕자다","knows":["Leon"]}],"promises":[{"text":"축제에 같이 가기","to":"Leon","due":"내일"}],"hooks":[{"text":"잠긴 지하실 문"}]}'
            : s.includes('status sheet') ? '{"nick":"바보","first":"수상함","now":"괜찮음","wrong":"귀족인 줄 앎","trust":70,"like":"웃음","annoy":"지각"}'
            : s.includes("phone") ? '{"saved":"내 사람","search":["선물 추천","사과하는 법"],"memo":"내일 꼭 말하기","unsent":"보고 싶어"}'
            : '레온: 그 사람 좀 이상하지 않아?\n미라: 난 좋던데.\n결론: 지켜보기로 함');
        // ── 장부 ──
        out.scan = await click('know', 'scan', 700) && L().facts?.length === 1 && L().promises?.length === 1 && L().hooks?.length === 1;
        out.ledgerInj = inj().includes('KNOWLEDGE LEDGER') && inj().includes('유저는 왕자다 — known to: Leon') && inj().includes('PROMISES') && inj().includes('LOOSE THREADS');
        sec('know').querySelector('.ss-lab-t').value = '직접 적은 사실'; sec('know').querySelector('.ss-lab-k').value = 'Mira, Leon';
        out.factAdd = await click('know', 'factadd') && L().facts.length === 2 && L().facts[1].knows.length === 2;
        const trust0 = st().data.rel.user.find(x => x.name === 'Leon').trust;
        out.promiseKeep = await click('promise', 'prokeep', 600) && L().promises[0].state === 'kept' && st().data.rel.user.find(x => x.name === 'Leon').trust === trust0 + 2;
        out.hookDone = await click('hook', 'hookdone') && L().hooks[0].done === true && !inj().includes('잠긴 지하실 문');
        // ── 숨은 수치 ──
        out.maskInj = inj().includes('MASKS') && inj().includes('Leon: shows');
        await click('mask', 'maskpeek'); await click('mask', 'maskpeek'); L().sus.Leon = 3;
        out.sus = Object.values(L().sus).reduce((a, b) => a + b, 0) >= 4 && inj().includes('SUSPICION');
        out.mirror = await click('mirror', 'mirror', 700) && lab.kept('mirror', 'Leon').at(-1)?.j.nick === '바보' && sec('mirror').textContent.includes('귀족인 줄 앎');
        out.memory = await click('memory', 'memory', 700) && inj().includes('HOW THEY REMEMBER IT');
        const realRandom = Math.random; Math.random = () => 0.01;
        out.phoneCaught = await click('phone', 'phone', 700) && L().caught === 'Leon' && inj().includes('CAUGHT') && sec('phone').textContent.includes('보고 싶어');
        out.council = await click('council', 'council', 700) && sec('council').textContent.includes('결론');
        out.diary = await click('diary', 'diary', 700) && lab.kept('diary', 'Leon').length === 1;
        out.dream = await click('dream', 'dream', 700) && lab.kept('dream', '_').length === 1;
        // ── 되감기 · 이야기 (답을 받을 때 도는 것) ──
        const c = SillyTavern.getContext().chat, lastAI = c[c.length - 1];
        const long = 'A discarded timeline where Leon walked away from the gate and never looked back at anyone again, no matter who called. '.repeat(2);
        c[1].swipes = [c[1].mes, long]; c[1].swipe_id = 0;
        for (let k = 0; k < 5; k++) await ev.emit('generation_started', 'swipe', {}, false);
        out.debtCount = L().debt === 5;
        L().t = 99; L().seen = Date.now() - 3 * 864e5;
        out.absence = inj().includes('ABSENCE');
        await window.__addUser('go'); await window.__addAI('big fight\n<meatball>\naff: Leon -15\naff: Mira +80\n</meatball>'); await wait(400);
        out.afterReply = { debtDue: L().debtDue === true, tFire: L().tFire === true, ghost: typeof L().ghost === 'string' && L().ghost.length > 20, scar: L().scars?.some(x => x.name === 'Leon' && x.drop === 15), caughtCleared: !L().caught, meddle: !!L().meddleNow, pet: core.settings().labPet?.xp >= 1 };
        out.afterReply = Object.values(out.afterReply).every(Boolean) ? true : out.afterReply;
        const i2 = inj();
        out.replyInj = ['FATE COLLECTS', 'PACING: it has been calm', 'ECHO OF A DISCARDED', 'SCARS', 'MEDDLING'].filter(k => !i2.includes(k)).join(',') || true;
        out.prompt4 = (P4() ?? '').includes('STORY DEVICES');
        c.at(-1).swipes = ['a', 'b', 'c']; c.at(-1).swipe_id = 2;
        out.dejavu = inj().includes('DÉJÀ VU') && lab.loopInfo().scene === 2;
        Math.random = () => 0.99;
        await window.__addUser('go2'); await window.__addAI('calm'); await wait(600);
        out.settles = L().debt === 0 && L().debtDue === false && L().tFire === false && L().calm === 3 && inj().includes('breather') && !L().ghost;
        Math.random = realRandom;
        const mid = L().meddle?.[0]?.id; box.dispatchEvent(new Event('x')); // 창 다시 그리기는 단추로
        if (mid) await lab.undoMeddle(mid); out.meddleUndo = (!!mid && !L().meddle.length) || JSON.stringify([mid, L().meddle]);
        // ── 소소한 것 ──
        st().data.stats.bars.push({ name: '정신력', cur: 5, max: 100 }); lab.applyGlitch();
        out.glitch = document.body.classList.contains('ss-glitch-hard');
        st().data.stats.bars.pop(); lab.applyGlitch();
        out.glitchOff = !document.body.classList.contains('ss-glitch');
        out.fortune = await click('fortune', 'fortune') && inj().includes("TODAY'S FORTUNE") && !sec('fortune').querySelector('[data-lab="fortune"]');
        const cash0 = st().data.wallet.cash;
        out.market = await click('market', 'mktopen') && await click('market', 'buy', 600) && st().data.wallet.cash === cash0 - 20 && L().market.own['곡물'] === 1;
        sec('capsule').querySelector('.ss-lab-t').value = '미래의 나에게'; sec('capsule').querySelector('.ss-lab-n').value = '3';
        out.capsule = await click('capsule', 'capadd') && L().capsules.length === 1 && sec('capsule').textContent.includes('🔒');
        out.capFrom = await click('capsule', 'capfrom', 700) && L().capsules.length === 2 && L().capsules[1].from === 'Leon';
        out.mail = await click('mail', 'mailsend', 700) && core.settings().labMail.length === 1;
        out.forecast = sec('forecast').querySelectorAll('.ss-lab-row').length >= 2;
        out.pet = sec('pet').textContent.includes('Lv.');
        let saved = false; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { saved = this.download === 'meatball-recap.png' && this.href.startsWith('data:image/png'); };
        await click('recap', 'recap'); HTMLAnchorElement.prototype.click = oc; out.recap = saved;
        // ── 채팅 간 우편: 다른 채팅에서 보임 → 떨어뜨리기 ──
        // ── 다시 전부 끄기 ──
        for (const f of lab.LAB) { const cb = box.querySelector(`[data-lab-toggle="${f.id}"]`); cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true })); await wait(15); }
        await wait(300);
        out.offAgain = inj() === '' && P4() === '';
        const t0 = L().t; await window.__addUser('x'); await window.__addAI('y'); await wait(600);
        out.offNoWork = L().t === t0 && inj() === '';
        out.errors = (window.__errors ?? []).map(String).slice(-4);
        out.main0 = main0.length > 0;
        return out;
    });
    for (const [k, v] of Object.entries(r)) if (k !== 'errors') check(v === true, `lab: ${k}`, JSON.stringify(v));
    check(!r.errors.length, 'lab: no errors', JSON.stringify(r.errors));
    check(!logs.some(l => /pageerror/.test(l)), 'lab: no page errors', logs.filter(l => /pageerror/.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
