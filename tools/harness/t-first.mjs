// 📘 첫 화면: 설정집이 없으면 설정집 하나만 (앱 0 · 주입 0 · 분류 0) → 만들면 🛍️ 앱 고르기 → 고른 앱만 깔림
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().mode = 'B'; st.settings().clsProfile = 'p-flash'; window.__sent = []; });
    await page.evaluate(() => window.__addUser('안녕')); await page.evaluate(() => window.__addAI('시작하는 이야기.')); await sleep(300);
    const hud = await page.evaluate(() => ({ hud: document.getElementById('ml-hud')?.textContent.trim(), mini: document.getElementById('ml-mini')?.textContent.trim(), chips: document.querySelectorAll('.ml-msg').length }));
    check(hud.hud === '📘 설정집 만들기' && /📘 설정집 만들기/.test(hud.mini ?? '') && hud.chips === 0, 'HUD · 미니바는 「📘 설정집 만들기」 한 줄 · 칩 0', JSON.stringify(hud));
    await page.evaluate(() => document.querySelector('#ml-hud [data-act="open"]').click()); await sleep(200);
    const v = await page.evaluate(() => ({
        apps: document.querySelectorAll('#ml-full .ml-app').length,
        w: document.querySelectorAll('#ml-full .ml-w').length,
        ai: !!document.querySelector('#ml-full [data-act="mk-ai"]'),
        self: !!document.querySelector('#ml-full [data-act="mk-self"]'),
        t: document.querySelector('#ml-full .ml-body')?.textContent ?? '',
    }));
    check(v.apps === 0 && v.w === 0 && v.ai && v.self && /설정집/.test(v.t), '홈엔 설정집 카드만 (로어북 · 카드로 채우기 · 직접 쓰기)', JSON.stringify(v));
    const inj = await page.evaluate(() => Object.values(window.__prompts ?? {}).map(x => x.value ?? '').join(''));
    check(inj === '' && await page.evaluate(() => (window.__sent ?? []).length) === 0, '본편 주입 0 · 분류 호출 0');
    // 직접 쓰기 → 🛍️ 앱 고르기 (장르 추천 미리 체크 · 시작 전엔 안 깔림)
    await page.evaluate(() => document.querySelector('#ml-full [data-act="mk-self"]').click()); await sleep(300);
    const s = await page.evaluate(() => ({ cbs: [...document.querySelectorAll('#ml-full .ml-setup-cb')].map(c => [c.dataset.mod, c.checked]), mods: Object.values(__ML__.getMeta().mods).filter(Boolean).length, hud: document.getElementById('ml-hud')?.textContent.trim() }));
    check(s.cbs.length >= 10 && s.cbs.some(([, c]) => c) && s.mods === 0 && s.hud === '🛍️ 쓸 앱 고르기', '만든 뒤: 🛍️ 앱 고르기 (추천 체크 · 시작 전 0개)', JSON.stringify(s));
    // 고른 앱만: 음악 · 수치만 남기고 시작
    await page.evaluate(() => { document.querySelectorAll('#ml-full .ml-setup-cb').forEach(c => { c.checked = ['music', 'stats'].includes(c.dataset.mod); }); document.querySelector('#ml-full [data-act="setup-start"]').click(); }); await sleep(300);
    const after = await page.evaluate(() => ({ mods: Object.entries(__ML__.getMeta().mods).filter(([, v]) => v).map(([k]) => k).sort().join(','), setup: __ML__.getMeta().setup, tab: document.querySelector('#ml-full .ml-body')?.dataset.tab }));
    check(after.mods === 'music,stats' && !after.setup && after.tab === 'book', '「시작」 → 고른 앱만 깔림 · 직접 쓰기면 설정집으로', JSON.stringify(after));
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200);
    const ids = await page.evaluate(() => [...document.querySelectorAll('#ml-full .ml-app')].map(a => a.dataset.v));
    check(ids.includes('now') && ids.includes('music') && !ids.includes('rel') && ids.includes('market'), '홈엔 고른 앱 + 시스템 앱', ids.join(','));
    // 이미 설정집이 있는 채팅 · 옛 미트볼에서 옮긴 채팅은 바로 홈
    await page.evaluate(async () => { await window.__changeChat('old'); const st = window.__st; st.chatMetadata.statussim = { base: { data: { rel: { user: [{ name: 'Leon', aff: 30 }] } } } }; });
    await page.evaluate(() => document.querySelector('[data-ml="migrate"]').click()); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200);
    check(await page.evaluate(() => document.querySelectorAll('#ml-full .ml-app').length > 5 && !document.querySelector('.ml-setup-cb')), '옛 미트볼을 옮긴 채팅은 바로 홈');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
