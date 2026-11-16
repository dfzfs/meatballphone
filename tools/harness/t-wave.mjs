// 🌊 파도타기 · 일촌평 · 방명록 화면 (선택 · minihome_ui.js): 끄면 일촌 창이 예전 그대로 · 실험실 스위치로 켜면 이름을 눌러 그 사람의 홈피가 열림 · 받기는 누를 때만 AI 1회
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 850 });
try {
    await makeStatus(page);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const shell = await import('/ext/src/shell.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms)), S = core.settings(), out = {};
        let calls = 0; window.__ai = () => { calls++; return '"잘 지내지? 또 올게."'; };
        await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +5\naff: Leon +30\npair: Leon & Mira | 남매\n</meatball>'); await wait(300);
        S.sheetFull = false; shell.openSheet('home'); await wait(400);
        const el = [...shell.panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop'));
        el.querySelector('[data-act="fullscreen"]').click(); await wait(800);
        const friends = () => [...el.querySelectorAll('.ss-hp-friends button')];
        out.offAsBefore = friends().length >= 2 && friends().every(b => b.dataset.act === 'tab' && b.dataset.arg === 'rel') && !el.querySelector('.ss-wv-foot') && app.hpFriend === undefined;
        // 관리 탭의 부가 기능 스위치로 켠다
        el._ss.tab = 'manage'; el._ss.ui = {}; app.renderPanel(el); await wait(300); // 스위치는 관리 › 쓸 기능 › 부가 기능
        const sw = (k) => el.querySelector(`[data-chg="setflag"][data-arg="${k}"]`);
        out.labHasSwitches = ['hpWave', 'guestbook', 'guestbookAuto'].every(k => sw(k) && !sw(k).checked);
        sw('hpWave').checked = true; sw('hpWave').dispatchEvent(new Event('change', { bubbles: true })); await wait(900);
        el._ss.tab = 'home'; el._ss.ui = {}; app.renderPanel(el); await wait(400);
        out.onClickable = S.hpWave === true && friends().every(b => b.dataset.act === 'hpwave') && friends().some(b => b.dataset.arg === 'Leon') && document.querySelector('#ss-settings input[data-s="hpWave"]').checked;
        window.__autoPopup = null; // 팝업을 열어 둔다
        friends().find(b => b.dataset.arg === 'Leon').click(); await wait(500);
        const box = () => document.querySelector('.ss-wave');
        out.pageOpens = !!box() && box().querySelector('h3').textContent.includes('Leon') && !box().querySelector('[data-wv="guest"]') && !!box().querySelector('[data-wv="iledit"]') && calls === 0;
        const goMira = [...box().querySelectorAll('[data-wv^="go:"]')].find(b => b.dataset.wv === 'go:Mira'); out.hasSurf = !!goMira;
        goMira?.click(); await wait(250); out.surfs = box().querySelector('h3').textContent.includes('Mira');
        // 방명록 · 일촌평 받기 (AI는 누를 때만)
        S.guestbook = true; [...box().querySelectorAll('[data-wv^="go:"]')].find(b => b.dataset.wv === 'go:Leon').click(); await wait(250);
        box().querySelector('[data-wv="ilchon"]').click(); await wait(500);
        out.ilchon = calls === 1 && box().querySelector('.ss-wv-il').textContent.includes('잘 지내지');
        box().querySelector('[data-wv="guest"]').click(); await wait(500);
        out.guest = calls === 2 && !!box().querySelector('.ss-wv-note') && box().querySelector('.ss-wv-note').textContent.includes('또 올게');
        out.friendLine = friends().find(b => b.dataset.arg === 'Leon').textContent.includes('잘 지내지') && !!el.querySelector('.ss-wv-foot [data-act="hpwall"]') && el.querySelector('.ss-wv-foot').textContent.includes('새 글 1');
        const id = box().querySelector('.ss-wv-note').dataset.id; box().querySelector(`[data-wv="del:${id}"]`).click(); await wait(300);
        out.del = !box().querySelector('.ss-wv-note') && calls === 2;
        // 다시 끄면 예전 그대로
        S.hpWave = false; app.renderPanel(el); await wait(300);
        out.offAgain = friends().every(b => b.dataset.act === 'tab') && !el.querySelector('.ss-wv-foot');
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, `wave ${k}`, v === true ? '' : JSON.stringify(v));
    check(!logs.some(l => /pageerror|TypeError/.test(l)), 'wave: 오류 없음', logs.slice(0, 2).join(' | '));
} finally { await close(); }
