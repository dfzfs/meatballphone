// 😌 눈 감기 (다음 1번 · 계속) · ⏸ 메뉴 · 🎌 공휴일
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const m = st.getMeta(); m.mods.music = true; m.mods.quote = true; st.saveMeta(); st.settings().mode = 'A'; });
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\n</meatball>')); await sleep(300);
    // 메뉴
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(150);
    // 홈: 상태바의 섬 → 제어 센터 → 😌 눈 감기
    await page.evaluate(() => document.querySelector('.ml-island').click()); await sleep(200);
    check(await page.evaluate(() => /제어 센터/.test(document.querySelector('.ml-bs')?.textContent ?? '') && !!document.querySelector('.ml-bs [data-act="report"]')), '섬을 누르면 제어 센터');
    await page.evaluate(() => document.querySelector('.ml-bs [data-act="pause"]').click()); await sleep(200);
    const menu = await page.evaluate(() => ({ t: document.querySelector('.ml-bs')?.textContent ?? '', eyes: document.querySelectorAll('.ml-bs [data-act="eye"]').length }));
    check(/전체 멈춤/.test(menu.t) && /건너뛰기/.test(menu.t) && /눈 감기/.test(menu.t) && menu.eyes >= 3 * 5, '⏸ 메뉴: 전체 멈춤 · 건너뛰기 · 깔린 앱마다 눈 감기', JSON.stringify(menu.eyes));
    // 음악 다음 1번 감기
    await page.evaluate(() => document.querySelector('.ml-bs [data-act="eye"][data-v="music|once"]').click()); await sleep(200);
    const rule1 = await page.evaluate(async () => { const { ruleText } = await import('/ext/src/rules/inject.js'); return ruleText(__ML__.fold().book); });
    check(!/bgm:/.test(rule1) && /quote:/.test(rule1), '감은 앱(음악)만 본편 「적는 법」에서 빠짐');
    await page.evaluate(() => { document.querySelector('.ml-bs')?.remove(); }); await sleep(100);
    check(await page.evaluate(() => /😌 1/.test(document.querySelector('.ml-island').textContent)), '섬에 😌 1 표시');
    // 다음 답에 bgm을 적어도 버림
    await page.evaluate(() => window.__addUser('음악')); await page.evaluate(() => window.__addAI('…\n<meatball>\nbgm: 봄날 - BTS | 그리움 | -\nloc: 카페\n</meatball>')); await sleep(400);
    const r = await page.evaluate(() => ({ bgm: __ML__.fold().S.bgm?.title ?? null, loc: __ML__.fold().S.loc }));
    check(r.bgm === null && r.loc === '카페', '감긴 답: 음악 줄은 버리고 다른 앱은 그대로', JSON.stringify(r));
    // 그다음 답에는 다시 뜸
    const rule2 = await page.evaluate(async () => { const { ruleText } = await import('/ext/src/rules/inject.js'); return ruleText(__ML__.fold().book); });
    check(/bgm:/.test(rule2), '다음 1번이 지나면 저절로 뜸');
    // 계속 감기 → 분류 목록에서도 빠짐
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.setEyes('quote', 'on'); });
    const keys = await page.evaluate(async () => { const c = await import('/ext/src/rules/classify.js'); const st = await import('/ext/src/base/st.js'); return [...c.ALLOW(st.nextAiNo())]; });
    check(!keys.includes('quote') && keys.includes('loc'), '「계속」: 분류 모델 목록에서도 빠짐', keys.join(','));
    // 공휴일: 2026-02-17 설날 · 3/1 삼일절 · 장날 같은 무작위 사건 없음
    const hol = await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const e = await import('/ext/src/rules/engine.js'); const b = st.getMeta().book; b.world.start = { ...b.world.start, y: 2026, m: 2, d: 1 }; const L = []; for (let d = 0; d < 40; d++) { const ev = e.worldEvent(d); if (ev) L.push(`${d}:${ev.name}`); } return L; });
    check(hol.includes('16:설날') && hol.includes('28:삼일절') && !hol.some(x => /장날|축제|공사/.test(x)), '공휴일만 (설날 · 삼일절)', hol.join(' '));
    check(!logs.some((l) => /error/i.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
