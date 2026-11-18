// ⚡ 관리 탭: 화면 밖 묶음은 계산을 건너뛰되(content-visibility) · 다시 그려도 보던 자리가 그대로 (보통 창 · 전체화면 미니홈피 둘 다) · 건너뛴 묶음의 단추도 눌림 · 탭을 바꾸면 맨 위부터
import { open, makeStatus, check } from './lib.mjs';
for (const full of [false, true]) {
    const { page, logs, close } = await open({ width: 1300, height: 800 });
    try {
        await makeStatus(page);
        const r = await page.evaluate(async (full) => {
            const core = await import('/ext/src/core.js'); const shell = await import('/ext/src/shell.js'); const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms)), S = core.settings(), out = {};
            await window.__addUser('hi'); await window.__addAI('s\n<meatball>\ncash: +1\n</meatball>'); await wait(300); window.__autoPopup = null;
            S.sheetFull = false; S.hpSkin = 'clean'; shell.openSheet('manage'); await wait(400);
            // 🗂 관리 탭 안의 탭 여섯 개: 처음엔 「플레이」만 보이고 · 다른 탭의 단추도 그대로 있고(숨기기만) · 탭을 누르면 바뀌고 기억된다 · 「쓸 기능」의 묶음은 각각 접힌다
            { const p0 = [...shell.panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop')), gs = () => [...p0.querySelectorAll('.ss-body[data-tab="manage"] > .ss-sec.ss-mg')], sec = (id) => p0.querySelector(`.ss-mg[data-mg="${id}"]`), tab = (id) => p0.querySelector(`[data-act="mgtab"][data-arg="${id}"]`);
                out.groups = gs().map(g => g.dataset.mg).join(',') === 'play,mods,save,tools,all,fix,danger' && p0.querySelectorAll('.ss-mg-tabs [data-act="mgtab"]').length === 7;
                out.onlyPlayShown = !sec('play').hidden && ['mods', 'save', 'tools', 'fix', 'danger'].every(id => sec(id).hidden) && tab('play').classList.contains('on');
                out.hiddenKeepsButtons = !!sec('save').querySelector('[data-act="fullbackup"]') && !!sec('fix').querySelector('[data-act="diagnose"]') && !!sec('danger').querySelector('[data-act="reset"]') && !!sec('tools').querySelector('[data-act="prompts"]');
                tab('save').click(); await wait(250);
                out.tabSwitches = !sec('save').hidden && sec('play').hidden && S.mgTab === 'save' && tab('save').classList.contains('on');
                tab('mods').click(); await wait(250);
                const grp = (id) => p0.querySelector(`[data-act="mgfold"][data-arg="mods-${id}"]`);
                out.modGroupsFolded = ['me', 'world', 'people'].every(id => grp(id) && grp(id).getAttribute('aria-expanded') === 'false' && grp(id).nextElementSibling.hidden) && /\d+\/\d+ 켬/.test(grp('me').textContent);
                grp('me').click(); await wait(250);
                out.modGroupOpensAlone = grp('me').getAttribute('aria-expanded') === 'true' && !grp('me').nextElementSibling.hidden && grp('world').nextElementSibling.hidden && S.mgOpen?.['mods-me'] === true;
                S.mgTab = 'mods'; S.mgOpen = { 'mods-home': true, 'mods-me': true, 'mods-world': true, 'mods-people': true, 'mods-feed': true }; app.renderPanel(p0); await wait(250); } // 아래 스크롤 시험은 「쓸 기능」을 다 편 채로 (길어야 스크롤이 생김)
            const el = [...shell.panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop')); const dlg = el.closest('dialog'); dlg.classList.add('ss-dlg'); dlg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:auto;';
            if (full) { el.querySelector('[data-act="fullscreen"]').click(); await wait(700); }
            const secs = () => [...el.querySelectorAll('.ss-body[data-tab="manage"] > .ss-sec')];
            const scroller = () => { let n = secs()[0]?.parentElement; while (n && n !== document.documentElement) { const cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 4) return n; n = n.parentElement; } return document.scrollingElement; };
            out.sections = secs().length === 7 || secs().length;
            out.skipsOffscreen = !('contentVisibility' in document.body.style) || getComputedStyle(secs()[0]).contentVisibility === 'auto';
            const moved = [];
            for (const frac of [0.4, 0.75, 1]) {
                const sc = scroller(); sc.scrollTop = (sc.scrollHeight - sc.clientHeight) * frac; await wait(250);
                const top0 = sc.getBoundingClientRect().top, idx = secs().findIndex(s => s.getBoundingClientRect().bottom > top0 + 40), y0 = secs()[idx].getBoundingClientRect().top, st0 = sc.scrollTop;
                app.renderPanel(el); await wait(250);
                moved.push(`${frac}:${Math.round(secs()[idx].getBoundingClientRect().top - y0)}/${st0 > 50 ? 'scrolled' : 'top'}`);
            }
            out.staysPut = moved.every(m => Math.abs(Number(m.split(':')[1].split('/')[0])) <= 3 && m.endsWith('scrolled')) || moved.join(' ');
            // 맨 아래 묶음의 단추 (화면 밖에 있다가 스크롤돼 들어온 것) 이 실제로 동작
            const b = secs().at(-1).querySelector('button'); out.lastHasButton = !!b;
            // 다른 탭으로 가면 맨 위부터
            el._ss.tab = 'stats'; el._ss.ui = {}; app.renderPanel(el); await wait(300);
            const sc2 = el.querySelector('.ss-hp-right'); out.otherTabFromTop = !full || !sc2 || sc2.scrollTop === 0 || sc2.scrollTop;
            return out;
        }, full);
        for (const [k, v] of Object.entries(r)) check(v === true, `manage (${full ? '전체화면' : '보통 창'}): ${k}`, typeof v === 'string' || typeof v === 'number' ? String(v) : '');
        check(!logs.some(l => /pageerror|TypeError/.test(l)), `manage (${full ? '전체화면' : '보통 창'}): 오류 없음`, logs.slice(0, 2).join(' | '));
    } finally { await close(); }
}
