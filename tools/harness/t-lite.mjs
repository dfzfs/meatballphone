// 🪶 조용한 업데이트 + 가볍게: 기본은 예전 화면 그대로(미니홈피 · 같은 모양 끔) · 확장 설정에서 켜면 미니홈피 · 「가볍게」는 옆 창 없이 가운데 창만 · 꾸미기 › 창에서 되돌림
import { open, makeStatus, check, sleep } from './lib.mjs';
const { page, logs, close } = await open({ defaults: true });
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'memo', 'contact']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const shell = await import('/ext/src/shell.js'); const hp = await import('/ext/src/hompy.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms)), S = core.settings(), out = {};
        await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +5\naff: Leon +30\ncash: +50\n</meatball>'); await wait(300);
        out.defaultsOff = S.hompyFull === false && S.hpSkinHud === false && S.hpLite === false && !document.body.classList.contains('ss-retro');
        window.__autoPopup = null; S.sheetFull = false; shell.openSheet('home'); await wait(400);
        const el = [...shell.panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop')); const dlg = el.closest('dialog'); dlg.classList.add('ss-dlg'); dlg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:auto;';
        el.querySelector('[data-act="fullscreen"]').click(); await wait(500);
        out.fullIsOldScreen = !el.querySelector('.ss-hompy') && !!el.querySelector('.ss-groups') && !el.querySelector('.ss-root').classList.contains('ss-rt');
        // 확장 설정의 체크 칸으로 켜기
        const box = (k) => document.querySelector(`#ss-settings input[data-s="${k}"]`);
        const tick = async (k, on) => { const b = box(k); if (!b) return false; b.checked = on; b.dispatchEvent(new Event('change', { bubbles: true })); await wait(450); return true; };
        out.boxes = ['hompyFull', 'hpLite', 'hpSkinHud'].every(k => !!box(k) && box(k).checked === false);
        out.turnOn = await tick('hompyFull', true) && !!el.querySelector('.ss-hompy .ss-hp-col .ss-hp-win') && !document.body.classList.contains('ss-retro');
        const n0 = el.querySelectorAll('*').length;
        out.hudSkin = await tick('hpSkinHud', true) && document.body.classList.contains('ss-retro') && await tick('hpSkinHud', false) && !document.body.classList.contains('ss-retro');
        // 가볍게: 옆 창 없이 · 가운데 창은 그대로 · 홈의 앱 카드에 옆 창 내용이 다 있음
        out.lite = await tick('hpLite', true) && !!el.querySelector('.ss-hompy') && !el.querySelector('.ss-hp-col') && !!el.querySelector('.ss-hp-win.main .ss-body') && !!el.querySelector('.ss-hp-marks .ss-groups');
        const n1 = el.querySelectorAll('*').length; out.liteSmaller = n1 < n0 * 0.9 || `${n0} → ${n1}`; // 옆 창이 빠진 만큼 (홈에서는 그 내용이 앱 카드로 돌아와 덜 줄고, 다른 탭에서는 더 준다)
        out.liteHomeHasAll = ['stats', 'rel', 'wallet', 'profile'].every(k => !!el.querySelector(`.ss-fb-grid [data-app="${k}"]`)) || [...el.querySelectorAll('.ss-fb-grid [data-app]')].map(x => x.dataset.app).join(',');
        out.liteNoOverflow = document.documentElement.scrollWidth <= innerWidth;
        // 탭을 넘겨도 그대로 · 다시 그려도 그대로
        el._ss.tab = 'rel'; el._ss.ui = {}; app.renderPanel(el); await wait(250); out.liteOtherTab = !el.querySelector('.ss-hp-col') && !!el.querySelector('.ss-hp-win.main .ss-body[data-tab="rel"]');
        // 꾸미기 › 창에서 되돌리기 (취소하면 들어오기 전으로)
        el.querySelector('[data-hp="deco"]').click(); await wait(350);
        const sh = () => el.querySelector('.ss-hp-sheet'); sh().querySelector('[data-arg="tab:wins"]').click(); await wait(300);
        out.sheetHasSwitch = !!sh().querySelector('[data-arg="lite:0"]') && sh().querySelector('[data-arg="lite:1"]').classList.contains('on');
        sh().querySelector('[data-arg="lite:0"]').click(); await wait(350); const offNow = S.hpLite === false;
        el.querySelector('[data-hp="edcancel"]').click(); await wait(400); out.cancelRestores = offNow && S.hpLite === true && !el.querySelector('.ss-hp-col');
        el.querySelector('[data-hp="deco"]').click(); await wait(350); sh().querySelector('[data-arg="tab:wins"]').click(); await wait(300); sh().querySelector('[data-arg="lite:0"]').click(); await wait(300); el.querySelector('[data-hp="eddone"]').click(); await wait(450);
        out.backToFull = S.hpLite === false && !!el.querySelector('.ss-hp-col .ss-hp-win');
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, `lite: ${k}`, typeof v === 'string' ? v : '');
    check(!logs.some(l => /pageerror|TypeError/.test(l)), 'lite: 오류 없음', logs.slice(0, 2).join(' | '));
} finally { await close(); }
// 펼친 사이드(미니바 큰 판)에서 전체화면을 누르면: 같은 탭으로 전체화면이 열리고 사이드는 미니로 접힌다 (두 군데서 같은 화면을 그리지 않게)
{
    const { page, logs, close } = await open();
    try {
        await makeStatus(page);
        const r = await page.evaluate(async () => {
            const core = await import('/ext/src/core.js'); const shell = await import('/ext/src/shell.js'); const wait = (ms) => new Promise(r => setTimeout(r, ms)), S = core.settings();
            await window.__addUser('hi'); await window.__addAI('s\n<meatball>\ncash: +1\n</meatball>'); await wait(300); window.__autoPopup = null;
            S.sideState = 'full'; shell.ensureUI(); await wait(400);
            const side = document.querySelector('#ss-side .ss-panel'); side._ss.tab = 'stats'; window.__SS_TEST__.api.app.renderPanel(side); await wait(200);
            side.querySelector('[data-act="fullscreen"]').click(); await wait(900);
            const pop = [...shell.panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop'));
            return { sideState: S.sideState, sideData: document.getElementById('ss-side').dataset.state, tab: pop?._ss?.tab, full: pop?._ss?.full, drawn: [...shell.panels].filter(p => p.isConnected && !(p.classList.contains('ss-panel-side') && S.sideState !== 'full')).length };
        });
        check(r.sideState === 'mini' && r.sideData === 'mini' && r.tab === 'stats' && r.full === true && r.drawn === 1, 'side → 전체화면: 사이드는 접히고 같은 탭으로 열림 (그리는 창 1개)', JSON.stringify(r));
        check(!logs.some(l => /pageerror|TypeError/.test(l)), 'side → 전체화면: 오류 없음', logs.slice(0, 2).join(' | '));
    } finally { await close(); }
}
