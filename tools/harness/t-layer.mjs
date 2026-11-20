// 🧷 body가 position:fixed 기준을 바꿔도(transform · filter · 높이 0) 「설정집 만들기」를 누르면 창이 보임
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 390, height: 844 });
try {
    // 설정집 없는 채팅 (첫 화면) + body를 망가뜨림: filter + 높이 0 (아이폰 · 일부 테마 · 다른 확장에서 생기는 모양)
    await page.evaluate(() => { document.body.style.filter = 'blur(0px)'; document.body.style.height = '0px'; document.body.style.overflow = 'visible'; });
    await page.evaluate(() => window.__addAI('안녕')); await sleep(300);
    const hud = await page.evaluate(() => !!document.querySelector('#ml-hud [data-act="open"], #ml-mini [data-act="open"]'));
    check(hud, 'HUD/미니바에 「설정집 만들기」');
    await page.evaluate(() => document.querySelector('#ml-hud [data-act="open"], #ml-mini [data-act="open"]').click()); await sleep(300);
    const r = await page.evaluate(() => { const el = document.getElementById('ml-full'); const b = el?.getBoundingClientRect(); return { h: b?.height ?? 0, w: b?.width ?? 0, parent: el?.parentElement?.tagName, first: !!el?.querySelector('[data-act="mk-self"]') }; });
    console.log(JSON.stringify(r));
    check(r.h > 600 && r.w > 300, '창이 화면을 덮음 (높이 0 아님)', JSON.stringify(r));
    check(r.first, '첫 화면: 로어북으로 채우기 · 직접 쓰기 버튼');
    // 미니바도 화면 안에
    const mb = await page.evaluate(() => { document.body.classList.remove('ml-open'); const b = document.getElementById('ml-mini')?.getBoundingClientRect(); return b ? b.top : null; });
    check(mb == null || mb > 100, '미니바가 화면 위로 잘리지 않음', String(mb));
    const errs = await page.evaluate(() => window.__errors);
    check(!errs.length && !logs.some(l => /pageerror/.test(l)), '오류 없음', [...errs, ...logs].join('\n'));
} finally { await close(); }
