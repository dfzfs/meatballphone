// 🍙 심플 모드: 기본 ↔ 심플 오가기 · 탭 없는 화면 · 알림 안 뜸 · 톱니 창 · 만들기 창에서 심플로 시작
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const ev = (fn, arg) => page.evaluate(fn, arg);
const closeDialogs = () => ev(async () => { for (let i = 0; i < 4; i++) { const d = [...document.querySelectorAll('dialog')].at(-1); if (!d) break; d.querySelector('.popup-button-ok')?.click(); await new Promise(r => setTimeout(r, 120)); } });
try {
    // ── 기본 모드에서 시작 ──
    await makeStatus(page); // profile · stats · wallet · rel · map · calendar · quest · home · memo
    await ev(() => window.__addUser('hi'));
    await ev(() => window.__addAI('Leon.\n<meatball>\ncash: -5\naff: Leon +2\n</meatball>'));
    await sleep(300);
    check(await ev(() => !document.body.classList.contains('ss-simple') && !!document.querySelector('#ss-hud [data-hud="open"]') && !document.querySelector('#ss-hud [data-hud="gear"]')), '기본 모드: HUD는 예전 그대로 (여는 아이콘 있음 · 톱니 없음)');
    const before = await ev(() => JSON.stringify(window.__SS_TEST__.api.app.current.state.data));

    // ── 심플로 ──
    check(await ev(async () => (await import('/ext/src/simple.js')).toSimple()), '심플 모드로 바꾸기');
    await sleep(300);
    const m1 = await ev(async () => { const c = await import('/ext/src/core.js'); const m = c.getMeta(); return { simple: m.simple, bak: m.simpleBak, on: c.MOD_IDS.filter(id => c.modOn(id)) }; });
    check(m1.simple === true && m1.bak.includes('home') && m1.bak.includes('memo') && !m1.bak.includes('quest'), '심플에 없는 칸만 숨김 (본거지 · 메모) — 퀘스트는 남김', JSON.stringify(m1));
    check(m1.on.join() === 'profile,stats,wallet,rel,map,calendar,quest', '켜진 칸 = 추천 6 + 퀘스트', m1.on.join());
    check(await ev(() => JSON.stringify(window.__SS_TEST__.api.app.current.state.data.home ?? null) !== 'null'), '숨긴 칸의 내용은 그대로');
    const hud = await ev(() => { const h = document.getElementById('ss-hud'); return { cls: document.body.classList.contains('ss-simple'), acts: [...h.querySelectorAll('.ss-tb-acts [data-hud]')].map(x => x.dataset.hud), tiles: [...h.querySelectorAll('.ss-t[data-k]')].map(x => x.dataset.k), dots: h.querySelectorAll('.ss-t-dot').length }; });
    check(hud.cls && hud.acts.join() === 'pause,gear', 'HUD 단추는 일시정지 · 톱니 둘뿐', JSON.stringify(hud.acts));
    check(hud.tiles.includes('date') && hud.tiles.includes('bars') && hud.tiles.includes('rel') && hud.tiles.includes('cash') && !hud.tiles.includes('contact') && !hud.tiles.includes('diff') && hud.dots === 0, '타일은 정해진 칸만 · 빨간 점 없음', hud.tiles.join());
    check(await ev(() => { const s = document.getElementById('ss-side'); return !s || (!!s.querySelector('[data-side="gear"]') && !s.querySelector('[data-side="edit"]') && getComputedStyle(s.querySelector('.ss-mini-foot [data-side="full"]')).display === 'none'); }), '옆 미니창: 톱니 · 칸 편집 없음 · 「펼치기」 숨김');

    // ── AI 답은 그대로 반영 · 칩도 그대로 ──
    await ev(() => window.__addUser('more'));
    await ev(() => window.__addAI('Leon again.\n<meatball>\ncash: -10\n</meatball>'));
    await sleep(300);
    check(await ev(() => window.__SS_TEST__.api.app.current.state.data.wallet.cash) === 85, '심플에서도 변화가 반영됨 (100 → 95 → 85)');

    // ── 타일 → 자세히 → 칸 하나만 (탭 줄 없음) ──
    await page.click('#ss-hud .ss-t[data-k="cash"]'); await sleep(150);
    check(await ev(() => /고치기/.test(document.querySelector('#ss-hud .ss-t-det .go')?.textContent ?? '')), '타일을 누르면 그 자리에서 자세히');
    await page.click('#ss-hud .ss-t-det .go'); await sleep(400);
    const sheet = await ev(() => { const r = document.querySelector('dialog .ss-panel .ss-root'); return r ? { simple: r.classList.contains('simple'), nav: !!r.querySelector('.ss-groups, .ss-tabs'), tab: r.querySelector('.ss-body')?.dataset.tab, back: !!r.querySelector('.ss-simple-back'), edit: !!r.querySelector('.ss-tools [data-act="edit"]'), hp: !!r.closest('.ss-panel').querySelector('.ss-hp') } : null; });
    check(sheet && sheet.simple && !sheet.nav && sheet.tab === 'wallet' && sheet.back && sheet.edit, '재산 칸만 열림 · 탭 줄 없음 · 편집 가능 · 「한눈에」 단추', JSON.stringify(sheet));
    await page.click('dialog .ss-simple-back'); await sleep(200);
    check(await ev(() => document.querySelector('dialog .ss-body')?.dataset.tab === 'home' && !document.querySelector('dialog .ss-callout.help')), '「한눈에」 = 홈 한 화면 (도우미 안내 카드 없음)');
    check(await ev(() => { const el = document.querySelector('dialog .ss-panel'); el._ss.tab = 'manage'; window.__SS_TEST__.api.app.renderPanel(el); return el.querySelector('.ss-body').dataset.tab; }) === 'home', '관리 탭으로 들어가도 한눈에로');
    await closeDialogs();

    // ── 알림: 팁 · 추천은 안 뜨고 ⚠️ 주의만 ──
    await ev(() => { const a = window.__SS_TEST__.api.app; a.notify({ kind: 'tip', icon: '💡', title: '이런 기능도 있어요 — 상점', text: 'x', mod: 'shop' }); a.notify({ kind: 'stage', who: 'Leon', name: '친구', text: '' }); });
    await sleep(200);
    check(await ev(() => document.querySelectorAll('.ss-toast').length) === 0, '심플: 추천 · 이야기 알림 창이 안 뜸');
    await ev(() => window.__SS_TEST__.api.app.notify({ kind: 'hint', icon: '⚠️', title: '알아 두세요', text: '변화 기록이 자주 빠져요', hint: 'l.missing' }));
    await sleep(200);
    check(await ev(() => document.querySelectorAll('.ss-toast').length) === 1, '심플: ⚠️ 주의는 뜸');
    await ev(() => document.querySelectorAll('.ss-toast').forEach(x => x.remove()));

    // ── 톱니 창: 기능 더 켜기 · 보이는 곳 ──
    await page.click('#ss-hud [data-hud="gear"]'); await sleep(400);
    check(await ev(() => !!document.querySelector('dialog .ss-simple-menu [data-sm="widen"]')), '톱니 창이 열림');
    await page.click('dialog .ss-simple-menu [data-sm-mod="music"]'); await sleep(400);
    check(await ev(async () => { const c = await import('/ext/src/core.js'); return c.modOn('music') && !!window.__SS_TEST__.api.app.current.state.data.music && document.querySelector('dialog [data-sm-mod="music"]').checked; }), '기능 더 켜기: 추천 음악 (AI 0회 · 기본 틀)');
    await page.click('dialog .ss-simple-menu [data-sm="where:side"]'); await sleep(250);
    check(await ev(() => { const s = window.__st.extensionSettings.statussim; return s.showSide === true && s.showHud === false && !document.getElementById('ss-hud') && !!document.querySelector('#ss-side [data-side="gear"]'); }), '보이는 곳: 옆 → HUD는 사라지고 미니창만');
    await page.click('dialog .ss-simple-menu [data-sm="where:full"]'); await sleep(250);
    check(await ev(() => { const s = window.__st.extensionSettings.statussim; return s.showFloat === true && !s.showHud && !s.showSide && !!document.getElementById('ss-float'); }), '보이는 곳: 버튼만 → 떠 있는 버튼');
    await page.click('dialog .ss-simple-menu [data-sm="where:hud"]'); await sleep(250);
    check(await ev(() => !!document.querySelector('#ss-hud [data-hud="gear"]') && !document.getElementById('ss-float')), '보이는 곳: 채팅 위');

    // ── 넓히기 ──
    await page.click('dialog .ss-simple-menu [data-sm="widen"]'); await sleep(700);
    const m2 = await ev(async () => { const c = await import('/ext/src/core.js'); const m = c.getMeta(); return { simple: m.simple, bak: m.simpleBak ?? null, home: c.modOn('home'), memo: c.modOn('memo'), music: c.modOn('music'), body: document.body.classList.contains('ss-simple'), open: !!document.querySelector('#ss-hud [data-hud="open"]'), menu: !!document.querySelector('dialog .ss-simple-menu'), manage: document.querySelector('dialog .ss-body')?.dataset.tab }; });
    check(m2.simple === false && m2.bak === null && m2.home && m2.memo && m2.music && !m2.body && m2.open, '기본 모드로 넓히기: 숨긴 칸이 돌아오고 화면도 예전대로', JSON.stringify(m2));
    check(!m2.menu && m2.manage === 'manage', '넓힌 뒤 톱니 창은 닫히고 관리 탭이 열림', JSON.stringify(m2));
    check(await ev(() => !!document.querySelector('dialog [data-act="tosimple"]')), '관리 › 플레이에 「심플 모드로 바꾸기」');
    await closeDialogs();
    const after = await ev(() => JSON.stringify(Object.fromEntries(Object.entries(window.__SS_TEST__.api.app.current.state.data).filter(([k]) => !['wallet', 'music'].includes(k)))));
    check(after === JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(before)).filter(([k]) => !['wallet', 'music'].includes(k)))), '오갔다 와도 다른 칸 내용은 글자 하나 안 바뀜');

    // ── 만들기 창: 처음이면 심플 · 줄인 화면 · 만들면 타일 판만 ──
    await ev(() => window.__changeChat('simple-new')); await sleep(300);
    await ev(async () => { const c = await import('/ext/src/core.js'); c.settings().genMode = 'tpl'; delete c.settings().startMode; c.settings().themeAsked = false; c.saveSettings(); (await import('/ext/src/lazy.js')).openWizard(); });
    await sleep(600);
    const wz = await ev(() => { const el = document.querySelector('dialog .ss-wizard'); const vis = (q) => [...el.querySelectorAll(q)].filter(x => x.offsetParent !== null).length; return { simple: el.classList.contains('wz-simple'), adv: vis('.ss-wz-adv'), full: vis('.ss-wz-full'), genre: vis('[data-w="genre"]'), go: vis('.ss-w-go'), cost: el.querySelector('.ss-w-cost').textContent }; });
    check(wz.simple && wz.adv === 0 && wz.full === 0 && wz.genre === 1 && wz.go === 1, '만들기 창: 심플이 기본 · 장르와 「생성 시작」만 보임', JSON.stringify(wz));
    check(/기능 6개/.test(wz.cost), '심플은 추천 6칸으로 만든다', wz.cost);
    await page.click('dialog .ss-wz-more'); await sleep(100);
    check(await ev(() => [...document.querySelectorAll('dialog .ss-wz-adv')].every(x => x.offsetParent !== null) && [...document.querySelectorAll('dialog .ss-wz-full')].every(x => x.offsetParent === null)), '「자세히 설정」을 누르면 나머지가 펼쳐짐 (쓸 기능 · 빠른 세트는 심플에 없음)');
    await page.click('dialog .ss-w-go'); await sleep(500);
    await page.click('dialog .ss-w-apply button'); await sleep(900);
    const made = await ev(async () => { const c = await import('/ext/src/core.js'); const m = c.getMeta(); return { simple: m.simple, on: c.MOD_IDS.filter(id => c.modOn(id)).join(), dialogs: document.querySelectorAll('dialog').length, gear: !!document.querySelector('#ss-hud [data-hud="gear"]'), start: c.settings().startMode, asked: c.settings().themeAsked }; });
    check(made.simple === true && made.on === 'profile,stats,wallet,rel,map,calendar' && made.gear, '심플로 만들어짐 · 타일 판이 바로 보임', JSON.stringify(made));
    check(made.dialogs === 0 && made.asked !== true && made.start === 'simple', '만든 뒤 아무 창도 안 뜸 (상태창 창 · 모양 고르기 창) · 고른 방식은 기억', JSON.stringify(made));

    // ── 만들기 창: 기본을 고르면 예전 화면 그대로 ──
    await ev(() => window.__changeChat('basic-new')); await sleep(300);
    await ev(async () => { (await import('/ext/src/lazy.js')).openWizard(); }); await sleep(600);
    await page.click('dialog [data-w="start"] [data-v="basic"]'); await sleep(100);
    check(await ev(() => { const el = document.querySelector('dialog .ss-wizard'); return !el.classList.contains('wz-simple') && [...el.querySelectorAll('.ss-wz-adv, .ss-wz-full')].every(x => x.offsetParent !== null) && el.querySelector('.ss-wz-more').offsetParent === null; }), '기본을 고르면 만들기 창이 예전 그대로');
    await closeDialogs();

    const errs = logs.filter(l => /error/i.test(l) && !/favicon|404|Failed to load resource/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 5).join('\n'));
} finally { await close(); }
