// 🔌 이 채팅에서만 끄기: HUD · 칩 · 본편 주입 · 분류 0 · 통로 ready=false · 다시 켜면 이어짐 · 글에 흔적 없음
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\n</meatball>')); await sleep(400);
    check(await page.evaluate(() => !!document.getElementById('ml-hud') && globalThis.MeatballPhone.ready()), '켜져 있을 때 HUD · 통로 ready');
    // ⏸ 메뉴 → 이 채팅에서 끄기
    await page.evaluate(() => __ML__.app.openSheet('now')); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="pause"]').click()); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="p-off"]').click()); await sleep(400);
    const off = await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); return { off: !!st.getMeta().off, hud: !!document.getElementById('ml-hud'), full: !!document.getElementById('ml-full'), chips: document.querySelectorAll('.ml-msg').length, ready: globalThis.MeatballPhone.ready() }; });
    check(off.off && !off.hud && !off.full && off.chips === 0 && off.ready === false, '끄면: HUD · 폰 · 칩 없음 · 통로 ready=false', JSON.stringify(off));
    // 끈 채로 답: 주입 0 · 셈 안 함 · 태그는 글에서 빠짐
    const inj = await page.evaluate(async () => { const c = SillyTavern.getContext(); await c.eventSource.emit(c.event_types.GENERATION_AFTER_COMMANDS, 'normal', {}, false); const v = Object.values(window.__prompts ?? {}).map(x => x?.value ?? x).join(''); return v.length; });
    check(inj === 0, '끈 채팅: 본편 주입 0', String(inj));
    await page.evaluate(() => window.__addUser('또 가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 집\n</meatball>')); await sleep(400);
    const after = await page.evaluate(async () => { const c = SillyTavern.getContext(), m = c.chat.at(-1); return { tag: /<meatball>/.test(m.mes), hud: !!document.getElementById('ml-hud') }; });
    check(!after.tag && !after.hud, '끈 채로 온 답: 글에 태그 흔적 없음 · HUD 안 생김', JSON.stringify(after));
    // 다시 켜기 (확장 설정 칸)
    await page.evaluate(() => { const cb = document.querySelector('[data-ml-chatoff]'); cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(400);
    check(await page.evaluate(() => !!document.getElementById('ml-hud') && globalThis.MeatballPhone.ready()), '다시 켜면 HUD · 통로 돌아옴');
    check(!logs.some((l) => /error/i.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
