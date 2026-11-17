// 💭 속마음 개편 (v2.9): 프로필 탭 안의 칸 · 엿보기 삭제 · 뜨는 때(항상 · 랜덤 · 탭에 들어올 때) · 볼 때마다 눈치(선택) · 지난 속마음
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const ev = (fn, arg) => page.evaluate(fn, arg);
const panel = (ui = { ptab: 'mind' }, tab = 'profile') => ev(({ ui, tab }) => { const a = window.__SS_TEST__.api.app; const el = document.querySelector('dialog .ss-panel'); el._ss.tab = tab; el._ss.mode = 'view'; el._ss.ui = ui; a.renderPanel(el); }, { ui, tab });
try {
    await makeStatus(page);
    await ev(() => Object.assign(window.__st.extensionSettings.statussim, { mindMode: 'thought', mindFreq: 'always', peekCost: false, sync: 'tag', sceneOnly: false }));
    await ev(() => window.__addUser('Leon hi'));
    await ev(() => window.__addAI('Leon nods.\n<meatball>\naff: Leon +1\nmind: Leon | 또 왔네, 귀찮게\n</meatball>'));
    await sleep(300);
    await ev(() => { window.__SS_TEST__.api.app.openSheet('rel'); }); await sleep(400);
    check(await ev(() => !document.querySelector('dialog [data-act="peek"]') && !document.querySelector('dialog .ss-mindbar') && !document.querySelector('dialog .ss-relc .ss-mind')), '관계 탭: 엿보기 단추 · 속마음 줄 · 속마음 막대가 없다');
    check(await ev(() => !document.querySelector('#ss-settings [data-s="peekOn"]') && !document.querySelector('#ss-settings [data-s="peekPerDay"]')), '확장 설정: 엿보기 · 하루 횟수 항목이 없다');

    await panel({}, 'profile');
    check(await ev(() => !!document.querySelector('dialog .ss-ptabs [data-arg="mind"]') && !!document.querySelector('dialog .ss-prof')), '프로필 탭 맨 위에 [프로필 | 속마음]');
    await page.click('dialog .ss-ptabs [data-arg="mind"]'); await sleep(200);
    const v1 = await ev(() => ({ card: document.querySelector('dialog .ss-mindc .ss-mind.big')?.textContent.trim(), prof: !!document.querySelector('dialog .ss-prof'), freq: [...document.querySelectorAll('dialog [data-arg^="freq:"]')].map(b => b.dataset.arg).join() }));
    check(v1.card === '또 왔네, 귀찮게' && !v1.prof && v1.freq === 'freq:always,freq:random,freq:tab', '속마음 칸: 인물 카드에 속마음 · 뜨는 때 3가지', JSON.stringify(v1));

    // 지난 속마음
    await ev(() => window.__addUser('again')); await ev(() => window.__addAI('Leon.\n<meatball>\nmind: Leon | …그래도 반갑긴 해\n</meatball>')); await sleep(300);
    await panel();
    const v2 = await ev(() => ({ now: document.querySelector('dialog .ss-mindc .ss-mind.big')?.textContent.trim(), log: [...document.querySelectorAll('dialog .ss-mind-log li span')].map(x => x.textContent) }));
    check(v2.now === '…그래도 반갑긴 해' && v2.log.join() === '또 왔네, 귀찮게', '지난 속마음이 기록으로 남는다', JSON.stringify(v2));

    // 눈치 (선택): 켜면 가려지고, 눌러 보면 +1
    await page.click('dialog [data-arg="sus:toggle"]'); await sleep(250);
    await ev(() => window.__addUser('3')); await ev(() => window.__addAI('Leon.\n<meatball>\nmind: Leon | 들키면 안 되는데\n</meatball>')); await sleep(300);
    await panel();
    const c1 = await ev(async () => { const st = await import('/ext/src/story.js'); const { renderHud } = await import('/ext/src/shell.js'); window.__st.extensionSettings.statussim.sideMini = ['mind']; renderHud(); return { on: window.__st.extensionSettings.statussim.peekCost, cover: !!document.querySelector('dialog .ss-mind-cover'), big: !!document.querySelector('dialog .ss-mind.big'), hud: [...document.querySelectorAll('#ss-hud .t-mind')].map(x => x.textContent).join(''), sus: st.susOf('Leon') }; });
    check(c1.on === true && c1.cover && !c1.big && !/들키면/.test(c1.hud) && c1.sus === 0, '눈치 켬: 새 속마음이 가려진 채로 (HUD에서도) · 아직 눈치 0', JSON.stringify(c1));
    await page.click('dialog .ss-mind-cover'); await sleep(300);
    const c2 = await ev(async () => { const st = await import('/ext/src/story.js'); return { big: document.querySelector('dialog .ss-mind.big')?.textContent.trim(), sus: st.susOf('Leon'), sub: document.querySelector('dialog .ss-mindc small')?.textContent }; });
    check(c2.big === '들키면 안 되는데' && c2.sus === 1 && /눈치 1/.test(c2.sub), '눌러 보면 보이고 눈치 +1', JSON.stringify(c2));
    await page.click('dialog [data-arg="sus:toggle"]'); await sleep(250);
    check(await ev(() => window.__st.extensionSettings.statussim.peekCost === false && !document.querySelector('dialog .ss-mind-cover')), '눈치 끔: 전부 그냥 보임');

    // 뜨는 때 = 탭에 들어올 때: 본편 AI에게 시키지 않고, 들어온 턴에 한 번만 AI 1회
    const t1 = await ev(async () => {
        const E = await import('/ext/src/engine.js'); const a = window.__SS_TEST__.api.app; const st = window.__st.extensionSettings.statussim;
        st.mindFreq = 'always'; window.__SS_TEST__.api.refreshNow(); const always = /mind: Name/.test(E.buildInjection(a.current).main);
        document.querySelector('dialog [data-arg="freq:tab"]').click(); await new Promise(r => setTimeout(r, 100));
        window.__SS_TEST__.api.refreshNow(); return { always, tab: /mind: Name/.test(E.buildInjection(a.current).main), freq: st.mindFreq };
    });
    check(t1.always && !t1.tab && t1.freq === 'tab', '「탭에 들어올 때」는 본편 AI에게 속마음을 시키지 않는다', JSON.stringify(t1));
    await ev(async () => { for (let i = 0; i < 4; i++) { const d = [...document.querySelectorAll('dialog')].at(-1); if (!d) break; d.querySelector('.popup-button-ok')?.click(); await new Promise(r => setTimeout(r, 120)); } });
    await ev(() => window.__changeChat('mind-tab')); await sleep(200);
    await makeStatus(page);
    await ev(() => { window.__calls = 0; window.__ai = (p, sys) => { window.__calls++; window.__lastSys = sys; return 'Leon | 오늘은 기분이 좋아\nNobody | x'; }; });
    await ev(() => window.__addUser('Leon hi')); await ev(() => window.__addAI('Leon waves.')); await sleep(300);
    await ev(() => { window.__SS_TEST__.api.app.openSheet('mind'); }); await sleep(900);
    const t2 = await ev(() => ({ calls: window.__calls, tab: document.querySelector('dialog .ss-body')?.dataset.tab, mind: document.querySelector('dialog .ss-mindc .ss-mind.big')?.textContent.trim(), sys: /Leon/.test(window.__lastSys ?? ''), stored: window.__SS_TEST__.api.app.current.state.data.rel.user.find(x => x.name === 'Leon')?.mind?.text }));
    check(t2.tab === 'profile' && t2.calls === 1 && t2.mind === '오늘은 기분이 좋아' && t2.stored === t2.mind, '속마음 칸에 들어오면 한 번 받아 온다 (AI 1회)', JSON.stringify(t2));
    await panel(); await sleep(500); await panel(); await sleep(500);
    check(await ev(() => window.__calls) === 1, '같은 턴에 다시 들어와도 또 부르지 않는다');
    await page.click('dialog [data-act="mindfetch"]'); await sleep(700);
    check(await ev(() => window.__calls) === 2, '「지금 받기」는 누를 때마다 AI 1회');
    await ev(() => window.__addUser('next')); await ev(() => window.__addAI('Leon again.')); await sleep(300);
    await panel(); await sleep(800);
    check(await ev(() => window.__calls) === 3, '다음 턴에 들어오면 다시 한 번');

    const errs = logs.filter(l => /error/i.test(l) && !/favicon|404|Failed to load resource/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 5).join('\n'));
} finally { await close(); }
