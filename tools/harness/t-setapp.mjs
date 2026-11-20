// ⚙️ 설정 앱 · 😌 눈 감기 하나로
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 390, height: 844 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('hi')); await page.evaluate(() => window.__addAI('그냥 걸었다.')); await sleep(300); // A 모드 · 태그 없음
    await page.evaluate(() => __ML__.app.openSheet('set')); await sleep(250);
    const t = await page.evaluate(() => document.getElementById('ml-full').textContent);
    check(/마지막 답 칩 점검/.test(t) && /자가 진단/.test(t) && /모델 · 연결/.test(t) && /프롬프트/.test(t) && /부하/.test(t), '설정 앱: 칩 점검 · 진단 · 모델 · 프롬프트 · 부하');
    check(/meatball> 줄을 안 썼어요|분류되지 않았어요|A로 돌아요/.test(t), '태그 없는 답 → 칩이 없는 이유가 보임');
    // 덧붙일 지시 → 본편 귀띔 끝에
    await page.evaluate(() => { const ta = document.querySelector('#ml-full textarea[data-mlmeta="injExtra"]'); ta.value = '날짜를 꼭 언급해'; ta.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(200);
    const hint = await page.evaluate(() => { __ML__.inject(); return window.__prompts.meatlite_hint?.value ?? ''; });
    check(/날짜를 꼭 언급해/.test(hint), '✍ 덧붙인 지시가 본편에', hint);
    // 부하 재기 · 다시 그리기 · 멈춤
    await page.evaluate(() => document.querySelector('#ml-full [data-act="set-perf"]').click()); await sleep(300);
    check(await page.evaluate(() => /처음부터 다시 계산/.test(document.getElementById('ml-full').textContent)), '🏎 지금 재기');
    await page.evaluate(() => document.querySelector('#ml-full [data-act="set-pause"]').click()); await sleep(200);
    check(await page.evaluate(() => !!__ML__.getMeta().paused), '⏸ 멈춤');
    await page.evaluate(() => document.querySelector('#ml-full [data-act="set-pause"]').click()); await sleep(200);
    // 😌 눈 감기: 소지품 → 고르기 시트 4개 · 🙈 버튼은 없어짐
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(200);
    const tb = await page.evaluate(() => ({ hide: !!document.querySelector('.ml-tools2 [data-act="t-hide"]'), eye: !!document.querySelector('.ml-tools2 [data-act="t-eye"]') }));
    check(!tb.hide && tb.eye, '도구줄: 🙈 숨기기 버튼 없음 · 😌 하나');
    await page.evaluate(() => document.querySelector('.ml-tools2 [data-act="t-eye"]').click()); await sleep(200);
    check(await page.evaluate(() => document.querySelectorAll('.ml-bs [data-act="eye-set"]').length) === 4, '고르기 4개 (평소 · 결과만 숨기기 · 다음 1번 · 계속)');
    await page.evaluate(() => document.querySelector('.ml-bs [data-act="eye-set"][data-v$="|on"]').click()); await sleep(200);
    check(await page.evaluate(() => __ML__.getMeta().eyes?.wallet?.mode === 'on'), '😴 계속 쉬기');
    // 제어 센터에 ⚙️
    const errs = await page.evaluate(() => window.__errors);
    check(!errs.length && !logs.some(l => /pageerror/.test(l)), '오류 없음', [...errs, ...logs].join('\n'));
} finally { await close(); }
