// 🎨 모양 고르기 창: 한 번만 뜨고 · 「예전 그대로」/닫기는 아무것도 안 바꾸고 · 고르면 미니홈피 + 모양이 맞춰진다
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ defaults: true });
try {
    const S = (f, a) => page.evaluate(f, a);
    await makeStatus(page);
    const snap = () => S(() => { const s = window.__st.extensionSettings.statussim; return JSON.stringify({ f: s.hompyFull, k: s.hpSkin, h: s.hpSkinHud, a: s.themeAsked }); });
    const s0 = await snap();
    check(JSON.parse(s0).a !== true && JSON.parse(s0).f !== true, 'default: not asked yet · old look');
    const ask = (why) => S(async (why) => { const m = await import('/ext/src/themeask.js'); window.__ta = m.askTheme(why).then(v => (window.__taR = v)); }, why);
    const clickCard = async (k) => { await page.waitForSelector(`.ss-themeask [data-choice="${k}"]`, { timeout: 5000 }); await page.click(`.ss-themeask [data-choice="${k}"]`); await sleep(400); };
    // 1) 예전 그대로
    await ask('update'); await page.waitForSelector('.ss-themeask');
    check(await S(() => document.querySelectorAll('.ss-themeask .ss-ta-card').length) === 4, 'popup shows 4 cards (keep + 3 skins)');
    check(await S(() => /2\.8/.test(document.querySelector('.ss-themeask .ss-hint').textContent)), 'update wording mentions 2.8');
    await clickCard('keep'); await S(() => window.__ta);
    const s1 = JSON.parse(await snap());
    check(s1.f !== true && s1.k === JSON.parse(s0).k && s1.h === JSON.parse(s0).h && s1.a === true, 'keep: nothing changed but themeAsked', JSON.stringify(s1));
    // 2) 한 번만
    await S(async () => { const m = await import('/ext/src/themeask.js'); window.__r2 = await m.askTheme('made'); });
    check(await S(() => window.__r2 === null && !document.querySelector('.ss-themeask')), 'second time: no popup');
    // 3) 다시 고르기 → 도트 · HUD 스위치 끔
    await ask('again'); await page.waitForSelector('.ss-themeask');
    await page.click('.ss-themeask [data-ta-hud]'); await clickCard('dot'); await S(() => window.__ta);
    const s3 = JSON.parse(await snap());
    check(s3.f === true && s3.k === 'dot' && s3.h === false, 'pick dot: hompy on · skin dot · HUD switch respected', JSON.stringify(s3));
    // 4) 폰 + HUD 켬
    await ask('again'); await page.waitForSelector('.ss-themeask');
    if (!(await S(() => document.querySelector('.ss-themeask [data-ta-hud]').checked))) await page.click('.ss-themeask [data-ta-hud]');
    await clickCard('phone'); await S(() => window.__ta);
    const s4 = JSON.parse(await snap());
    check(s4.k === 'phone' && s4.h === true, 'pick phone with HUD on', JSON.stringify(s4));
    // 5) 좁은 화면에서 창이 안 넘침
    await page.setViewportSize({ width: 390, height: 800 }); await ask('again'); await page.waitForSelector('.ss-themeask');
    const fit = await S(() => { const b = document.querySelector('.ss-themeask'); return b.scrollWidth <= b.clientWidth + 1 && [...b.querySelectorAll('.ss-ta-card')].every(c => c.getBoundingClientRect().right <= innerWidth + 1); });
    check(fit, '390px: cards fit'); if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
    await S(() => document.querySelector('dialog[open] .popup-button-ok')?.click()); await S(() => window.__ta);
    check(JSON.parse(await snap()).k === 'phone', 'closing keeps the last pick');
    check(!logs.length, 'no console errors', logs.join(' | ').slice(0, 300));
} finally { await close(); }
