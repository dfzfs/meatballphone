// ✏️ 홈 편집: 꾹 누르기 → 편집 · 위젯 끌어서 순서 · ✕ 숨기기 · 앱을 독으로 · 📱 상태바 · 🖼 배경화면
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
const center = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 30) }; }, sel);
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(300);
    const sb = await page.evaluate(() => ({ t: document.querySelector('.ml-sb-time')?.textContent, carrier: document.querySelector('.ml-sb-r b')?.textContent, island: !!document.querySelector('.ml-island'), title: /미트볼 라이트/.test(document.querySelector('.ml-top')?.textContent ?? '') }));
    check(sb.t && sb.carrier === '미트볼' && sb.island && !sb.title, '상태바: 시각 · 섬 · 통신사 「미트볼」 · 제목 줄 없음', JSON.stringify(sb));
    // 꾹 누르기 (앱 아이콘)
    const a = await center('.ml-apps .ml-app');
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await sleep(700); await page.mouse.up(); await sleep(300);
    check(await page.evaluate(() => document.getElementById('ml-full').classList.contains('editing') && !!document.querySelector('.ml-editbar')), '꾹 누르면 편집 모드');
    check(await page.evaluate(() => document.querySelector('.ml-body').dataset.tab === 'home'), '꾹 누른 앱은 열리지 않음');
    // 위젯 끌기: 수치 → 맨 위(시계 위)
    const order0 = await page.evaluate(() => [...document.querySelectorAll('.ml-wslot')].map(x => x.dataset.w));
    await page.evaluate(() => document.querySelector('.ml-body').scrollTo(0, 0)); await sleep(100);
    const pos = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 25 }; }, sel);
    await page.evaluate(() => { document.querySelector('.ml-wslot[data-w="stats"]').scrollIntoView({ block: 'end' }); }); await sleep(100);
    const from = await pos('.ml-wslot[data-w="stats"]'), to = await pos('.ml-wslot[data-w="hero"]');
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(from.x, from.y - 20, { steps: 3 });
    await page.mouse.move(to.x, to.y - 10, { steps: 12 }); await page.mouse.up(); await sleep(400);
    const order1 = await page.evaluate(async () => (await import('/ext/src/base/st.js')).settings().home.order);
    check(order1.indexOf('stats') < order1.indexOf('hero') && order0.indexOf('stats') > order0.indexOf('hero'), '위젯을 끌어서 순서 바꾸기 (저장됨)', order1.join(','));
    // ✕ 숨기기 → 완료 → 안 보임
    await page.evaluate(() => document.querySelector('.ml-wslot[data-w="dice"] .ml-wx')?.click()); await sleep(250);
    await page.evaluate(() => document.querySelector('[data-act="home-done"]').click()); await sleep(250);
    check(await page.evaluate(() => !document.querySelector('.ml-wslot[data-w="dice"]') && !document.getElementById('ml-full').classList.contains('editing')), '✕로 숨긴 위젯은 완료 뒤 안 보임');
    // 독: 기본 4개
    check(await page.evaluate(() => document.querySelectorAll('.ml-dock .ml-app').length) === 4, '독에 앱 4개');
    // 배경화면 · 아이콘 톤
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().look.wall = 'night'; (await import('/ext/src/ui/frame.js')).redraw(); }); await sleep(200);
    check(await page.evaluate(() => { const el = document.getElementById('ml-full'); return el.classList.contains('has-wall') && el.classList.contains('dark-wall') && /gradient/.test(el.style.getPropertyValue('--ml-wall')); }), '배경화면(밤): 그라데이션 · 어두운 배경이면 상태바 글자 흰색');
    // 앱 화면으로 가면 편집 · 상태바는 홈에만
    await page.evaluate(() => __ML__.app.openSheet('now')); await sleep(200);
    check(await page.evaluate(() => !document.querySelector('.ml-status') && !!document.querySelector('.ml-top [data-act="report"]')), '앱 화면은 보통 위쪽 줄 (📋 그대로)');
    check(!logs.some((l) => /error/i.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
