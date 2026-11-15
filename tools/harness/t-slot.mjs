// 칩 자리(.ss-slot · 실리가 custom-을 붙인 .custom-ss-slot) · 화면 번역 빈틈
//  ① custom- 이 붙은 칩 자리도 화면 번역이 닿는가 ② 긴 이름 짝이 나중에 생기면 원래 글에서 다시 옮기는가
//  ③ 「남은 글」에 칩 · 알림 글의 영어 부분이 들어가는가 ④ 우리 칩 자리를 남의 것으로 세지 않는가
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'rel', 'map', 'calendar']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const tr = await import('/ext/src/translate.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const s = window.__st.extensionSettings.statussim; s.ssGenLang = 'enview'; s.trEngine = 'st';
        await window.__addUser('hi'); const i = await window.__addAI('a'); await wait(150);
        const out = {};
        const textEl = document.querySelector(`.mes[mesid="${i}"] .mes_text`);
        const slot = document.createElement('div'); slot.className = 'custom-ss-slot'; slot.innerHTML = '<span class="ss-chip">📍 North Express Lift</span>'; textEl.appendChild(slot);
        const body = document.createElement('p'); body.textContent = 'North is cold.'; textEl.appendChild(body);
        const chip = slot.firstChild;
        tr.addPairs([['North', '북쪽']]); tr.translateView(); await wait(50);
        out.customSlot = chip.textContent === '📍 북쪽 Express Lift';
        out.bodyUntouched = body.textContent === 'North is cold.'; // 본문은 절대 안 건드림
        tr.addPairs([['North Express Lift', '북부 급행 승강기']]); tr.translateView(); await wait(50);
        out.reTranslate = chip.textContent === '📍 북부 급행 승강기';
        tr.translateView(); out.stable = chip.textContent === '📍 북부 급행 승강기';
        chip.firstChild.nodeValue = '📍 South Gate'; tr.translateView(); // 다시 그려진 글은 새 글로
        out.redraw = chip.textContent === '📍 South Gate';
        out.sel = core.isSlotEl(slot) && !core.isSlotEl(body) && slot.matches(core.SLOT_SEL);
        // 남은 글: 알림함 · 칩
        const meta = core.getMeta(true);
        meta.notes = [...(meta.notes ?? []), { id: 'x', t: Date.now(), kind: 'info', title: '📜 Visit Silver Lantern Inn +2', text: '북쪽 다녀옴', read: false }];
        core.rev.n++; app.refreshNow(); await wait(150);
        const miss = tr.missingTr();
        out.looseNote = miss.includes('Visit Silver Lantern Inn');
        out.looseClean = !miss.some(k => /북쪽|^\+|📜/.test(k));
        tr.addPairs([['Visit Silver Lantern Inn', '은등 여관 가기']]); core.rev.n++; app.refreshNow(); await wait(150);
        out.looseDone = !tr.missingTr().includes('Visit Silver Lantern Inn');
        s.ssGenLang = 'ko'; core.rev.n++; app.refreshNow(); await wait(100);
        out.offNoMiss = tr.missingTr().length === 0;
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, k, String(v));
    check(!logs.length, 'no console errors', logs.join('\n'));
} finally { await close(); }
