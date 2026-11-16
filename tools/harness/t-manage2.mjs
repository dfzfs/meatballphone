// 🗂 관리 탭의 한 번에 고르기(추천만 · 전부 · 전부 끄기) · 편집 기록 싹 지우기/되살리기 · 프로필 모드 설명 · 🎨 포인트 색 번호 칸
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 800 });
try {
    await makeStatus(page);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const eng = await import('/ext/src/engine.js'); const shell = await import('/ext/src/shell.js'); const hompy = await import('/ext/src/hompy.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms)), S = core.settings(), out = {}, meta = () => core.getMeta();
        await window.__addUser('hi'); await window.__addAI('s\n<meatball>\ncash: +100\n</meatball>'); await wait(300);
        S.sheetFull = false; S.mgOpen = { play: true, mods: true, save: true }; shell.openSheet('manage'); await wait(400);
        const el = [...shell.panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop')), q = (x) => el.querySelector(x), on = () => core.MOD_IDS.filter(id => core.modOn(id));
        // ── 쓸 기능 한 번에 ──
        out.modBtns = ['rec', 'all', 'none'].every(a => q(`[data-mg="mods"] [data-act="modset"][data-arg="${a}"]`));
        q('[data-act="modset"][data-arg="all"]').click(); await wait(350); out.modAll = on().length === core.MOD_IDS.filter(id => !(core.GLOBAL_OFF?.[id] && S[core.GLOBAL_OFF[id]] === false)).length || on().length;
        q('[data-act="modset"][data-arg="rec"]').click(); await wait(350); out.modRec = on().slice().sort().join(',') === [...core.REC_MODS].sort().join(',') || on().join(',');
        out.modRecSwitches = [...el.querySelectorAll('[data-mg="mods"] input[data-chg="mod"]')].filter(i => i.checked).map(i => i.dataset.arg).sort().join(',') === [...core.REC_MODS].sort().join(',');
        out.modKeepsData = !!app.current.state.data.quest || meta().base?.data?.quest !== undefined; // 끈 칸의 내용은 남는다
        q('[data-act="modset"][data-arg="none"]').click(); await wait(350); out.modNone = on().length === 0;
        q('[data-act="modset"][data-arg="rec"]').click(); await wait(350);
        // ── 프로필 모드 설명 ──
        const pm = () => [...el.querySelectorAll('[data-mg="play"] .ss-sec')].find(x => /프로필 모드/.test(x.textContent));
        out.pmodeText = /카드 · 로어북대로/.test(pm().textContent) && /이 상태창 프로필대로/.test(pm().textContent) && /한 줄 소개만 보내요/.test(pm().textContent);
        // ── 편집 기록 싹 지우기 · 되살리기 ──
        await eng.addAdjust({ ops: [['cash', '+5']], label: 'a' }); await eng.addAdjust({ ops: [['cash', '+7']], label: 'b' }); await wait(300); app.renderPanel(el); await wait(200);
        const cash = () => app.current.state.data.wallet.cash, c0 = cash();
        window.__autoPopup = 'ok'; q('[data-act="undoall"]').click(); await wait(500);
        out.cleared = (meta().adjust ?? []).length === 0 && cash() === c0 - 12 && !!q('[data-act="undoallback"]') && q('[data-act="undoall"]').disabled;
        q('[data-act="undoallback"]').click(); await wait(500);
        out.restored = meta().adjust.length === 2 && cash() === c0 && !q('[data-act="undoallback"]');
        window.__autoPopup = 'cancel'; q('[data-act="undoall"]').click(); await wait(400); out.cancelKeeps = meta().adjust.length === 2; window.__autoPopup = 'ok';
        // ── 🎨 포인트 색 번호 (꾸미기 판 › 색) ──
        el.querySelector('[data-act="fullscreen"]').click(); await wait(800);
        hompy._decoMode(true); el.querySelector('[data-hp="deco"]').click(); await wait(400);
        const sheet = () => document.querySelector('.ss-hp-sheet'); [...sheet().querySelectorAll('[data-hp="ed"]')].find(b => /^tab:color$/.test(b.dataset.arg ?? ''))?.click(); await wait(300);
        const hx = sheet().querySelector('[data-hpx]'); out.hexField = !!hx && /^#[0-9a-f]{6}$/.test(hx.value);
        if (hx) {
            hx.value = '#2f6'; hx.dispatchEvent(new Event('input', { bubbles: true })); await wait(100); const mid = core.settings().hpTheme; // 적는 도중엔 그대로
            hx.value = '#2f62e9'; hx.dispatchEvent(new Event('input', { bubbles: true })); await wait(150);
            const D = core.settings(); out.hexApplies = mid !== 'c' && D.hpTheme === 'c' && D.hpHue === 224 && D.hpSat === 1.2 && sheet().querySelector('[data-hpr="hue"]').value === '224' && getComputedStyle(document.querySelector('.ss-hompy')).getPropertyValue('--hp-h').trim() === '224';
            hx.value = 'zzzzzz'; hx.dispatchEvent(new Event('input', { bubbles: true })); await wait(100); out.hexBadIgnored = core.settings().hpHue === 224;
        }
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, `manage2 ${k}`, v === true ? '' : JSON.stringify(v));
    check(!logs.some(l => /pageerror|TypeError/.test(l)), 'manage2: 오류 없음', logs.slice(0, 2).join(' | '));
} finally { await close(); }
