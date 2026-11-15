// 선택 기능: 💞 인물끼리 호감 · 👑 루트 비교 · 군상극 · 칸별 토큰 · 원클릭 세트
// 핵심: 꺼져 있으면 계산 · 주입문 · 화면 어디에도 안 걸린다 → 켜면 실제로 동작한다
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'rel', 'map', 'calendar']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const eng = await import('/ext/src/engine.js'); const extra = await import('/ext/src/extra.js'); const win = await import('/ext/src/windows.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const set = core.settings();
        const inj = () => { const x = eng.buildInjection(app.current, { full: true }); return [x.main, x.people].join('\n'); };
        const guide = () => eng.tagKeysFor(core.getMeta()).join('\n');
        const pair = () => app.current.state.data.rel.pairs.find(p => p.a === 'Leon' && p.b === 'Mira');
        const view = () => extra.relView(app.current.state, app.current.state.data.rel, {});
        const refresh = async () => { core.saveSettings(); app.refreshNow(); await wait(120); };
        const out = {};
        // ── 꺼짐 (기본)
        out.defOff = set.pairAff === false && set.relRace === false;
        await window.__addUser('hi');
        await window.__addAI('a\n<meatball>\naff: Leon +3\naff: Mira +1\npair: Leon & Mira = 동료\npairaff: Leon & Mira +4\n</meatball>'); await wait(200);
        out.offNoAff = pair() && pair().aff === undefined;
        out.offGuide = !guide().includes('pairaff');
        out.offInj = !/Leon↔Mira[^·\n]*\(/.test(inj());
        out.offRecent = app.current.recent === undefined;
        out.offView = !view().includes('ss-race') && !view().includes('pairadj');
        // ── 💞 인물끼리 호감 켬
        set.pairAff = true; await refresh();
        out.onAff = pair()?.aff === 4; // 같은 메시지가 다시 계산되며 반영
        out.onGuide = guide().includes('pairaff');
        out.onInj = /Leon↔Mira 동료 \([^)]*4/.test(inj());
        await window.__addUser('more'); await window.__addAI('b\n<meatball>\npairaff: Mira & Leon +50\n</meatball>'); await wait(200);
        out.capStep = pair()?.aff === 4 + 15; // AI는 한 번에 15까지 · 순서가 바뀌어도 같은 쌍
        await eng.addAdjust({ ops: [['pairaff', 'Leon & Mira -5']], label: 't' }); await wait(150);
        out.manual = pair()?.aff === 14;
        out.onView = view().includes('pairadj') && view().includes('ss-pairs aff');
        { const rl = app.current.state.data.rel, st = rl.stages; out.pairStage = eng.pairStage(rl, { aff: -8 }).name === st[0].name && eng.pairStage(rl, { aff: 100 }).name === st.at(-1).name; }
        // 다시 끄면: 수치는 계산에서 빠지고 주입문도 처음과 같다
        set.pairAff = false; await refresh();
        out.backOff = pair()?.aff === undefined && !/Leon↔Mira[^·\n]*\(/.test(inj()) && !guide().includes('pairaff');
        const injBase = inj(); // 지금 상태에서 선택 기능이 전부 꺼진 주입문
        // ── 👑 루트 비교
        set.relRace = true; await refresh();
        out.recent = app.current.recent?.Leon?.aff === 3 && app.current.recent?.Mira?.aff === 1;
        const v = view();
        out.race = v.includes('ss-race') && v.includes('▲3') && v.indexOf('Leon', v.indexOf('ss-race')) < v.indexOf('Mira', v.indexOf('ss-race')) && v.includes('👑');
        out.raceNoToken = inj() === injBase; // 화면만 — 주입문은 그대로
        set.relRace = false; await refresh();
        // ── 군상극
        const meta = core.getMeta(true);
        meta.play = core.normPlay({ mode: 'director', hero: 'Leon', ensemble: true }); core.rev.n++; app.refreshNow(); await wait(120);
        out.ensNorm = meta.play.ensemble === true && meta.play.hero === '';
        const ei = inj();
        out.ensInj = ei.includes('ENSEMBLE') && !/→ (the cast|\{\{user\}\})/.test(ei) && ei.includes('Between the characters');
        out.ensGuide = !/\baff \(/.test(guide()) && guide().includes('pair (');
        out.ensView = !view().includes('ss-mindbar');
        meta.play = core.normPlay({ mode: 'rp' }); core.rev.n++; app.refreshNow(); await wait(120);
        out.rpBack = inj() === injBase && core.normPlay({ mode: 'rp', ensemble: true }).ensemble === false;
        // ── 칸별 토큰
        const mt = await win.modTokens();
        out.tok = mt.all > 0 && mt.list.length >= 2 && mt.list.every(([id, n]) => n > 0 && n < mt.all) && core.INJ.skip === null && mt.list[0][1] >= mt.list.at(-1)[1];
        out.tokIds = mt.list.map(x => x[0]).join(',');
        // ── 세트
        out.sets = Object.values(core.PLAY_SETS).every(s => s.mods.every(id => core.MOD[id]) && core.PLAY_MODES[s.play.mode]) && core.normPlay(core.PLAY_SETS.ensemble.play).ensemble === true;
        return out;
    });
    for (const [k, v] of Object.entries(r)) if (typeof v === 'boolean') check(v, k);
    console.log('  칸별 토큰 순서:', r.tokIds);
    // 만들기 창: 세트를 누르면 플레이 방식 · 쓸 기능이 맞춰진다
    const w = await page.evaluate(async () => {
        const { openWizard } = await import('/ext/src/wizard.js');
        openWizard(); await new Promise(r => setTimeout(r, 400));
        const el = document.querySelector('.ss-wizard');
        el.querySelector('[data-set="ensemble"]').click();
        const mods = [...el.querySelectorAll('[data-mod]:checked')].map(i => i.dataset.mod).sort().join(',');
        const res = { play: el.querySelector('[data-w="play"] > button.on')?.dataset.v, ens: el.querySelector('.ss-w-ens').checked, heroHidden: el.querySelector('.ss-hero').classList.contains('ss-hide'), mods, note: !el.querySelector('.ss-set-note').classList.contains('ss-hide') };
        el.querySelector('[data-set="romance"]').click();
        res.play2 = el.querySelector('[data-w="play"] > button.on')?.dataset.v; res.ens2 = el.querySelector('.ss-w-ens').checked; res.ensHidden2 = el.querySelector('.ss-ens').classList.contains('ss-hide');
        return res;
    });
    check(w.play === 'director' && w.ens && w.heroHidden && w.note, '세트: 군상극 → 풀사칭 · 주인공 없음', JSON.stringify(w));
    check(w.mods === 'calendar,gossip,map,memo,news,profile,rel', '세트: 군상극 기능 7개', w.mods);
    check(w.play2 === 'rp' && !w.ens2 && w.ensHidden2, '세트: 여성향 연애 → 롤플', JSON.stringify(w));
    const errs = logs.filter(l => !/404/.test(l)); // 만들기 창은 실리의 로어북 모듈(/scripts/world-info.js)을 찾는데 시험 페이지엔 없다
    check(!errs.length, 'no console errors', errs.join('\n'));
} finally { await close(); }
