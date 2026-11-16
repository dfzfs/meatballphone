// 📚 생성 때 읽을 로어북 고르기: 안 고르면 연결된 것 전부(예전과 같음) · 끄면 그 로어북은 안 읽음 · 연결 안 된 것도 더할 수 있음 · 만들기 창에 고르는 칸
import { open, check } from './lib.mjs';
const { page, logs, close } = await open({});
try {
    const r = await page.evaluate(async () => {
        const eng = await import('/ext/src/engine.js'); const core = await import('/ext/src/core.js');
        const wait = (ms) => new Promise(r => setTimeout(r, ms)), out = {};
        const c = window.SillyTavern.getContext();
        c.chatMetadata.world_info = 'BookA';
        const ch = c.characters?.[c.characterId]; if (ch) { ch.data ??= {}; ch.data.extensions ??= {}; ch.data.extensions.world = 'BookC'; }
        c.loadWorldInfo = async (n) => ({ entries: { 0: { comment: `${n} head`, content: `${n} body text` } } });
        const src = async () => eng.gatherSources({ card: false, chat: false });
        let t = await src();
        out.defaultAll = t.includes('BookA body') && (!ch || t.includes('BookC body')) && !core.getMeta()?.lorePick;
        const linked = (await eng.loreChoice()).linked;
        out.linked = linked.includes('BookA');
        eng.setLorePick(linked, linked.filter(n => n !== 'BookA')); t = await src();
        out.offSkips = !t.includes('BookA body') && (!ch || t.includes('BookC body')) && core.getMeta().lorePick.off.join() === 'BookA';
        eng.setLorePick(linked, [...linked, 'BookZ']); t = await src();
        out.addReads = t.includes('BookZ body') && t.includes('BookA body');
        eng.setLorePick(linked, [...linked]); t = await src();
        out.resetClears = !core.getMeta()?.lorePick && t.includes('BookA body') && !t.includes('BookZ body');
        eng.setLorePick(linked, []); t = await src();
        out.allOffNoLore = !t.includes('[LOREBOOK]');
        // 만들기 창: 연결된 로어북이 칩으로 · 끈 것은 꺼진 채 · 「로어북」을 끄면 칸이 숨음
        eng.setLorePick(linked, linked.filter(n => n !== 'BookA'));
        (await import('/ext/src/wizard.js')).openWizard(); await wait(600);
        const box = document.querySelector('.ss-w-lore'), chips = [...document.querySelectorAll('.ss-w-lorelist [data-lore]')];
        out.wizardChips = !!box && !box.classList.contains('ss-hide') && chips.some(i => i.dataset.lore === 'BookA' && !i.checked) && (!ch || chips.some(i => i.dataset.lore === 'BookC' && i.checked));
        const tog = document.querySelector('[data-src="lore"]'); tog.checked = false; tog.dispatchEvent(new Event('change', { bubbles: true }));
        out.hidesWhenOff = box.classList.contains('ss-hide');
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, k, JSON.stringify(v));
    { const real = logs.filter(l => !/status of 404/.test(l)); check(!real.length, '콘솔 오류 없음', real.slice(0, 3).join(' | ')); } // 시험대엔 실리의 world-info.js가 없다 (404)
} finally { await close(); }
