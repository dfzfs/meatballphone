// 선택지 확장이 쓰는 통로: state(attrs · date) · diceParts · preview 캐시 · 채팅이 바뀌면 다시 계산
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\nstatus: 감기 | 1d\n</meatball>')); await sleep(300);
    const r = await page.evaluate(() => { const M = globalThis.MeatballLite; const s = M.state(); return { attrs: s.attrs, date: s.date, parts: M.diceParts('힘'), p: M.preview('빵 하나 주세요') }; });
    console.log(JSON.stringify(r));
    check(r.attrs && '힘' in r.attrs && /월 .*일/.test(r.date), 'state: attrs · 날짜 글');
    check(r.parts.some(x => x.why === '감기'), 'diceParts: 상태 딱지 보정');
    check(/−3/.test(r.p?.text ?? ''), 'preview: 가게 값');
    const t = await page.evaluate(() => { const M = globalThis.MeatballLite; const a = performance.now(); for (let i = 0; i < 12; i++) M.preview(`선택지 ${i}`); return performance.now() - a; });
    check(t < 30, `preview 12번 ${t.toFixed(1)}ms (캐시)`);
    await page.evaluate(() => window.__addAI('…\n<meatball>\ncash: +10\n</meatball>')); await sleep(300);
    check(await page.evaluate(() => globalThis.MeatballLite.state().cash) === 60, '새 답이 오면 다시 계산');
    check(!logs.length, '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
