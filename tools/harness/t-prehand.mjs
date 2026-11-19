// ✋ AI 답이 아직 없을 때 고치기(다른 곡 · AI로 수정 · act): 시작 상태에 붙고 · 첫 답이 오면 그 위에서 이어짐
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => { const c = SillyTavern.getContext(); c.chat.length = 0; window.__renderAll?.(); __ML__.app.refresh(true); }); await sleep(200);
    const ok = await page.evaluate(async () => (await import('/ext/src/ui/tools.js')).handLines(['bgm: 사건의 지평선 - 윤하 | 벅참 | 여운', 'cash: +7 | 용돈'], '🔄 다른 곡'));
    await sleep(200);
    const S = await page.evaluate(async () => { const r = (await import('/ext/src/rules/engine.js')).fold(true); return { bgm: r.S.bgm?.title, cash: r.S.cash }; });
    check(ok && S.bgm === '사건의 지평선' && S.cash === 57, '답이 없어도 고친 게 시작 상태에 들어감', JSON.stringify(S));
    check(!(await page.evaluate(() => (window.__toasts ?? []).some(t => /답이 하나라도/.test(t.msg)) || /답이 하나라도/.test(document.body.textContent))), '「답이 하나라도 있어야」 안 뜸');
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\ncash: -2 | 커피\n</meatball>')); await sleep(400);
    const S2 = await page.evaluate(async () => (await import('/ext/src/rules/engine.js')).fold(true).S.cash);
    check(S2 === 55, '첫 답이 오면 그 위에서 이어짐', String(S2));
    check(!logs.some((l) => /error/i.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
