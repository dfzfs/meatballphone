// 🎨 스타일로 고르기: 새로 설치한 사람의 첫 채팅에서 한 번 → 장르 → 맛 → 칸 · 플레이 방식 · 부가 기능 · 모양이 한 번에 (AI 0회)
//   · 다른 채팅에서는 다시 안 뜸 · 관리 › 쓸 기능 · 빈 화면에서 다시 열기 · 「그냥 가볍게」 · 「직접 고를래요」 · 업데이트로 받은 사람에겐 안 뜸
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ auto: true, style: true });
const Q = (fn, arg) => page.evaluate(fn, arg);
const meta = () => Q(async () => { const core = await import('/ext/src/core.js'); const m = core.getMeta(); const s = core.settings(); return { base: !!m?.base, style: m?.style ?? '', mode: m?.mode ?? '', simple: m?.simple === true, play: core.playOf(m), mods: core.MOD_IDS.filter(id => core.modOn(id)).sort().join(','), st: { stylePick: s.stylePick, relRace: s.relRace, pairAff: s.pairAff, groupChat: s.groupChat, mindMode: s.mindMode, hompyFull: s.hompyFull, hpSkin: s.hpSkin, themeAsked: s.themeAsked } }; });
const picker = () => Q(() => !!document.querySelector('dialog[open] .ss-stylepick'));
const click = (sel) => Q((sel) => { const b = document.querySelector(`dialog[open] .ss-stylepick ${sel}`); if (!b) return false; b.click(); return true; }, sel);
const sorted = (a) => [...a].sort().join(',');
try {
    await Q(() => { window.__n = 0; window.__ai = () => { window.__n++; return '{}'; }; });
    await sleep(2600);
    const m0 = await meta();
    check(m0.base && await picker(), '새로 설치 · 첫 채팅: 틀을 만든 뒤 「어떻게 놀고 싶어요?」가 뜸', JSON.stringify(m0));
    check(m0.st.stylePick === 'done', '띄운 순간 「물어봤음」으로 (다시 안 뜸)');
    check(await Q(() => document.querySelectorAll('dialog[open] .ss-stylepick [data-sp-g]').length) === 6 && await Q(() => !!document.querySelector('dialog[open] .ss-stylepick [data-choice="light"]') && !!document.querySelector('dialog[open] .ss-stylepick [data-choice="manual"]')), '장르 6개 + 「그냥 가볍게」 · 「직접 고를래요」');
    // 💕 연애 → 👑 다인 공략 · 단체방만 빼고 시작
    check(await click('[data-sp-g="romance"]'), '장르를 누르면');
    check(await Q(() => document.querySelectorAll('dialog[open] .ss-stylepick [data-sp-f]').length) === 4 && await Q(() => document.querySelector('dialog[open] .ss-stylepick [data-sp-f].on')?.dataset.spF === 'sweet'), '그 장르의 맛 4개 · 첫 맛이 골라져 있음');
    await click('[data-sp-f="routes"]'); await sleep(100);
    check(await Q(() => !!document.querySelector('dialog[open] .ss-stylepick [data-sp-off="mod:sns"]') && !!document.querySelector('dialog[open] .ss-stylepick [data-sp-off="flag:relRace"]')), '맛을 바꾸면 켜는 칸 · 같이 켜는 기능 목록이 바뀜');
    await Q(() => { const i = document.querySelector('dialog[open] .ss-stylepick [data-sp-off="flag:groupChat"]'); i.checked = false; i.dispatchEvent(new Event('change', { bubbles: true })); });
    await Q(() => { const i = document.querySelector('dialog[open] .ss-stylepick [data-sp-off="mod:sns"]'); i.checked = false; i.dispatchEvent(new Event('change', { bubbles: true })); });
    await click('[data-choice="go"]'); await sleep(1200);
    const m1 = await meta();
    check(!(await picker()), '시작을 누르면 창이 닫힘');
    check(m1.style === 'routes' && m1.mods === sorted(['profile', 'rel', 'calendar', 'contact', 'map', 'memo', 'gossip']), '칸: 다인 공략 묶음 − 뺀 SNS', m1.mods);
    check(m1.play.mode === 'multi', '플레이 방식: 다인', JSON.stringify(m1.play));
    check(m1.st.relRace === true && m1.st.pairAff === true && m1.st.mindMode === 'thought' && m1.st.groupChat !== true, '부가 기능: 루트 비교 · 인물끼리 호감 · 속마음 켬, 뺀 단체방은 그대로 꺼짐', JSON.stringify(m1.st));
    check(m1.st.hompyFull === true && m1.st.hpSkin === 'phone' && m1.st.themeAsked === true, '첫 번째엔 모양도 어울리게 (폰) · 모양 고르기 창은 다시 안 띄움', JSON.stringify(m1.st));
    check(await Q(() => window.__n) === 0, 'AI는 한 번도 안 부름');
    // 다른 채팅: 다시 안 뜸 (틀만 바로)
    await Q(async () => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); await window.__changeChat('c2'); }); await sleep(2200);
    check((await meta()).base && !(await picker()), '다른 채팅을 열면 틀만 생기고 창은 다시 안 뜸');
    // 관리 › 쓸 기능 맨 위 단추로 다시 → 🏡 생활 › 🌱 힐링 생활
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().mgTab = 'mods'; window.__SS_TEST__.api.app.openSheet('manage'); }); await sleep(500);
    check(await Q(() => !!document.querySelector('dialog .ss-panel [data-act="stylepick"]')), '관리 › 쓸 기능 맨 위에 「🎨 스타일로 고르기」');
    await Q(() => document.querySelector('dialog .ss-panel [data-act="stylepick"]').click()); await sleep(500);
    check(await picker(), '누르면 같은 창이 열림');
    await click('[data-sp-g="life"]'); await click('[data-sp-f="heal"]'); await sleep(100);
    check(await Q(() => !document.querySelector('dialog[open] .ss-stylepick [data-sp-look]')?.checked), '두 번째부터는 모양을 바꾸지 않는 게 기본');
    await click('[data-choice="go"]'); await sleep(1500);
    const m2 = await meta();
    check(m2.style === 'heal' && m2.mode === 'life' && ['home', 'shop', 'wallet', 'stats'].every(id => m2.mods.split(',').includes(id)), '생활 모드 · 본거지 · 상점까지 켜짐', JSON.stringify(m2));
    check(m2.st.hpSkin === 'phone', '모양은 그대로', m2.st.hpSkin);
    // 🎬 군상극 → 롤플로 돌아오며 생활 모드는 꺼짐 · 주인공 없음
    await Q(() => { window.__SS_TEST__.api.app.openStylePick?.({ why: 'again' }); }); await sleep(400);
    await click('[data-sp-g="director"]'); await click('[data-sp-f="ensemble"]'); await click('[data-choice="go"]'); await sleep(1500);
    const m3 = await meta();
    check(m3.play.mode === 'director' && m3.play.ensemble === true && m3.mode === 'rp', '군상극: 풀사칭 · 주인공 없음 · 생활 모드 풀림', JSON.stringify({ play: m3.play, mode: m3.mode }));
    // 🍙 그냥 가볍게 → 추천 6칸 · 심플
    await Q(() => { window.__SS_TEST__.api.app.openStylePick({ why: 'again' }); }); await sleep(400);
    await click('[data-choice="light"]'); await sleep(1000);
    const m4 = await meta();
    check(m4.simple && m4.mods === sorted(['profile', 'stats', 'wallet', 'rel', 'map', 'calendar']), '그냥 가볍게: 추천 6칸 · 심플 화면', JSON.stringify(m4));
    // 🛠 직접 고를래요 → 관리 › 쓸 기능
    await Q(async () => { (await import('/ext/src/simple.js')).startSimple(false); document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.__SS_TEST__.api.app.openStylePick({ why: 'again' }); }); await sleep(400);
    await click('[data-choice="manual"]'); await sleep(800);
    check(await Q(async () => (await import('/ext/src/core.js')).settings().mgTab === 'mods' && !!document.querySelector('dialog[open] .ss-panel .ss-mg[data-mg="mods"]')), '직접 고를래요: 관리 › 쓸 기능 전체 목록이 열림');
    // 빈 화면 단추: 상태창이 없는 채팅에서 스타일을 고르면 틀부터 만들고 맞춤
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().autoStart = false; core.saveSettings(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); await window.__changeChat('c3'); window.__SS_TEST__.api.app.openSheet('home'); }); await sleep(800);
    check(await Q(() => !!document.querySelector('dialog .ss-empty .ss-btn.pri[data-act="stylepick"]')), '빈 화면의 큰 단추 = 스타일로 고르기');
    await Q(() => document.querySelector('dialog .ss-empty [data-act="stylepick"]').click()); await sleep(500);
    await click('[data-sp-g="adventure"]'); await click('[data-sp-f="rpg"]'); await click('[data-choice="go"]'); await sleep(1500);
    const m5 = await meta();
    check(m5.base && m5.style === 'rpg' && ['dice', 'shop', 'quest', 'ach'].every(id => m5.mods.split(',').includes(id)), '상태창이 없던 채팅: 틀을 만들고 RPG 칸으로', JSON.stringify(m5));
    check(await Q(() => window.__n) === 0, '여기까지 AI 0회');
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
// 첫 창을 그냥 닫으면: 틀(추천 6칸)은 그대로 · 다시 안 뜸
{
    const o = await open({ auto: true, style: true });
    try {
        await sleep(2600);
        check(await o.page.evaluate(() => !!document.querySelector('dialog[open] .ss-stylepick')), '(닫기) 첫 채팅에서 뜸');
        await o.page.evaluate(() => document.querySelector('dialog[open] .ss-stylepick').closest('dialog').querySelector('.popup-button-ok').click()); await sleep(600);
        const r = await o.page.evaluate(async () => { const core = await import('/ext/src/core.js'); return { base: !!core.getMeta()?.base, n: core.MOD_IDS.filter(id => core.modOn(id)).length, ask: core.settings().stylePick }; });
        check(r.base && r.n === 6 && r.ask === 'done', '「나중에 고를게요」: 추천 6칸 틀 그대로 · 다시 안 뜸', JSON.stringify(r));
    } finally { await o.close(); }
}
// 업데이트로 받은 사람: 저절로 안 뜸
{
    const o = await open({ auto: true, oldset: true, style: true });
    try {
        await sleep(2600);
        const r = await o.page.evaluate(async () => ({ open: !!document.querySelector('dialog[open] .ss-stylepick'), ask: (await import('/ext/src/core.js')).settings().stylePick }));
        check(!r.open && r.ask !== 'ask', '업데이트로 받은 사람에겐 저절로 안 뜸', JSON.stringify(r));
    } finally { await o.close(); }
}
