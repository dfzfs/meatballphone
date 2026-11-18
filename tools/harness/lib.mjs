// Shared helpers for harness scenarios (Playwright + fake ST)
import { chromium } from './pw.mjs';
import { serve } from './server.mjs';

// bind: true → 연락 · 피드를 「채팅에 붙이기」(기록장에 쌓는 예전 방식)로 — 기록 · 되감기 · 되돌리기를 보는 시나리오용 (기본은 📦 따로 보관)
// oldset: true → 예전 판의 설정이 이미 있는 채로 시작 (업데이트로 받은 사람)
export async function open({ ext2 = false, width = 1300, height = 900, bind = false, defaults = false, auto = false, oldset = false, style = false, tidy = false, quiet = false, preset = null } = {}) {
    const srv = await serve(0);
    const port = srv.address().port;
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
    const page = await browser.newPage({ viewport: { width, height } });
    const logs = [];
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', e => logs.push(`pageerror: ${e.stack || e}`));
    const q = [ext2 ? `ext2=1${typeof ext2 === 'string' ? `&ext2body=${encodeURIComponent(ext2)}` : ''}` : '', oldset ? 'oldset=1' : '', preset ? `preset=${encodeURIComponent(JSON.stringify(preset))}` : ''].filter(Boolean).join('&');
    await page.goto(`http://127.0.0.1:${port}/${q ? `?${q}` : ''}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
    // 🧆 시나리오는 「상태창 없음」에서 시작한다 — 바로 시작(autostart.js)은 auto: true 일 때만 (확장이 켜지고 1.5초 뒤에 도는 것보다 먼저 끈다)
    // 🎨 새로 설치한 사람의 첫 채팅에 뜨는 「스타일로 고르기」 창은 style: true 일 때만 (다른 시나리오의 창 세기를 흐트리지 않게)
    if (!style) await page.evaluate(async () => { const core = await import('/ext/src/core.js'); if (core.settings().stylePick === 'ask') { core.settings().stylePick = 'done'; core.saveSettings(); } });
    // 🔕 새로 설치하면 「조용히」가 켜져 오지만, 시나리오들은 알림이 뜨는 화면을 본다 → quiet: true 일 때만 그대로 둔다
    if (!quiet) await page.evaluate(async () => { const core = await import('/ext/src/core.js'); if (core.settings().quiet === true) { Object.assign(core.settings(), { quiet: false, featureTips: true, actionTips: true }); core.saveSettings(); } });
    // 🧹 업데이트로 받은 사람에게 한 번 뜨는 「기능 정리」 창도 tidy: true 일 때만
    if (!tidy) await page.evaluate(async () => { const core = await import('/ext/src/core.js'); if (core.settings().tidyAsked !== true) { core.settings().tidyAsked = true; core.saveSettings(); } });
    if (!auto) await page.evaluate(async () => { const core = await import('/ext/src/core.js'); core.settings().autoStart = false; core.saveSettings(); });
    // v2.8: 미니홈피 · HUD 같은 모양은 기본 끔으로 나간다 → 시나리오들은 켠 상태를 본다 (끈 상태 = 예전 화면은 defaults: true로)
    // v2.9: 점집 셋 · 새 지도도 기본 끔 → 같은 방식 (끈 상태는 t-v29off)
    if (!defaults) await page.evaluate(async () => { const core = await import('/ext/src/core.js'); Object.assign(core.settings(), { hompyFull: true, hpSkinHud: true, fortuneTarot: true, fortuneOrb: true, fortuneShaman: true, mapMetro: true }); core.saveSettings(); try { (await import('/ext/src/hompy.js')).applyRetro(); } catch { /* 옛 판 */ } });
    if (bind) await page.evaluate(async () => { const core = await import('/ext/src/core.js'); Object.assign(core.settings(), { bindContact: true, bindNews: true, bindGossip: true, bindBoard: true, bindSns: true }); core.saveSettings(); });
    const close = async () => { await browser.close(); srv.close(); };
    return { page, logs, close, port };
}

// Build a template-only status window (no AI) with the given modules on
export async function makeStatus(page, mods = ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'home', 'memo']) {
    await page.evaluate(async (mods) => {
        const { skeleton, skeletonCore } = await import('/ext/src/skeleton.js');
        const { setBase } = await import('/ext/src/shell.js');
        const { MOD_IDS } = await import('/ext/src/core.js');
        const data = {};
        for (const id of mods) data[id] = skeleton(id, 'fantasy');
        await setBase({ core: skeletonCore('fantasy'), data }, Object.fromEntries(MOD_IDS.map(id => [id, mods.includes(id)])), 'normal');
    }, mods);
}

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export function check(cond, label, extra = '') {
    if (cond) console.log(`  ✔ ${label}`);
    else { console.log(`  ✘ ${label} ${extra}`); process.exitCode = 1; }
}
