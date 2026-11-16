// Shared helpers for harness scenarios (Playwright + fake ST)
import { chromium } from './pw.mjs';
import { serve } from './server.mjs';

// bind: true → 연락 · 피드를 「채팅에 붙이기」(기록장에 쌓는 예전 방식)로 — 기록 · 되감기 · 되돌리기를 보는 시나리오용 (기본은 📦 따로 보관)
export async function open({ ext2 = false, width = 1300, height = 900, bind = false, defaults = false } = {}) {
    const srv = await serve(0);
    const port = srv.address().port;
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
    const page = await browser.newPage({ viewport: { width, height } });
    const logs = [];
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', e => logs.push(`pageerror: ${e.stack || e}`));
    await page.goto(`http://127.0.0.1:${port}/${ext2 ? '?ext2=1' : ''}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
    // v2.8: 미니홈피 · HUD 같은 모양은 기본 끔으로 나간다 → 시나리오들은 켠 상태를 본다 (끈 상태 = 예전 화면은 defaults: true로)
    if (!defaults) await page.evaluate(async () => { const core = await import('/ext/src/core.js'); Object.assign(core.settings(), { hompyFull: true, hpSkinHud: true }); core.saveSettings(); try { (await import('/ext/src/hompy.js')).applyRetro(); } catch { /* 옛 판 */ } });
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
