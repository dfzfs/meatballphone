// 🎨 꾸미기 (v2.9): 꾸밀 사람 고르기 · 다른 인물 인형(옷 모양 · 색) · 공용 프로필(인형 얼굴) · 프로필 카드의 「꾸미기」 · 전체화면 프로필 그림 「도트 인형」
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'rel', 'calendar']); // 재산 칸 없이도 꾸미기 탭이 열려야 함
    await page.evaluate(() => window.__addUser('hi'));
    await page.evaluate(() => window.__addAI('ok'));
    await sleep(200);
    await page.evaluate(async () => {
        const { addAdjust } = await import('/ext/src/engine.js');
        const st = window.__SS_TEST__.api.app.current.state, prof = structuredClone(st.data.profile);
        prof.list = [{ ...prof.list[0], name: '나', role: 'user' }, { ...prof.list[0], name: '로우', role: 'main' }, { ...prof.list[0], name: '사보', role: 'npc' }];
        await addAdjust({ set: { mod: 'profile', data: prof }, label: 'p' });
        window.__SS_TEST__.api.app.openSheet('profile');
    });
    await sleep(400);
    const q = (fn, arg) => page.evaluate(fn, arg);
    const meta = () => q(async () => JSON.parse(JSON.stringify((await import('/ext/src/core.js')).getMeta())));
    const click = async (sel) => { await q((sel) => document.querySelector(`dialog .ss-panel ${sel}`).dispatchEvent(new MouseEvent('click', { bubbles: true })), sel); await sleep(500); };
    const render = (tab, ui) => q(([tab, ui]) => { const el = document.querySelector('dialog .ss-panel'); el._ss.tab = tab; el._ss.mode = 'view'; if (ui) el._ss.ui = ui; window.__SS_TEST__.api.app.renderPanel(el); }, [tab, ui]);

    // 프로필 카드의 「꾸미기」 → 꾸미기 탭이 켜지고 그 사람으로
    await render('profile', {});
    check(await q(() => document.querySelectorAll('dialog .ss-panel [data-act="dollgo"]').length) === 3, '프로필 카드마다 「꾸미기」 단추');
    await click('[data-act="dollgo"][data-arg="로우"]'); await sleep(600);
    check((await meta()).life?.wear === true && await q(() => document.querySelector('dialog .ss-panel')._ss.tab === 'wear' && document.querySelector('dialog .ss-panel .ss-dollwho-b.on')?.dataset.arg === '로우'), '꾸미기 탭이 켜지고 로우가 골라짐 (재산 칸 없이도)');
    check(await q(() => [...document.querySelectorAll('dialog .ss-tabs button, dialog .ss-sub button, dialog [data-act="tab"]')].some(b => /꾸미기/.test(b.textContent)) && ![...document.querySelectorAll('dialog button')].some(b => /옷차림/.test(b.textContent))), '탭 이름이 「꾸미기」');
    // 로우: 겉옷 입히기 · 색 · 머리 색 → meta.dolls.로우 에만, 내 인형은 그대로
    await click('[data-act="dollwear"][data-arg="outer|on"]');
    await click('[data-act="dollwear"][data-arg="outer|color:#4a8fe2"]');
    await click('[data-act="dolllook"][data-arg="hairColor:#d24a3a"]');
    let m = await meta();
    check(m.dolls?.['로우']?.outfit?.outer?.color === '#4a8fe2' && m.dolls['로우'].hairColor === '#d24a3a' && !m.doll?.hairColor, `로우 인형에만 저장 (${JSON.stringify(m.dolls?.['로우'])})`);
    await click('[data-act="dollwear"][data-arg="outer|off"]');
    check(!(await meta()).dolls['로우'].outfit?.outer, '벗기');
    // 공용 프로필: 인형 얼굴 → 얼굴이 나오는 곳에 그림
    await click('[data-act="dollface"][data-arg="on"]');
    await render('profile', {}); await sleep(500);
    check(await q(() => { const sm = [...document.querySelectorAll('dialog .ss-panel .ss-prof summary, dialog .ss-panel details summary')].find(x => /로우/.test(x.textContent)); return !!sm?.querySelector('.ss-ava.doll img[src^="data:image/"]'); }), '프로필 탭: 로우 얼굴이 인형으로');
    check(await q(() => { const sm = [...document.querySelectorAll('dialog .ss-panel details summary')].find(x => /사보/.test(x.textContent)); return !!sm && !sm.querySelector('.ss-ava.doll'); }), '안 켠 사람(사보)은 이모지 그대로');
    check(await q(() => !!document.querySelector('dialog .ss-panel .ss-prof-doll')), '인형이 있는 인물은 프로필 안에 인형');
    // 나: 꾸미기 → 내 인형 (meta.doll)
    await render('wear', { dollWho: '' }); await sleep(300);
    await click('[data-act="dolllook"][data-arg="hairColor:#e8c36a"]');
    await click('[data-act="dollface"][data-arg="on"]');
    m = await meta();
    check(m.doll?.hairColor === '#e8c36a' && m.doll?.asFace === true && m.dolls['로우'].hairColor === '#d24a3a', '나는 내 인형(meta.doll)에');
    check(await q(() => !!document.querySelector('dialog .ss-panel .ss-wear-top .ss-px') && /재산 칸을 켜면/.test(document.querySelector('dialog .ss-panel').textContent)), '재산 칸이 없으면 내 옷 입히기만 안내');
    // 전체화면 프로필 그림: 「도트 인형」
    check(await q(() => typeof window.__SS_TEST__.api.app.dollUrl === 'function' && String(window.__SS_TEST__.api.app.dollUrl()).startsWith('data:image/')), '내 도트 인형 그림 주소');
    // 전체화면: 「나」 밑 프로필 그림 고르기에 「도트 인형」 · 고르면 그 자리에 내 인형
    const fs = await q(async () => {
        const wait = (ms) => new Promise(r => setTimeout(r, ms)), el = document.querySelector('dialog .ss-panel');
        el.querySelector('[data-act="fullscreen"]')?.click(); await wait(500);
        const root = document.querySelector('.ss-hp') ?? document; const ph = root.querySelector('.ss-hp-photo'); if (!ph) return 'no photo';
        window.__autoPopup = null; ph.click(); await wait(400);
        const cell = [...document.querySelectorAll('.ss-hp-pick [data-choice="doll"]')].pop(); if (!cell) return 'no doll cell';
        const hasImg = !!cell.querySelector('img.px'); cell.click(); await wait(500); window.__autoPopup = 'ok';
        const img = document.querySelector('.ss-hp-photo.doll img'); return hasImg && img && img.getAttribute('src').startsWith('data:image/') ? 'ok' : `img ${!!img} cellimg ${hasImg}`;
    });
    check(fs === 'ok', `전체화면 프로필 그림에 「도트 인형」 (${fs})`);
    const errs = logs.filter(l => /error/i.test(l) && !/favicon|404|Failed to load resource/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 5).join('\n'));
} finally { await close(); }
