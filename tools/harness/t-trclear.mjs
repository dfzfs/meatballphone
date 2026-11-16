// 🗑 번역 전체 삭제: 고른 대로만 지움 · 📌 내가 고친 건 남김 · 취소하면 그대로 · 저장된 상태는 안 건드림 · 설정 서랍과 관리 탭에 단추
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open({});
try {
    await makeStatus(page);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const tr = await import('/ext/src/translate.js');
        const out = {}, c = window.SillyTavern.getContext();
        await window.__addUser('u'); await window.__addAI('Leon.\n<meatball>\ncash: -5\n</meatball>');
        core.settings().ssGenLang = 'enview';
        const answers = []; let asked = [];
        c.Popup.show.confirm = async (h, t) => { asked.push(String(t)); return answers.length ? answers.shift() : false; };
        const seed = () => { const m = core.getMeta(); m.tr = { Rope: '밧줄', 'Old Sword': '옛날 칼', Porter: '짐꾼', 'My Fix': '내가 고친 말' }; m.trLock = { 'My Fix': true }; return m; };
        const snap = () => JSON.stringify(core.getMeta().base);
        // 취소하면 그대로
        let m = seed(); const before = snap(); asked = []; answers.push(false);
        out.cancelKeeps = (await tr.clearTr()) === 0 && Object.keys(m.tr).length === 4 && /3개/.test(asked[0]) && /고친 1개/.test(asked[0]);
        // 지우기 (다시 번역은 「아니오」)
        m = seed(); asked = []; answers.push(true, false);
        const n = await tr.clearTr();
        out.clearsAllButLocked = n === 3 && Object.keys(m.tr).join() === 'My Fix' && m.tr['My Fix'] === '내가 고친 말' && m.trLock['My Fix'] === true;
        out.asksRetranslate = asked.length === 2 && /다시 번역/.test(asked[1]);
        out.stateUntouched = snap() === before;
        // 화면: 지운 글은 사전에서 더는 안 바뀜
        out.viewFallsBack = tr.trString('Rope') === 'Rope' && tr.trString('My Fix') === '내가 고친 말';
        // 고친 것만 남았을 때 · 빈 사전
        asked = []; out.onlyLockedLeft = (await tr.clearTr()) === 0 && asked.length === 0;
        m.tr = {}; out.emptyNoAsk = (await tr.clearTr()) === 0 && asked.length === 0;
        // 화면만 번역이 아니면 다시 번역을 묻지 않는다
        core.settings().ssGenLang = 'ko'; m = seed(); asked = []; answers.push(true);
        out.noRetranslateAskOutsideView = (await tr.clearTr()) === 3 && asked.length === 1;
        // 단추
        out.settingsButton = !!document.querySelector('#ss-settings [data-s-act="trclear"]');
        const views = await import('/ext/src/views.js'); void views;
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, k, JSON.stringify(v));
    const real = logs.filter(l => !/status of 404/.test(l)); check(!real.length, '콘솔 오류 없음', real.slice(0, 3).join(' | '));
} finally { await close(); }
