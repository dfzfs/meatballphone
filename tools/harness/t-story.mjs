// 🧭 이야기 장치 (v2.8): 전부 끄면 흔적 없음 · 확장 설정에서 켜면 제 탭 아래에 칸이 생김 · 장치마다 주입 · 저장 · 단추 · 다시 끄면 빈 글
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact', 'memo']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const eng = await import('/ext/src/engine.js'); const shell = await import('/ext/src/shell.js'); const story = await import('/ext/src/story.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const st = () => app.current.state, out = {}, L = () => story.storyData(true), inj = () => story.storyInjection();
        const ev = SillyTavern.getContext().eventSource, P4 = () => window.__prompts.statussim_story?.value ?? null;
        await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +5\naff: Leon +30\ntrust: Leon +10\n</meatball>'); await wait(300);
        shell.openSheet('rel'); await wait(300);
        const el = [...shell.panels].find(p => p.isConnected);
        // 🧪 켠 장치의 칸은 이제 전부 「실험실」 탭에 모인다 (예전엔 관계 · 메모 · 연락 · 관리 탭 아래에 흩어져 있었음) → 그 탭들을 가리키던 곳은 실험실로 간다
        const LAB = new Set(['rel', 'memo', 'contact', 'manage', 'guide']);
        const goRaw = async (tab, ui = {}) => { el._ss.tab = tab; el._ss.ui = ui; el._ss.mode = 'view'; app.renderPanel(el); await wait(200); };
        const go = (tab, ui = {}) => goRaw(LAB.has(tab) && !ui.who ? 'extra' : tab, ui);
        const secs = () => [...el.querySelectorAll('.ss-story .ss-st-f')].map(x => x.dataset.f).join(',');
        const click = async (f, a, ms = 350) => { const b = el.querySelector(`.ss-st-f[data-f="${f}"] [data-st="${a}"]`) ?? el.querySelector(`.ss-story [data-st="${a}"]`); if (!b) return false; b.click(); await wait(ms); return true; };
        const sec = (f) => el.querySelector(`.ss-st-f[data-f="${f}"]`);
        // ── 전부 끔 ──
        out.count14 = story.DEVICES.length === 14 && Object.keys(story.KEY).length === 14;
        out.offEmpty = inj() === '' && (P4() === '' || P4() === null) && !core.getMeta().story && !el.querySelector('.ss-story');
        out.noLabLeft = !document.querySelector('[data-s-act="lab"]') && !el.querySelector('[data-act="lab"]');
        // ── 확장 설정의 체크 칸으로 전부 켜기 ──
        const boxes = Object.values(story.KEY).map(k => document.querySelector(`#ss-settings input[data-s="${k}"]`));
        out.settingsHasAll = boxes.every(Boolean) && boxes.every(b => !b.checked);
        for (const b of boxes) { b.checked = true; b.dispatchEvent(new Event('change', { bubbles: true })); await wait(15); }
        await wait(300);
        out.allOn = story.DEVICES.every(f => story.storyOn(f.id));
        await goRaw('extra'); out.labHasAll = secs() === 'peek,scar,memory,meddle,taste,mail,loop,ghost,debt,tension,realtime,know,promise' || secs();
        out.labFolded = [...el.querySelectorAll('.ss-story details.ss-st-f')].every(d => !d.open); // 켜도 전부 접힌 채로
        out.labScan = !!el.querySelector('.ss-story [data-st="scan"]');
        out.extraNoSwitches = el.querySelectorAll('.ss-body [data-chg="setflag"]').length === 0 && !el.querySelector('.ss-tabs button[data-arg="guide"]') && !el.querySelector('.ss-tabs button[data-arg="lab"]') && !!el.querySelector('button[data-arg="extra"]'); // 부가 기능은 관리 옆의 큰 묶음
        await goRaw('manage'); out.switchesInManage = el.querySelectorAll('.ss-mg[data-mg="mods"] [data-chg="setflag"]').length >= 27 && [...el.querySelectorAll('.ss-mg[data-mg="mods"] [data-chg="setflag"]')].filter(i => i.checked).length >= 14;
        for (const t of ['rel', 'memo', 'contact', 'manage', 'fate']) { await goRaw(t); if (el.querySelector('.ss-story:not(.ss-guide)')) out.otherTabsClean = t; } out.otherTabsClean ??= true;
        await goRaw('contact', { who: 'Leon' }); out.contactThreadClean = !el.querySelector('.ss-story');
        out.allDrawn = !el.textContent.includes('그리지 못했어요');
        window.__ai = (p, s = '') => (s.includes('story ledgers') ? '{"facts":[{"text":"유저는 왕자다","knows":["Leon"]}],"promises":[{"text":"축제에 같이 가기","to":"Leon","due":"내일"}]}'
            : s.includes('strategy guide') ? '{"up":[{"kind":"item","text":"꽃을 건네면 좋아"},{"kind":"act","text":"먼저 손을 잡아 줘"},{"kind":"say","text":"수고했다고 말해 줘"}],"down":[{"kind":"item","text":"술은 주지 마"},{"kind":"act","text":"약속에 늦지 마"},{"kind":"say","text":"다른 사람 얘기는 하지 마"}],"note":"이 정도는 알아서 해."}'
            : s.includes('four secrets') ? '{"green":"단것을 좋아한다","yellow":"밤마다 편지를 쓴다","red":"검을 잡으면 손이 떨린다","black":"사실은 왕의 사생아다"}' : '그때 내가 먼저 손을 내밀었지.\n비가 왔던 것 같아.');
        // ── 장부 (메모 탭) ──
        await go('memo');
        out.scan = await click('know', 'scan', 800) && L().facts?.length === 1 && L().promises?.length === 1 && sec('know').textContent.includes('유저는 왕자다');
        out.ledgerInj = inj().includes('유저는 왕자다 — known to: Leon') && inj().includes('PROMISES');
        sec('know').querySelector('.ss-st-t').value = '직접 적은 사실'; sec('know').querySelector('.ss-st-k').value = 'Mira, Leon';
        out.factAdd = await click('know', 'factadd') && L().facts.length === 2 && L().facts[1].knows.length === 2 && sec('know').textContent.includes('직접 적은 사실');
        const trust0 = st().data.rel.user.find(x => x.name === 'Leon').trust;
        out.promiseKeep = await click('promise', 'prokeep', 700) && L().promises[0].state === 'kept' && st().data.rel.user.find(x => x.name === 'Leon').trust === trust0 + 2;
        // ── 관계 탭 ──
        await go('rel');
        (L().sus ??= {}).Leon = 3; out.sus = inj().includes('SUSPICION'); delete L().sus;
        // ── 🗝 공략 탭 (사람 묶음) ──
        await go('guide');
        out.guideTab = !!el.querySelector('.ss-guide [data-st="guide"]') && !el.querySelector('.ss-tabs button[data-arg="guide"]') && !el.textContent.includes('그리지 못했어요');
        el.querySelector('.ss-guide [data-st="gwho"][data-arg="Leon"]')?.click(); await wait(250);
        out.guideGet = (await click('', 'guide', 900) && L().guide?.Leon?.up.length === 3 && L().guide.Leon.down.length === 3 && L().sus?.Leon === 1 && el.querySelector('.ss-gd-col.up').textContent.includes('꽃을 건네면 좋아') && el.querySelector('.ss-gd-col.down').textContent.includes('약속에 늦지 마')) || JSON.stringify([L().guide, L().sus]);
        out.secGen = (await click('', 'secgen', 900) && L().secrets?.Leon?.length === 4 && L().secrets.Leon.every(x => !x.open) && !el.textContent.includes('사실은 왕의 사생아다') && el.querySelectorAll('.ss-gd-secret').length === 4 && inj().includes('SECRETS') && inj().includes('[black, hidden] 사실은 왕의 사생아다')) || JSON.stringify(L().secrets);
        el.querySelector('.ss-guide [data-st="secopen"][data-arg="Leon|k"]').click(); await wait(350);
        out.secOpen = (L().secrets.Leon.find(x => x.lv === 'k').open === true && L().sus.Leon === 6 && el.querySelector('.ss-gd-secret.lv-k').textContent.includes('사실은 왕의 사생아다') && el.querySelector('.ss-gd-gauge .lv-k').classList.contains('open') && inj().includes('[black, found out]') && inj().includes('SUSPICION')) || JSON.stringify([L().secrets.Leon, L().sus]);
        out.guideTexts = app.storyTexts().includes('꽃을 건네면 좋아') && app.storyTexts().includes('사실은 왕의 사생아다') && !app.storyTexts().includes('단것을 좋아한다');
        L().secTell = false; out.secTellOff = !inj().includes('SECRETS'); delete L().secTell;
        core.settings().guideOn = false; await go('rel'); out.guideOff = !el.querySelector('.ss-tabs button[data-arg="guide"]') && !inj().includes('SECRETS'); core.settings().guideOn = true; delete L().sus; delete L().secrets; delete L().guide; await go('rel'); // 공략 자료를 치우면 주입도 다시 빈 글
        out.memory = await click('memory', 'memory', 800) && inj().includes('HOW THEY REMEMBER IT');
        out.taste = sec('taste').textContent.includes('좋아하는 것');
        // ── 이야기 흐름 (답을 받을 때 도는 것) ──
        const c = SillyTavern.getContext().chat, realRandom = Math.random; Math.random = () => 0.01;
        c[1].swipes = [c[1].mes, 'A discarded timeline where Leon walked away from the gate and never looked back at anyone again, no matter who called. '.repeat(2)]; c[1].swipe_id = 0;
        for (let k = 0; k < 5; k++) await ev.emit('generation_started', 'swipe', {}, false);
        out.debtCount = L().debt === 5;
        L().t = 99; L().seen = Date.now() - 3 * 864e5;
        out.absence = inj().includes('ABSENCE');
        await window.__addUser('go'); await window.__addAI('big fight\n<meatball>\naff: Leon -15\naff: Mira +80\n</meatball>'); await wait(700);
        const ar = { debtDue: L().debtDue === true, tFire: L().tFire === true, ghost: typeof L().ghost === 'string' && L().ghost.length > 20, scar: L().scars?.some(x => x.name === 'Leon' && x.drop === 15), meddle: !!L().meddleNow };
        out.afterReply = Object.values(ar).every(Boolean) ? true : ar;
        out.replyInj = ['FATE COLLECTS', 'PACING: it has been calm', 'ECHO OF A DISCARDED', 'SCARS', 'MEDDLING'].filter(k => !inj().includes(k)).join(',') || true;
        out.prompt4 = (P4() ?? '').includes('STORY DEVICES');
        { const m = c.at(-1), keep = [m.swipes, m.swipe_id]; m.swipes = [m.mes, m.mes, m.mes]; m.swipe_id = 2; // 시험용 가짜 스와이프 — 확인만 하고 되돌린다
            out.dejavu = inj().includes('DÉJÀ VU') && story.loopInfo().scene === 2; [m.swipes, m.swipe_id] = keep; }
        await go('manage'); out.flowShows = sec('debt').textContent.includes('5 / 5') && sec('tension').textContent.includes('사건') && sec('loop').textContent.includes('회차');
        Math.random = () => 0.99;
        await window.__addUser('go2'); await window.__addAI('calm'); await wait(700);
        out.settles = L().debt === 0 && L().debtDue === false && L().tFire === false && L().calm === 3 && inj().includes('breather') && !L().ghost;
        Math.random = realRandom;
        await go('rel');
        out.meddleUndo = sec('meddle').querySelectorAll('.ss-st-row').length === 1 && await click('meddle', 'meddleundo', 500) && !L().meddle.length;
        out.scarShown = sec('scar').textContent.includes('Leon');
        st().data.stats.bars.push({ name: '정신력', cur: 5, max: 100 }); story.applyGlitch(); out.glitch = document.body.classList.contains('ss-glitch-hard');
        st().data.stats.bars.pop(); story.applyGlitch(); out.glitchOff = !document.body.classList.contains('ss-glitch');
        // ── 채팅 간 우편 (연락 목록) ──
        await go('contact');
        out.mailSend = await click('mail', 'mailsend', 800) && core.settings().crossMailBox.length === 1;
        core.settings().crossMailBox.push({ id: 'z', chat: 'other-chat', who: 'Aria', world: '다른 세계', text: '안녕, 낯선 사람.', at: 1 }); await go('contact');
        out.mailDrop = sec('mail').textContent.includes('Aria') && await click('mail', 'maildrop') && inj().includes('A LETTER FROM ANOTHER WORLD') && inj().includes('Aria');
        // ── 다시 전부 끄기 ──
        for (const b of boxes) { b.checked = false; b.dispatchEvent(new Event('change', { bubbles: true })); await wait(15); }
        await wait(300);
        await go('rel'); const noRel = !el.querySelector('.ss-story:not(.ss-guide)'); await go('memo'); // 공략(기본 켬)은 부가 기능 탭에 남는다
        out.offAgain = inj() === '' && P4() === '' && noRel && !el.querySelector('.ss-story:not(.ss-guide)');
        const t0 = L().t; await window.__addUser('x'); await window.__addAI('y'); await wait(600);
        out.offNoWork = L().t === t0 && inj() === '';
        out.errors = (window.__errors ?? []).map(String).slice(-4);
        return out;
    });
    for (const [k, v] of Object.entries(r)) if (k !== 'errors') check(v === true, `story: ${k}`, JSON.stringify(v));
    check(!r.errors.length, 'story: no errors', JSON.stringify(r.errors));
    check(!logs.some(l => /pageerror/.test(l)), 'story: no page errors', logs.filter(l => /pageerror/.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
