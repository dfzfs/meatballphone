// 💭 속마음 (v2.10): 사람 묶음의 따로 탭 · 프로필 카드에선 빠짐 · 관전자(열성팬 · 안티 · 공동작가 · 주변인 · 실시간 채팅 · 🧠 세포들 · 직접 만든 것)
//   · 어조 · 글 + 카모지 · 짧게 자르기 · 뜰 때 말풍선(HUD 옆) · 눈치 · 탭에 들어올 때 받기 · 다른 인물 인형의 기분 표정 · 장신구 여러 개
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const ev = (fn, arg) => page.evaluate(fn, arg);
const panel = (ui = {}, tab = 'mind') => ev(({ ui, tab }) => { const a = window.__SS_TEST__.api.app; const el = document.querySelector('dialog .ss-panel'); el._ss.tab = tab; el._ss.mode = 'view'; el._ss.ui = ui; a.renderPanel(el); }, { ui, tab });
const S = () => 'window.__st.extensionSettings.statussim';
try {
    await makeStatus(page);
    await ev(() => Object.assign(window.__st.extensionSettings.statussim, { mindMode: 'thought', mindFreq: 'always', peekCost: false, sync: 'tag', sceneOnly: false, mindWho: 'cast' }));
    await ev(() => window.__addUser('Leon hi'));
    await ev(() => window.__addAI('Leon nods.\n<meatball>\naff: Leon +1\nmind: Leon | 또 왔네, 귀찮게\n</meatball>'));
    await sleep(300);
    await ev(() => { window.__SS_TEST__.api.app.openSheet('mind'); }); await sleep(500);
    const t0 = await ev(() => ({ tab: document.querySelector('dialog .ss-body')?.dataset.tab, card: document.querySelector('dialog .ss-mindc .ss-mind.big')?.textContent.trim(), inPeople: [...document.querySelectorAll('dialog [data-act="tab"]')].map(b => b.dataset.arg) }));
    check(t0.tab === 'mind' && t0.card === '또 왔네, 귀찮게', '속마음 탭이 따로 열리고 인물 카드에 속마음', JSON.stringify(t0));
    await panel({}, 'profile');
    check(await ev(() => !document.querySelector('dialog .ss-mindc') && !document.querySelector('dialog .ss-mindopt') && !document.querySelector('dialog .ss-prof .ss-mind')), '프로필 카드에는 속마음이 없다');
    const grp = await ev(async () => (await import('/ext/src/views.js')).GROUPS.find(g => g.id === 'people').tabs.join());
    check(grp.startsWith('rel,mind'), '사람 묶음 · 관계 옆', grp);

    // 관전자 모드 · 세포들
    await panel();
    await ev(() => document.querySelector('dialog [data-arg="who:watch"]').click()); await sleep(250);
    check(await ev(() => !!document.querySelector('dialog .ss-wt-grid') && !document.querySelector('dialog .ss-cells')), '관전자 컨셉 고르기가 보인다 (세포들은 켜야 세포 목록)');
    await ev(() => document.querySelector('dialog .ss-wt[data-arg="w:cells"]').click()); await sleep(250);
    const c0 = await ev(() => ({ cells: document.querySelectorAll('dialog .ss-cell').length, on: document.querySelectorAll('dialog .ss-cell.on').length, w: window.__st.extensionSettings.statussim.mindWatch.join() }));
    check(c0.cells >= 8 && c0.on === 5 && c0.w === 'fan,cells', '세포들을 켜면 세포 목록 (기본 5마리)', JSON.stringify(c0));
    await ev(() => document.querySelector('dialog .ss-cell[data-arg="cell:noi"]').click()); await sleep(200);
    check(await ev(() => window.__st.extensionSettings.statussim.mindCells.includes('noi')), '세포 하나 더 켜기');
    // 어조
    await ev(() => document.querySelector('dialog [data-arg="tone:swear"]').click()); await sleep(200);
    // 프롬프트: 관전자 줄 · 세포 · 어조 · 짧게 규칙
    const p1 = await ev(async () => {
        const E = await import('/ext/src/engine.js'); const a = window.__SS_TEST__.api.app; const st = window.__st.extensionSettings.statussim;
        st.mindMode = 'mix'; st.mindWatch = ['cells']; st.mindCastMix = false; window.__SS_TEST__.api.refreshNow();
        const m = E.buildInjection(a.current).main, plan = E.mindPlan(a.current.state, st, true);
        return { watch: /watch: Name/.test(m), cell: /brain cells living inside/.test(m), swear: /swearing/.test(m), short: /NEVER literary monologue/.test(m), kao: /Vary the kaomoji/.test(m), cast: /mind: Name/.test(m), plan: plan.watch };
    });
    check(p1.watch && p1.cell && p1.swear && p1.short && p1.kao && !p1.cast && p1.plan.every(x => x.startsWith('cell:')) && p1.plan.length >= 1, '세포만 켜면: 세포 1~2마리 · 욕설 어조 · 짧게 · 카모지 다양하게 · 인물은 안 섞음', JSON.stringify(p1));
    // 깡은 없다
    check(await ev(async () => !(await import('/ext/src/mindcfg.js')).WATCH.kkang), '「깡」 컨셉은 세포들로 바뀌었다');

    // 관전자 한마디가 상태에 들어가고 · 관전석 · HUD 말풍선
    await ev(() => { window.__st.extensionSettings.statussim.mindWatch = ['fan', 'cells', 'anti']; window.__st.extensionSettings.statussim.showHud = true; window.__st.extensionSettings.statussim.mindPop = true; });
    await ev(() => document.querySelectorAll('#ss-mind-pops .ss-mpop').forEach(x => x.remove()));
    await ev(() => window.__addUser('kiss?')); await ev(() => window.__addAI('Leon blushes.\n<meatball>\nwatch: 열성팬 | 꺄 미쳤다 진짜 (≧▽≦)\nwatch: 지적세포 | 「숨을 들이켰다」 또 나옴 ㅋㅋ\nwatch: 안티 | 그녀는 꼭 이런 식으로 나를 힘들게 한다. 정말 지긋지긋하고 이해할 수 없는 사람이다\n</meatball>')); await sleep(600);
    const w1 = await ev(() => { const s = window.__SS_TEST__.api.app.current.state; return { w: s.watch.map(x => x.who + ':' + x.text), pops: [...document.querySelectorAll('#ss-mind-pops .ss-mpop')].map(x => x.className), body: !/watch:/.test(document.querySelector('#chat .mes:last-child .mes_text')?.textContent ?? '') }; });
    check(w1.w.length === 3 && /이해할 수 없는 사람이다$/.test(w1.w[2]) && w1.body, '관전자 한마디 3개 저장 (기본은 글자 수 제한 없음 — 안 잘림) · 본문에선 빠짐', JSON.stringify(w1));
    await sleep(1600);
    const w2 = await ev(() => [...document.querySelectorAll('#ss-mind-pops .ss-mpop')].map(x => x.className + '|' + x.querySelector('.ss-mpop-t')?.textContent));
    check(w2.length === 3 && w2.some(x => /c-fan/.test(x)) && w2.some(x => /c-celljijeok.*「숨을 들이켰다」/.test(x)) && w2.some(x => /c-anti/.test(x)), 'HUD 옆에 컨셉마다 다른 말풍선이 톡', JSON.stringify(w2));
    await panel();
    const w3 = await ev(() => ({ feed: [...document.querySelectorAll('dialog .ss-wt-feed li')].map(x => x.className), hud: [...document.querySelectorAll('#ss-hud .ss-wt-f, #ss-side .ss-wt-f')].length }));
    check(w3.feed.length === 3 && w3.feed.every(c => /now/.test(c)), '관전석에 최근 것부터', JSON.stringify(w3));
    // 같은 걸 다시 그려도 또 안 뜬다
    await ev(() => { document.querySelectorAll('#ss-mind-pops .ss-mpop').forEach(x => x.remove()); window.__SS_TEST__.api.refreshNow(); }); await sleep(400);
    check(await ev(() => document.querySelectorAll('#ss-mind-pops .ss-mpop').length === 0), '이미 띄운 건 다시 그려도 안 뜬다');
    // 미리 보기
    await ev(() => document.querySelector('dialog [data-arg="poptest"]').click()); await sleep(1800);
    check(await ev(() => document.querySelectorAll('#ss-mind-pops .ss-mpop').length >= 1), '「미리 보기」로 말풍선 연출 확인');

    // 직접 만든 관전자
    await ev(async () => { const st = window.__st.extensionSettings.statussim; st.mindWatchOwn = [{ id: 'own_x', name: '엄마', icon: '👩', desc: '몰래 보는 엄마' }]; st.mindWatch = ['own_x']; });
    const o1 = await ev(async () => { const E = await import('/ext/src/engine.js'); const a = window.__SS_TEST__.api.app; window.__SS_TEST__.api.refreshNow(); return E.buildInjection(a.current).main; });
    check(/name "엄마"/.test(o1) && /몰래 보는 엄마/.test(o1), '직접 만든 관전자가 프롬프트에', o1.slice(-300));

    // 인물 모드로 돌아가서: 눈치 · 탭에서 받기
    await ev(() => Object.assign(window.__st.extensionSettings.statussim, { mindWho: 'cast', mindMode: 'thought', mindTone: 'none' }));
    await panel();
    await ev(() => document.querySelector('dialog [data-arg="sus:toggle"]').click()); await sleep(250);
    await ev(() => window.__addUser('3')); await ev(() => window.__addAI('Leon.\n<meatball>\nmind: Leon | 들키면 안 되는데\n</meatball>')); await sleep(300);
    await panel();
    check(await ev(() => !!document.querySelector('dialog .ss-mind-cover')), '눈치 켬: 가려진 채로');
    await ev(() => { document.querySelector('dialog .ss-mind-cover[data-arg="Leon"]').click(); }); await sleep(400);
    check(await ev(() => /들키면/.test(document.querySelector('dialog .ss-mindc .ss-mind.big')?.textContent ?? '')), '눌러서 보기');
    await ev(() => document.querySelector('dialog [data-arg="sus:toggle"]').click()); await sleep(200);

    await ev(async () => { for (let i = 0; i < 4; i++) { const d = [...document.querySelectorAll('dialog')].at(-1); if (!d) break; d.querySelector('.popup-button-ok')?.click(); await new Promise(r => setTimeout(r, 120)); } });
    await ev(() => window.__changeChat('mind-tab')); await sleep(200);
    await makeStatus(page);
    await ev(() => { Object.assign(window.__st.extensionSettings.statussim, { mindFreq: 'tab', mindWho: 'cast' }); window.__calls = 0; window.__ai = (p, sys) => { window.__calls++; window.__lastSys = sys; return 'Leon | 오늘은 기분이 좋아\nNobody | x'; }; });
    await ev(() => window.__addUser('Leon hi')); await ev(() => window.__addAI('Leon waves.')); await sleep(300);
    await ev(() => { window.__SS_TEST__.api.app.openSheet('mind'); }); await sleep(900);
    const t2 = await ev(() => ({ calls: window.__calls, tab: document.querySelector('dialog .ss-body')?.dataset.tab, mind: document.querySelector('dialog .ss-mindc .ss-mind.big')?.textContent.trim() }));
    check(t2.tab === 'mind' && t2.calls === 1 && t2.mind === '오늘은 기분이 좋아', '속마음 탭에 들어오면 한 번 받아 온다 (AI 1회)', JSON.stringify(t2));
    await panel(); await sleep(500);
    check(await ev(() => window.__calls) === 1, '같은 턴에 다시 들어와도 또 부르지 않는다');
    // 관전자 탭 받기
    await ev(() => { Object.assign(window.__st.extensionSettings.statussim, { mindWho: 'watch', mindWatch: ['fan'], mindCastMix: false }); window.__ai = (p, sys) => { window.__calls++; window.__lastSys = sys; return '열성팬 | 손 흔드는 거 봤냐고 ㅠㅠ'; }; });
    await page.click('dialog [data-act="mindfetch"]'); await sleep(800);
    const t3 = await ev(() => ({ calls: window.__calls, w: window.__SS_TEST__.api.app.current.state.watch?.at(-1)?.text, sys: /Spectators OUTSIDE/.test(window.__lastSys ?? '') }));
    check(t3.calls === 2 && t3.w === '손 흔드는 거 봤냐고 ㅠㅠ' && t3.sys, '「지금 받기」로 관전자 한마디 (AI 1회)', JSON.stringify(t3));

    // 다른 인물 인형: 기분 따라 표정 · 장신구 여러 개
    const d1 = await ev(async () => {
        const L = await import('/ext/src/life.js'); const s = window.__SS_TEST__.api.app.current.state;
        const r = s.data.rel.user.find(x => x.name === 'Leon'); r.mind = { text: '아 진짜 짜증나 (╬ Ò﹏Ó)', turn: s.turn };
        const angry = L.npcFace(s, 'Leon'); r.mind = { text: '두근거려 ♡', turn: s.turn }; const love = L.npcFace(s, 'Leon'); r.mind = null; r.aff = 80; const rel = L.npcFace(s, 'Leon');
        return { angry, love, rel };
    });
    check(d1.angry === 'angry' && d1.love === 'love' && d1.rel === 'love', '다른 인물 표정: 속마음 → 표정, 없으면 호감으로', JSON.stringify(d1));
    const d2 = await ev(async () => {
        const DL = await import('/ext/src/doll.js');
        const one = DL.dollSVG({}, [{ kind: 'acc', shape: 'glasses', color: '#2f3138' }]), two = DL.dollSVG({}, [{ kind: 'acc', shape: 'glasses', color: '#2f3138' }, { kind: 'acc', shape: 'crown', color: '#e8b93a' }]);
        const A = await import('/ext/src/addons.js'); return { diff: one !== two, slots: A.GEAR_SLOTS.join(), add: typeof A.addGearSlot };
    });
    check(d2.diff && /모자/.test(d2.slots) && /장신구 2/.test(d2.slots) && d2.add === 'function', '장신구가 여러 개 겹쳐 그려진다 · 기본 칸이 늘었다', JSON.stringify(d2));

    // ✏ 전부 고칠 수 있다: 프리셋 덮어쓰기 · 숨기기 · 자기만의 어조 · 숫자 · 글자 수 · 노년체
    const e1 = await ev(async () => {
        const E = await import('/ext/src/engine.js'), C = await import('/ext/src/mindcfg.js'), O = await import('/ext/src/ops.js'); const a = window.__SS_TEST__.api.app; const st = window.__st.extensionSettings.statussim;
        Object.assign(st, { mindWho: 'watch', mindFreq: 'always', mindMode: 'thought', mindWatch: ['fan', 'anti', 'writer'], mindEdit: { w: { fan: { name: '덕후', nick: '찐덕후', p: 'a hardcore otaku fan', tone: 'aegyo' } }, t: { elder: { name: '어르신체', p: 'old man speech' } } }, mindHide: { w: ['by'] }, mindNum: { max: 3, two: 100, len: 10 }, mindRule: 'ONE WORD ONLY' });
        window.__SS_TEST__.api.refreshNow(); const m = E.buildInjection(a.current).main, plan = E.mindPlan(a.current.state, st, true);
        const T = C.toneDefs(st), D = C.watchDefs(st);
        return { nick: /name "찐덕후"/.test(m), p: /hardcore otaku/.test(m), ownTone: /own voice: cutesy aegyo/.test(m), rule: /ONE WORD ONLY/.test(m), three: plan.watch.length === 3, hidden: !D.by, elder: T.elder?.name, noHalmae: !T.halmae, len: O.cleanMind('가나다라마바사아자차카타파하'), };
    });
    check(e1.nick && e1.p && e1.ownTone && e1.rule && e1.three && e1.hidden && e1.elder === '어르신체' && e1.noHalmae && e1.len.length <= 10, '프리셋 덮어쓰기 · 숨기기 · 자기 어조 · 짧게 규칙 · 최대 인원 · 글자 수 · 노년체', JSON.stringify(e1));
    // 고치기 창: 세포를 눌러 고치고 저장
    await ev(() => { Object.assign(window.__st.extensionSettings.statussim, { mindWatch: ['cells'], mindEdit: {}, mindHide: {}, mindNum: {} }); delete window.__st.extensionSettings.statussim.mindRule; });
    await panel(); await sleep(200);
    await ev(() => { window.__autoPopup = null; document.querySelector('dialog .ss-cell [data-arg="cedit:yok"]').click(); }); await sleep(400);
    const f1 = await ev(() => { const f = document.querySelector('.ss-mind-form'); if (!f) return null; f.querySelector('[data-f="name"]').value = '버럭세포'; f.querySelector('[data-f="color"]').value = '#ff3355'; f.querySelector('[data-f="face"]').value = 'shock'; f.querySelector('[data-f="p"]').value = '소리부터 지르는 세포'; return { svg: !!f.querySelector('.ss-form-prev svg') }; });
    await ev(() => { document.querySelector('.ss-mind-form').closest('dialog, .popup').querySelector('.popup-button-ok').click(); window.__autoPopup = 'ok'; }); await sleep(500);
    const f2 = await ev(() => ({ e: window.__st.extensionSettings.statussim.mindEdit?.c?.yok, shown: [...document.querySelectorAll('dialog .ss-cell b')].map(x => x.textContent).includes('버럭세포') }));
    check(f1?.svg && f2.e?.name === '버럭세포' && f2.e?.color === '#ff3355' && f2.e?.face === 'shock' && f2.shown, '세포 고치기 창: 이름 · 색 · 표정 · 성격 저장 (미리 보기 그림)', JSON.stringify({ f1, f2 }));
    // 세포 그림은 지브리 검댕이가 아니라 직접 그린 파스텔 찹쌀떡 + 새싹
    check(await ev(() => !!document.querySelector('dialog .ss-cell svg.ss-cellsvg path[fill="#8ac86a"]')), '세포는 새싹 달린 파스텔 떡 그림');

    // 🗑 지우기 · 🌐 속마음 언어
    const z = await ev(async () => {
        const E = await import('/ext/src/engine.js'); const a = window.__SS_TEST__.api.app; const st = window.__st.extensionSettings.statussim;
        Object.assign(st, { mindWho: 'watch', mindWatch: ['fan'], mindLang: 'ja', mindMode: 'thought', mindFreq: 'always' });
        window.__SS_TEST__.api.refreshNow(); const ja = /in Japanese, whatever language/.test(E.buildInjection(a.current).main);
        st.mindLang = ''; window.__SS_TEST__.api.refreshNow(); const auto = !/whatever language the story uses/.test(E.buildInjection(a.current).main);
        return { ja, auto };
    });
    check(z.ja && z.auto, '속마음만 따로 언어 (일본어) · 자동이면 안 붙음', JSON.stringify(z));
    await ev(() => window.__addUser('again')); await ev(() => window.__addAI('Leon.\n<meatball>\nmind: Leon | 또 너야\nwatch: 열성팬 | 꺄아\nwatch: 열성팬2 | 하나 더\n</meatball>')); await sleep(400);
    await panel();
    await ev(() => { document.querySelector('dialog .ss-wt-feed [data-arg^="del:w|"]').click(); }); await sleep(500);
    const z1 = await ev(() => window.__SS_TEST__.api.app.current.state.watch.length);
    await ev(() => { document.querySelector('dialog [data-act="mindcfg"][data-arg="clear"]').click(); }); await sleep(700);
    const z2 = await ev(() => { const s = window.__SS_TEST__.api.app.current.state; return { w: s.watch.length, m: s.data.rel.user.filter(r => r.mind || r.mindLog?.length).length, p: s.data.profile.list.filter(r => r.mind).length, btn: !!document.querySelector('dialog [data-arg="clear"]') }; });
    check(z1 >= 1 && z2.w === 0 && z2.m === 0 && z2.p === 0 && !z2.btn, '한마디 하나 지우기 · 「전부 지우기」로 인물 속마음 · 지난 것 · 관전석 다 지움', JSON.stringify({ z1, z2 }));

    const errs = logs.filter(l => /error/i.test(l) && !/favicon|404|Failed to load resource/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 5).join('\n'));
} finally { await close(); }
